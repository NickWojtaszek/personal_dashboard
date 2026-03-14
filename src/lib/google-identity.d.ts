/** Minimal type declarations for Google Identity Services (GIS) OAuth2 */
declare namespace google.accounts.oauth2 {
  interface TokenClient {
    requestAccessToken(config?: { prompt?: string }): void;
  }

  interface TokenResponse {
    access_token: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
    scope: string;
    token_type: string;
  }

  interface TokenClientConfig {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
    error_callback?: (error: { type: string; message: string }) => void;
  }

  function initTokenClient(config: TokenClientConfig): TokenClient;
  function revoke(token: string, callback: () => void): void;
}
