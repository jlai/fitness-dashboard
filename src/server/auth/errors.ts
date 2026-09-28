/** Token expired, revoked, mismatched, or failed signature/decoding. */
export class TokenValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TokenValidationError";
  }
}

/** Malformed request body or missing required fields. */
export class RequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestValidationError";
  }
}

/** Request failed Sec-Fetch-Site validation. */
export class FetchHeaderError extends Error {
  constructor(message = "invalid request") {
    super(message);
    this.name = "FetchHeaderError";
  }
}

/** Google token endpoint or revoke call returned a failure payload. */
export class TokenEndpointError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "TokenEndpointError";
    this.code = code;
  }
}

/** Unexpected failure while talking to Google or encrypting a token. */
export class InternalAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InternalAuthError";
  }
}
