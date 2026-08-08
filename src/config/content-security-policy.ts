import { EXTRA_CSP_SCRIPT_SRC } from ".";

export const CONTENT_SECURITY_POLICY = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' blob: ${EXTRA_CSP_SCRIPT_SRC ?? ""};
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https://asset-service.fitbit.com https://tile.openstreetmap.org https://*.tile.opentopomap.org;
    frame-src 'self' https://accounts.google.com;
    connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://api.fitbit.com https://www.fitbit.com https://api.protomaps.com https://protomaps.github.io
`.replace(/\s+/, " ");
