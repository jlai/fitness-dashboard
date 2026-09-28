/** Encrypted health/drive JWEs expire after 15 days and must be refreshed via /auth/{health|drive}/access. */
export const ENCRYPTED_REFRESH_TOKEN_EXPIRATION_SECONDS = 15 * 24 * 60 * 60;

/** Encrypted health JWEs expire after 15 days and must be refreshed via /auth/health/access. */
export const ENCRYPTED_HEALTH_TOKEN_EXPIRATION_SECONDS =
  ENCRYPTED_REFRESH_TOKEN_EXPIRATION_SECONDS;

/** Encrypted drive JWEs expire after 15 days and must be refreshed via /auth/drive/access. */
export const ENCRYPTED_DRIVE_TOKEN_EXPIRATION_SECONDS =
  ENCRYPTED_REFRESH_TOKEN_EXPIRATION_SECONDS;
