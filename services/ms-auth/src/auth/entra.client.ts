export interface IdTokenClaims {
  sub: string;
  email: string | undefined;
  name: string | undefined;
  preferred_username: string | undefined;
}

interface EntraTokenResponse {
  access_token: string;
  refresh_token: string;
  id_token: string;
  expires_in: number;
}

interface RefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface EntraConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function createEntraClient(config: EntraConfig) {
  return {
    buildAuthUrl(params: { state: string; codeChallenge: string }): string {
      const url = new URL(
        `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize`,
      );
      url.searchParams.set('client_id', config.clientId);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('redirect_uri', config.redirectUri);
      url.searchParams.set('response_mode', 'query');
      url.searchParams.set('scope', 'openid profile email offline_access');
      url.searchParams.set('state', params.state);
      url.searchParams.set('code_challenge', params.codeChallenge);
      url.searchParams.set('code_challenge_method', 'S256');
      return url.toString();
    },

    async exchangeCode(code: string, verifier: string): Promise<EntraTokenResponse> {
      const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;
      const body = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.redirectUri,
        code_verifier: verifier,
      });
      const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      if (!res.ok) {
        throw new Error(`entra-exchange-failed: ${res.status}`);
      }
      return res.json() as Promise<EntraTokenResponse>;
    },

    async refreshAccessToken(refreshToken: string): Promise<RefreshResponse> {
      const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;
      const body = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      });
      const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      if (!res.ok) {
        throw new Error(`entra-exchange-failed: ${res.status}`);
      }
      return res.json() as Promise<RefreshResponse>;
    },

    decodeIdTokenClaims(idToken: string): IdTokenClaims {
      const parts = idToken.split('.');
      if (parts.length !== 3 || !parts[1]) throw new Error('invalid id_token format');
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf-8'),
      ) as Record<string, unknown>;
      return {
        sub: String(payload['sub'] ?? ''),
        email: typeof payload['email'] === 'string' ? payload['email'] : undefined,
        name: typeof payload['name'] === 'string' ? payload['name'] : undefined,
        preferred_username:
          typeof payload['preferred_username'] === 'string'
            ? payload['preferred_username']
            : undefined,
      };
    },
  };
}

export type EntraClient = ReturnType<typeof createEntraClient>;
