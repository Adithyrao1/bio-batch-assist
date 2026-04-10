"""Patch core/urls.py to add new auth routes."""
import sys

URLS_PATH = 'core/urls.py'

NEW_PATHS = (
    "    path('auth/complete-signup/', views.CompleteSignupView.as_view(), name='complete_signup'),\n"
    "    path('auth/forgot-password/request-otp/', views.ForgotPasswordRequestView.as_view(), name='forgot_password_request'),\n"
    "    path('auth/forgot-password/reset/', views.ForgotPasswordResetView.as_view(), name='forgot_password_reset'),\n"
    "]\n"
)

OLD_TAIL = "    path('auth/settings/verify-otp/', views.AuthSettingsOTPVerifyView.as_view(), name='settings_verify_otp'),\n]\n"
NEW_TAIL = (
    "    path('auth/settings/verify-otp/', views.AuthSettingsOTPVerifyView.as_view(), name='settings_verify_otp'),\n"
    + NEW_PATHS
)

with open(URLS_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

if OLD_TAIL not in content:
    print("ERROR: Could not find target text in urls.py", file=sys.stderr)
    print("End of file:", repr(content[-200:]))
    sys.exit(1)

patched = content.replace(OLD_TAIL, NEW_TAIL)

with open(URLS_PATH, 'w', encoding='utf-8') as f:
    f.write(patched)

print("urls.py patched successfully.")
