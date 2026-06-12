import { Configuration, PopupRequest } from "@azure/msal-browser";

/**
 * MSAL configuration for Azure Entra ID authentication.
 * Credentials are injected at build time from .env via Vite.
 */
export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID as string,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID as string}`,
    redirectUri: "http://localhost:8080/",
    postLogoutRedirectUri: "http://localhost:8080/",
  },
  cache: {
    // Use localStorage to ensure the popup window and main window share the exact same cache state
    cacheLocation: "localStorage",
  },
};

/**
 * Scopes requested during login.
 * openid + profile + email gives us the ID token with name/email claims.
 */
export const loginRequest: PopupRequest = {
  scopes: ["openid", "profile", "email"],
};
