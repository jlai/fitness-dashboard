# Fitness Dashboard

This is a dashboard app for displaying your fitness data using the Google Health API.

Technologies used:

- [React](https://react.dev/)
- [NextJS](https://nextjs.org/)
- [Gridstack](https://gridstackjs.com/)
- [Jotai](https://jotai.org/)
- [Tanstack Query](https://tanstack.com/query/latest)

## Live demo

See https://dashboard.exercise.quest for a live deployment.

## Running a local development server

### Register a Google OAuth client

Follow https://developers.google.com/health/setup to create a Google Cloud project,
enable the Google Health API, and configure the OAuth consent screen. On the Data
Access page, add every Google Health API scope, since login requests all of them.

Create an OAuth client of type `Web application`. Add your site origin (for local
development, `http://localhost:3000`) under Authorized JavaScript origins. For
the authorization code popup flow, also add that same origin under Authorized
redirect URIs.

Once you create the client, it will be assigned a client ID and client secret.
Create a `.env.local` file in the same directory as this README, and put them
in it. Session JWTs and encrypted refresh tokens each need their own oct JWK
with a `kid` (32 random bytes, base64url-encoded as `k`):

```
node -e "const {randomBytes}=require('crypto'); console.log(JSON.stringify({kty:'oct',kid:'session-1',alg:'HS256',k:randomBytes(32).toString('base64url')}))"
node -e "const {randomBytes}=require('crypto'); console.log(JSON.stringify({kty:'oct',kid:'refresh-1',alg:'A256GCM',k:randomBytes(32).toString('base64url')}))"
```

```
NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=idgoeshere
GOOGLE_OAUTH_CLIENT_SECRET=secretgoeshere
GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN=http://localhost:3000
SESSION_TOKEN_JWK={"kty":"oct","kid":"session-1","alg":"HS256","k":"..."}
REFRESH_TOKEN_JWK={"kty":"oct","kid":"refresh-1","alg":"A256GCM","k":"..."}
```

To rotate a key, put the new JWK first in a JWKS and keep previous keys until
existing tokens expire or are re-encrypted:

```
SESSION_TOKEN_JWK={"keys":[{...new session JWK...},{...previous session JWK...}]}
```

### Docker Compose

If you prefer Docker Compose, you can start a development server with `compose up`.

### Installation

Install the latest version of [nodejs](https://nodejs.org/).

Clone or download this repository. Open a command line terminal to the directory,
and run:

```bash
npm install
```

Now you can run the server in development mode:

```bash
npm run dev
```

To connect, open your web browser to http://localhost:3000

## Building for deployment

Create `.env.production.local` with any custom environment properties,
or set them using environment variables if using a cloud build pipeline.

To serve the app under a URL prefix such as `https://example.com/fitness`,
set `NEXT_PUBLIC_BASE_PATH=/fitness` at **build time**. The value should start
with a slash and should not have a trailing slash.

## Running tests

### Unit tests (jest)

```bash
npm run test
```

### UI automation tests (playwright)

Create a production build with test environment. Run this whenever you make
changes.

```bash
npm run build-e2e`
```

Run tests headless:

```bash
npx playwright test
```

Run tests with UI:

```bash
npx playwright test --ui
```

Debug:

```bash
npx playwright test --debug
```

## License

[MIT license](LICENSE)

## Contributing

I recommend keeping pull requests small, and open a ticket to discuss larger changes.
