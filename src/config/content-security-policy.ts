import { EXTRA_CSP_SCRIPT_SRC, FITBIT_API_URL, FITBIT_API_PROXY_URL } from ".";

export const CONTENT_SECURITY_POLICY = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' blob: ${EXTRA_CSP_SCRIPT_SRC ?? ""};
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https://asset-service.fitbit.com https://tile.openstreetmap.org https://*.tile.opentopomap.org;
    connect-src 'self' ${FITBIT_API_URL} ${
  FITBIT_API_PROXY_URL ?? ""
} https://api.protomaps.com https://protomaps.github.io
`.replace(/\s+/, " ");
