# Fitness Dashboard

This is a dashboard app for displaying your fitness data using the Google Health API.

Technologies used:

- [React](https://react.dev/)
- [NextJS](https://nextjs.org/)
- [Gridstack](https://gridstackjs.com/)
- [Jotai](https://jotai.org/)
- [Tanstack Query](https://tanstack.com/query/latest)

## Official website

If you'd like a ready-to-use version of this web app, go to https://dashboard.exercise.quest
which is 100% free and doesn't require you to set anything up yourself.

## Running your own version

If you prefer, you can run your own version locally on your own machine or in the cloud.

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
in it.

```
NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=idgoeshere
GOOGLE_OAUTH_CLIENT_SECRET=secretgoeshere
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000
```

### Generate keys

Refresh tokens for Google Health are stored encrypted in the browser per Google's security requirements. In order to encrypt/decrypt them, you'll need to generate random encryption keys.

```
npm run generate:token-keys
```

The command prints the three active keys to stdout. Copy them into your
environment configuration:

```

SESSION_ACTIVE_KEY={"kty":"oct","kid":"session-1","alg":"HS256","k":"..."}
HEALTH_ACTIVE_KEY={"kty":"oct","kid":"health-1","alg":"A256GCM","k":"..."}
DRIVE_ACTIVE_KEY={"kty":"oct","kid":"drive-1","alg":"A256GCM","k":"..."}
```

To rotate a key locally, set `ACTIVE_KEY` to the new JWK and put all still-valid
keys (new first) in the matching `ACCEPTED_KEYS` JWKS until existing tokens
expire or are re-encrypted:

```
SESSION_ACTIVE_KEY={...new session JWK...}
SESSION_ACCEPTED_KEYS={"keys":[{...new session JWK...},{...previous session JWK...}]}
```

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

### Docker Compose

If you prefer Docker Compose, set `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` and
`GOOGLE_OAUTH_CLIENT_SECRET` in your shell or a Compose `.env` file, and
configure the OAuth client with
`http://localhost:3000` as its origin and redirect URI. Compose generates random
session signing, health-token encryption, and Drive-token encryption keys on
first startup and stores them in a named volume. These keys have no expiration
claim and remain stable across container restarts. To replace them, remove the
`dashboard-keys` volume; doing so invalidates existing sessions and encrypted
tokens. Run `docker compose up` for development. To run the production build,
set `NODE_ENV=production` in the shell or Compose `.env` file before running the
same command; the startup script builds the app and then runs `next start`. The
Compose service builds from the included `Dockerfile`; use
`docker compose up --build` after changing dependencies or the Dockerfile.

### Published Docker image

The GitHub Actions workflow publishes the image and a commit-specific tag to
Docker Hub once a day when the default branch has new commits. It can also be
run manually from the Actions tab. See [local-docker.md](docs/local-docker.md)
for setup and Docker Desktop instructions.

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
