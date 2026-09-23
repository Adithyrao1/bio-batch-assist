import json
import jwt
import requests
from jwt.algorithms import RSAAlgorithm
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

User = get_user_model()

# In-memory JWKS cache — cleared on server restart
_JWKS_CACHE = None


def _get_jwks() -> dict:
    """Fetch and cache Microsoft's public keys for JWT signature verification."""
    global _JWKS_CACHE
    if _JWKS_CACHE is None:
        resp = requests.get(settings.ENTRA_JWKS_URI, timeout=10)
        resp.raise_for_status()
        _JWKS_CACHE = resp.json()
    return _JWKS_CACHE


def _get_public_key(token: str):
    """Find the RSA public key matching the token's 'kid' header claim."""
    kid = jwt.get_unverified_header(token).get('kid')
    for key_data in _get_jwks().get('keys', []):
        if key_data.get('kid') == kid:
            return RSAAlgorithm.from_jwk(json.dumps(key_data))
    raise AuthenticationFailed("No matching public key found for this token.")


def validate_entra_token(token: str) -> dict:
    """
    Standalone validator used by AzureLoginView.

    MSAL `loginPopup` returns an **ID token** whose claims are:
        aud  → client_id  (e.g. "941db088-...")
        iss  → https://login.microsoftonline.com/<tenant>/v2.0

    We accept both the v2.0 issuer (MSAL default) and the legacy
    v1.0 STS issuer for maximum compatibility.

    Returns the decoded payload dict on success, raises AuthenticationFailed on failure.
    """
    client_id = settings.ENTRA_CLIENT_ID
    tenant_id = settings.ENTRA_TENANT_ID

    valid_issuers = [
        f"https://login.microsoftonline.com/{tenant_id}/v2.0",
        f"https://sts.windows.net/{tenant_id}/",
    ]
    # Also accept api://<client_id> audience for access tokens
    valid_audiences = [client_id, f"api://{client_id}"]

    last_error = None
    for audience in valid_audiences:
        for issuer in valid_issuers:
            try:
                payload = jwt.decode(
                    token,
                    _get_public_key(token),
                    algorithms=['RS256'],
                    audience=audience,
                    issuer=issuer,
                )
                return payload
            except jwt.ExpiredSignatureError:
                raise AuthenticationFailed("Token has expired.")
            except (jwt.InvalidAudienceError, jwt.InvalidIssuerError) as e:
                last_error = e
                continue
            except jwt.PyJWTError as e:
                raise AuthenticationFailed(f"Token validation failed: {e}")

    raise AuthenticationFailed(
        f"Token audience/issuer mismatch. Last error: {last_error}"
    )


def _get_or_create_entra_user(payload: dict) -> User:
    """
    Auto-provision a Django User on first Entra login.
    On subsequent logins, syncs role and email if changed.

    Token claims used:
        oid   — Entra Object ID (stable, immutable — used as username)
        preferred_username / upn — email address
        name  — display name (split into first/last)
        roles — list of App Role assignments
    """
    oid   = payload.get('oid')
    email = (payload.get('preferred_username') or payload.get('upn') or '').lower()
    name  = payload.get('name', '').split(' ', 1)
    roles = payload.get('roles', [])

    # Map Entra App Role → local role field
    role = 'viewer'
    if 'Admin' in roles:
        role = 'admin'
    elif 'Technician' in roles:
        role = 'technician'

    user, created = User.objects.get_or_create(
        username=oid,      # Entra OID as the immutable Django username
        defaults={
            'email':      email,
            'first_name': name[0],
            'last_name':  name[1] if len(name) > 1 else '',
            'role':       role,
            'status':     'active',
        }
    )

    if not created:
        changed = []
        if user.role != role:
            user.role = role
            changed.append('role')
        if email and user.email != email:
            user.email = email
            changed.append('email')
        if changed:
            user.save(update_fields=changed)

    return user


class EntraIDAuthentication(BaseAuthentication):
    """
    DRF authentication class — validates a Microsoft Entra ID JWT.

    On success  → returns (user, token_payload)
    On failure  → raises AuthenticationFailed
    No token    → returns None (lets other authenticators try)
    """

    def authenticate(self, request):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return None

        token = auth_header.split(' ', 1)[1].strip()

        try:
            payload = validate_entra_token(token)
        except AuthenticationFailed:
            raise
        except Exception as e:
            raise AuthenticationFailed(f"Authentication error: {e}")

        return (_get_or_create_entra_user(payload), payload)
