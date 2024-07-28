import { EXTRA_CSP_SCRIPT_SRC, FITBIT_API_URL } from ".";

export const CONTENT_SECURITY_POLICY = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' blob: ${EXTRA_CSP_SCRIPT_SRC ?? ""};
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https://asset-service.fitbit.com;
    connect-src 'self' ${FITBIT_API_URL} https://api.protomaps.com https://protomaps.github.io;
    upgrade-insecure-requests;
    block-all-mixed-content
`.replace(/\s+/, " ");
