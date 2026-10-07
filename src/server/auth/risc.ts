import {
  createRemoteJWKSet,
  errors,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
} from "jose";
import { z } from "zod";

import { getConfiguredClientId } from "./env";
import { RequestValidationError } from "./errors";
import { getRevocationDatabase } from "./revocation-database";

export const RISC_CONFIGURATION_URI =
  "https://accounts.google.com/.well-known/risc-configuration";

export const RISC_VERIFICATION_EVENT_TYPE =
  "https://schemas.openid.net/secevent/risc/event-type/verification";

/** Subject that identifies a Google Account by issuer + `sub`. */
export interface RiscIssSubSubject {
  subject_type?: "iss-sub" | "id_token_claims" | string;
  iss?: string;
  sub: string;
  email?: string;
}

/** Subject that identifies an individual OAuth refresh token. */
export interface RiscOAuthTokenSubject {
  subject_type?: string;
  token_type?: "refresh_token" | string;
  token_identifier_alg?: "prefix" | "hash_base64_sha512_sha512" | string;
  token?: string;
}

export type RiscEventSubject = RiscIssSubSubject | RiscOAuthTokenSubject;

/**
 * One entry in a SET `events` claim: event-type URI → event details.
 * @see https://developers.google.com/identity/protocols/risc
 */
export interface RiscSecurityEvent {
  subject?: RiscEventSubject;
  reason?: string;
  state?: string;
  [key: string]: unknown;
}

/** Mapping from RISC / OpenID security event type URI to event payload. */
export type RiscEvents = Record<string, RiscSecurityEvent>;

/**
 * SETs are historical and must not be rejected for expiration. jose always
 * checks `exp` when present; evaluating claims at the Unix epoch skips that
 * check (SETs are not expected to carry `nbf`).
 */
const SKIP_EXPIRATION_DATE = new Date(0);

const RISC_CONFIG_CACHE_TTL_MS = 60 * 60 * 1000;

const riscConfigurationDocumentSchema = z.object({
  issuer: z.string().min(1),
  jwks_uri: z.url(),
});

interface RiscConfiguration {
  issuer: string;
  jwksUri: string;
  jwks: JWTVerifyGetKey;
}

interface CachedRiscConfiguration {
  value: RiscConfiguration;
  expiresAt: number;
}

let cachedRiscConfiguration: CachedRiscConfiguration | undefined;

export function resetRiscConfigurationCache() {
  cachedRiscConfiguration = undefined;
}

/**
 * Validate a Google Cross-Account Protection (RISC) security event token and
 * invalidate sessions for any affected subjects.
 */
export async function handleRiscSecurityEventToken(
  token: string,
): Promise<void> {
  const payload = await verifyRiscSecurityEventToken(token);
  await applyRiscSecurityEvents(payload);
}

export async function verifyRiscSecurityEventToken(
  token: string,
): Promise<JWTPayload> {
  if (!token.trim()) {
    throw new RequestValidationError("missing security event token");
  }

  const audience = getConfiguredClientId();
  const { issuer, jwks } = await getRiscConfiguration();

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer,
      audience,
      algorithms: ["RS256"],
      currentDate: SKIP_EXPIRATION_DATE,
    });

    return payload;
  } catch (error) {
    if (
      error instanceof errors.JOSEError ||
      error instanceof RequestValidationError
    ) {
      throw new RequestValidationError("invalid security event token");
    }

    throw error;
  }
}

export async function applyRiscSecurityEvents(
  payload: JWTPayload,
): Promise<void> {
  const subjects = subjectsFromEvents(payload.events);

  if (subjects.length === 0) {
    return;
  }

  const revocationDatabase = await getRevocationDatabase();

  await Promise.all(
    subjects.map((sub) => revocationDatabase.invalidateIssuedBeforeNow(sub)),
  );
}

/** Unique Google Account `sub` values from non-verification events. */
function subjectsFromEvents(events: unknown): string[] {
  const parsed = parseRiscEvents(events);

  if (!parsed) {
    return [];
  }

  const uniqueSubjects = new Set<string>();

  for (const [eventType, event] of Object.entries(parsed)) {
    // Structured object so Workers Logs indexes fields for filtering.
    // Do not log subject identifiers or other event details.
    console.log({
      message: "processing RISC security event",
      eventType,
      subjectType: subjectType(event),
    });

    if (eventType === RISC_VERIFICATION_EVENT_TYPE) {
      continue;
    }

    const sub = getGoogleAccountSub(event);

    if (sub) {
      uniqueSubjects.add(sub);
    }
  }

  return [...uniqueSubjects];
}

function parseRiscEvents(events: unknown): RiscEvents | undefined {
  if (!events || typeof events !== "object" || Array.isArray(events)) {
    return undefined;
  }

  return events as RiscEvents;
}

function subjectType(event: RiscSecurityEvent): string | undefined {
  const subject = event.subject;

  if (!subject || typeof subject !== "object") {
    return undefined;
  }

  return typeof subject.subject_type === "string"
    ? subject.subject_type
    : undefined;
}

function getGoogleAccountSub(event: RiscSecurityEvent): string | undefined {
  const subject = event.subject;

  if (!subject || typeof subject !== "object") {
    return undefined;
  }

  if (!("sub" in subject)) {
    return undefined;
  }

  const sub = subject.sub;

  if (typeof sub !== "string" || sub.length === 0) {
    return undefined;
  }

  return sub;
}

async function getRiscConfiguration(): Promise<RiscConfiguration> {
  const now = Date.now();

  if (cachedRiscConfiguration && cachedRiscConfiguration.expiresAt > now) {
    return cachedRiscConfiguration.value;
  }

  const response = await fetch(RISC_CONFIGURATION_URI);

  if (!response.ok) {
    throw new Error(
      `failed to fetch RISC configuration: HTTP ${response.status}`,
    );
  }

  const document: unknown = await response.json();
  const parsed = riscConfigurationDocumentSchema.safeParse(document);

  if (!parsed.success) {
    throw new Error("RISC configuration is missing issuer or jwks_uri");
  }

  const value: RiscConfiguration = {
    issuer: parsed.data.issuer,
    jwksUri: parsed.data.jwks_uri,
    jwks: createRemoteJWKSet(new URL(parsed.data.jwks_uri)),
  };

  cachedRiscConfiguration = {
    value,
    expiresAt: now + RISC_CONFIG_CACHE_TTL_MS,
  };

  return value;
}
