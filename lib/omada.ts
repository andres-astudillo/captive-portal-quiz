/**
 * Omada Open API client — OAuth client_credentials + External Portal authorization.
 *
 * Required env vars (set them in Vercel → Project → Settings → Environment Variables):
 *   OMADA_OPENAPI_BASE_URL  -> e.g. https://omada.tplinkcloud.com
 *                              (or https://use1-omada-northbound.tplinkcloud.com,
 *                               https://aps1-omada-northbound.tplinkcloud.com,
 *                               or your own https://your-ddns:8043)
 *   OMADA_CLIENT_ID         -> from OC200 → Settings → Platform Integration → Omada Open API
 *   OMADA_CLIENT_SECRET     -> idem, shown only once at creation
 *   OMADAC_ID               -> Controller ID (a.k.a. Omadac ID), shown in Settings → Controller Settings
 *   OMADA_SITE_ID           -> the UUID of the site (e.g. 69ef7391c2742a4b88793b45)
 *
 * Reference: TP-Link Omada Open API docs. The flow is:
 *   1) POST {base}/openapi/authorize/token?grant_type=client_credentials
 *      body: { omadacId, client_id, client_secret }
 *      -> returns { accessToken, expiresIn, refreshToken }
 *   2) POST {base}/openapi/v1/{omadacId}/sites/{siteId}/hotspot/extPortal/auth
 *      header: Authorization: AccessToken={accessToken}
 *      body:   { clientMac, apMac, ssidName, radioId, time, authType }
 */

interface OmadaTokenResponse {
  errorCode: number;
  msg?: string;
  result?: {
    accessToken: string;
    tokenType?: string;
    expiresIn: number;
    refreshToken?: string;
  };
}

interface OmadaApiResponse<T = unknown> {
  errorCode: number;
  msg?: string;
  result?: T;
}

interface CachedToken {
  token: string;
  expiresAt: number; // epoch ms
}

// In-memory cache for the access token. Lambdas keep this alive between warm invocations.
let cached: CachedToken | null = null;

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function getBaseUrl(): string {
  return getEnv('OMADA_OPENAPI_BASE_URL').replace(/\/$/, '');
}

/**
 * Get a valid Access Token, using cache if still fresh (with 60s safety margin).
 */
async function getAccessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }

  const base = getBaseUrl();
  const omadacId = getEnv('OMADAC_ID');
  const clientId = getEnv('OMADA_CLIENT_ID');
  const clientSecret = getEnv('OMADA_CLIENT_SECRET');

  const url = `${base}/openapi/authorize/token?grant_type=client_credentials`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      omadacId,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const text = await res.text();
  let data: OmadaTokenResponse;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Omada token: non-JSON response (status ${res.status}): ${text.slice(0, 200)}`);
  }

  if (data.errorCode !== 0 || !data.result?.accessToken) {
    throw new Error(`Omada token error: code=${data.errorCode} msg=${data.msg ?? '(none)'}`);
  }

  cached = {
    token: data.result.accessToken,
    expiresAt: Date.now() + (data.result.expiresIn ?? 3600) * 1000,
  };
  console.log('[Omada] Access token acquired, expires in', data.result.expiresIn, 's');
  return cached.token;
}

export interface AuthorizeClientParams {
  clientMac: string;
  apMac: string;
  ssidName: string;
  radioId: number; // 0 = 2.4GHz, 1 = 5GHz, 2 = 6GHz (varies by AP)
  /** Authorization duration in seconds. Default 24h. */
  time?: number;
  /**
   * authType per Omada docs:
   *   0 = No Authentication
   *   1 = Simple Password
   *   2 = External RADIUS
   *   4 = External Portal Server
   *   5 = Hotspot
   *  Use 4 (External Portal Server) for this captive portal.
   */
  authType?: number;
}

/**
 * Authorize a client (grant internet) via Omada Open API.
 * Returns true on success, throws on failure with a descriptive message.
 */
export async function authorizeClient(params: AuthorizeClientParams): Promise<boolean> {
  const token = await getAccessToken();
  const base = getBaseUrl();
  const omadacId = getEnv('OMADAC_ID');
  const siteId = getEnv('OMADA_SITE_ID');

  const url = `${base}/openapi/v1/${omadacId}/sites/${siteId}/hotspot/extPortal/auth`;

  const body = {
    clientMac: params.clientMac,
    apMac: params.apMac,
    ssidName: params.ssidName,
    radioId: params.radioId,
    time: params.time ?? 24 * 60 * 60, // 1 day in seconds
    authType: params.authType ?? 4, // External Portal Server
  };

  console.log('[Omada] Authorize POST', url, JSON.stringify(body));
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `AccessToken=${token}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data: OmadaApiResponse;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Omada authorize: non-JSON response (status ${res.status}): ${text.slice(0, 200)}`);
  }

  if (data.errorCode !== 0) {
    // Token might have been revoked/expired; clear cache so next call re-acquires.
    if (data.errorCode === -44112 /* invalid token */ || data.errorCode === -44111) {
      cached = null;
    }
    throw new Error(`Omada authorize failed: errorCode=${data.errorCode} msg=${data.msg ?? '(none)'}`);
  }

  console.log('[Omada] Authorize OK for', params.clientMac);
  return true;
}

/**
 * Optional: revoke a client's access. Useful for "logout" buttons or admin tooling.
 */
export async function unauthorizeClient(clientMac: string): Promise<boolean> {
  const token = await getAccessToken();
  const base = getBaseUrl();
  const omadacId = getEnv('OMADAC_ID');
  const siteId = getEnv('OMADA_SITE_ID');

  const url = `${base}/openapi/v1/${omadacId}/sites/${siteId}/hotspot/clients/${encodeURIComponent(clientMac)}/disconnect`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `AccessToken=${token}`,
    },
  });
  const data = (await res.json().catch(() => ({}))) as OmadaApiResponse;
  return data.errorCode === 0;
}
