import { NextResponse } from 'next/server';

/**
 * GET /api/omada-test
 *
 * Preflight test — prueba múltiples URLs base candidatas para encontrar cuál
 * funciona con tu controlador. Útil porque hay 4-5 patrones distintos según
 * sea CBC (Cloud-Based Controller), OC200 hardware con Cloud Access, OC200
 * standalone con DDNS/IP pública, etc.
 *
 * Para cada candidato intenta acquire AccessToken (`POST /openapi/authorize/token`)
 * y reporta el resultado. El primero que devuelva `errorCode: 0` es el que va
 * en `OMADA_OPENAPI_BASE_URL`.
 *
 * Borrá este archivo cuando confirmes que todo funciona.
 */
export async function GET() {
  const env = {
    OMADA_OPENAPI_BASE_URL: process.env.OMADA_OPENAPI_BASE_URL,
    OMADA_CLIENT_ID: process.env.OMADA_CLIENT_ID,
    OMADA_CLIENT_SECRET: process.env.OMADA_CLIENT_SECRET,
    OMADAC_ID: process.env.OMADAC_ID,
    OMADA_SITE_ID: process.env.OMADA_SITE_ID,
  };

  const missing = Object.entries(env).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    return NextResponse.json({ status: 'env_missing', missing }, { status: 400 });
  }

  // Candidate base URLs to try, in priority order.
  // Hardware OC200 with Omada Cloud Access typically lives at the
  // controller-connector subdomain with the omadacId in the path.
  const omadacId = env.OMADAC_ID!;
  const candidates: Array<{ label: string; url: string }> = [
    // 1. Configured value (we try it first so user-provided URL wins)
    { label: '(env) OMADA_OPENAPI_BASE_URL', url: env.OMADA_OPENAPI_BASE_URL!.replace(/\/$/, '') },

    // 2. US East — controller-connector pattern (hardware bound to Omada Cloud)
    { label: 'use1 controller-connector + omadacId path', url: `https://use1-api-omada-controller-connector.tplinkcloud.com/${omadacId}` },
    { label: 'use1 controller-connector (no path)', url: `https://use1-api-omada-controller-connector.tplinkcloud.com` },

    // 3. US East — cloud admin proxy with omadacId in path
    { label: 'use1 omada-cloud + omadacId path', url: `https://use1-omada-cloud.tplinkcloud.com/${omadacId}` },

    // 4. Northbound (CBC native — already failed but include for completeness)
    { label: 'use1 northbound (CBC)', url: `https://use1-omada-northbound.tplinkcloud.com` },
    { label: 'generic northbound', url: `https://omada.tplinkcloud.com` },

    // 5. Other regions, in case the user is on a different cloud region
    { label: 'aps1 controller-connector', url: `https://aps1-api-omada-controller-connector.tplinkcloud.com/${omadacId}` },
    { label: 'eu controller-connector', url: `https://eu-api-omada-controller-connector.tplinkcloud.com/${omadacId}` },
  ];

  // De-duplicate (in case env value matches one of the auto-candidates)
  const seen = new Set<string>();
  const unique = candidates.filter(({ url }) => (seen.has(url) ? false : (seen.add(url), true)));

  type Result = {
    label: string;
    url: string;
    httpStatus?: number;
    errorCode?: number;
    msg?: string;
    accessToken?: boolean;
    expiresIn?: number;
    error?: string;
    raw?: string;
  };
  const results: Result[] = [];

  for (const { label, url } of unique) {
    const tokenUrl = `${url}/openapi/authorize/token?grant_type=client_credentials`;
    try {
      const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          omadacId: env.OMADAC_ID,
          client_id: env.OMADA_CLIENT_ID,
          client_secret: env.OMADA_CLIENT_SECRET,
        }),
      });
      const text = await res.text();
      let parsed: Record<string, unknown> = {};
      try { parsed = JSON.parse(text); } catch { /* not JSON */ }
      const errorCode = parsed.errorCode as number | undefined;
      const msg = parsed.msg as string | undefined;
      const result = (parsed.result as { accessToken?: string; expiresIn?: number } | undefined);
      results.push({
        label,
        url: tokenUrl,
        httpStatus: res.status,
        errorCode,
        msg,
        accessToken: Boolean(result?.accessToken),
        expiresIn: result?.expiresIn,
        raw: !parsed.errorCode && !parsed.result ? text.slice(0, 200) : undefined,
      });
    } catch (e) {
      results.push({
        label,
        url: tokenUrl,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // Find the first candidate that worked
  const winner = results.find((r) => r.errorCode === 0 && r.accessToken);

  return NextResponse.json({
    status: winner ? 'ok' : 'all_failed',
    omadacId: env.OMADAC_ID,
    siteId: env.OMADA_SITE_ID,
    winner: winner
      ? {
          label: winner.label,
          baseUrl: winner.url.replace(/\/openapi\/.*$/, ''),
          hint: `✅ Setear OMADA_OPENAPI_BASE_URL=${winner.url.replace(/\/openapi\/.*$/, '')} en Vercel`,
        }
      : null,
    hint: winner
      ? 'Configurá OMADA_OPENAPI_BASE_URL con el valor de "winner.baseUrl" y redeployá. Después borrá este endpoint.'
      : 'Ningún candidato funcionó. Mirá los errorCode/msg de cada uno. Probablemente necesitás exponer el controlador via DDNS, port-forward, o Cloudflare Tunnel.',
    results,
  }, { status: winner ? 200 : 400 });
}
