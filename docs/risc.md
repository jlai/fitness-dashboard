# Cross-Account Protection (RISC)

[Google Cross-Account Protection](https://developers.google.com/identity/protocols/risc)
(based on the OpenID RISC / Shared Signals standard) notifies this app when a
user's Google Account has a security-relevant change—for example sessions
revoked, OAuth tokens revoked, or the account disabled for hijacking.

The app receives those events at an HTTPS endpoint and invalidates local
sessions for the affected Google user (`sub`) so compromised accounts cannot
keep using stored session or encrypted refresh tokens.

**Important:** RISC signals may only be used for security, anti-fraud, and
session management. Review and accept the RISC Terms when enabling the API.

## How it works in this app

1. Google POSTs a signed security event token (SET) to
   `POST /auth/google/risc/callback` (include `NEXT_PUBLIC_BASE_PATH` if the
   app is mounted under a prefix).
2. The handler validates the token against Google's RISC discovery document
   (`issuer` + JWKS) and checks that `aud` matches
   `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID`. Expiration is not enforced (SETs are
   historical).
3. For each non-verification event with a `subject.sub`, the app calls
   `invalidateIssuedBeforeNow(sub)` on the [session revocation
   store](cloudflare-deployment.md#kv). Tokens issued before the current
   timestamp are treated as revoked.
4. A valid token returns HTTP **202**; an invalid token returns HTTP **400**.

Verification events (`…/event-type/verification`) are accepted but do not
revoke sessions.

Hosted deployments should use a persistent revocation backend (for example
Cloudflare KV). An in-memory store only covers the current process and is
not enough for production RISC.

## Google Cloud setup

Use the **same** API Console project as Sign In with Google / OAuth.

1. Open [Credentials](https://console.developers.google.com/apis/credentials)
   and note the OAuth web client ID (already in
   `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID`).
2. Create a service account with the **RISC Configuration Admin** role
   (`roles/riscconfigs.admin`), then create a JSON key for it. Keep the key
   offline; it is only needed to register or update the stream, not at
   runtime.
3. Open the [RISC API](https://console.developers.google.com/apis/library/risc.googleapis.com)
   page, read the RISC Terms, and enable the API if you consent.
4. Ensure the receiver's domain is listed under the project's
   [authorized domains](https://support.google.com/cloud/answer/6158849#authorized-domains).
   Google will not deliver events to HTTP URLs or unauthorized domains.

You only receive events for users who granted `profile` or `email` (the
default Sign In with Google scopes). Workspace (formerly G Suite) accounts
are not covered by Cross-Account Protection today.

## Register the receiver

After the app is deployed on HTTPS, register the callback URL with Google:

```bash
npm run register:risc-receiver -- \
  --credentials ./risc-service-account.json \
  --receiver-url https://example.com/auth/google/risc/callback
```

Or build the URL from the site origin (honors `--base-path` /
`NEXT_PUBLIC_BASE_PATH`):

```bash
npm run register:risc-receiver -- \
  --credentials ./risc-service-account.json \
  --origin https://example.com \
  --verify \
  --print-config
```

| Flag / env | Purpose |
| --- | --- |
| `--credentials` / `GOOGLE_RISC_SERVICE_ACCOUNT_KEY` | Path to the service account JSON key |
| `--receiver-url` / `RISC_RECEIVER_URL` | Full HTTPS callback URL |
| `--origin` | Site origin used to build `…/auth/google/risc/callback` |
| `--base-path` / `NEXT_PUBLIC_BASE_PATH` | Optional URL prefix when building from `--origin` |
| `--verify` | Request a verification SET after updating the stream |
| `--print-config` | Print the current stream configuration after update |

The script signs a short-lived JWT as the service account and calls
`https://risc.googleapis.com/v1beta/stream:update` with push delivery to the
receiver. It subscribes to sessions/tokens revoked, account disabled/enabled,
credential-change-required, and verification events.

Re-run the script whenever the public receiver URL changes (new domain or
base path).

## Testing

1. Deploy a build that includes `/auth/google/risc/callback` and a shared
   revocation store.
2. Register with `--verify`. Google should POST a verification SET to the
   receiver; the endpoint should respond **202**.
3. For a real security event, confirm that sessions for that user's `sub`
   issued before the event `iat` are rejected (for example
   `session token has been revoked`).

## Code map

| Piece | Location |
| --- | --- |
| Receiver route | `src/app/auth/google/risc/callback/route.ts` |
| SET validation + revocation | `src/server/auth/risc.ts` |
| Revocation store | `src/server/auth/revocation-database.ts` |
| Registration script | `scripts/register-risc-receiver.mjs` |
