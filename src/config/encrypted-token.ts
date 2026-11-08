/**
 * Longest allowed encrypted health/drive refresh-token lifetime (15 days).
 * Issued tokens use ENCRYPTED_REFRESH_TOKEN_EXPIRATION_MINUTES, which cannot
 * exceed this. Revocation records use this maximum so they outlive any token
 * that might still be valid.
 */
export const ENCRYPTED_REFRESH_TOKEN_EXPIRATION_SECONDS = 15 * 24 * 60 * 60;
