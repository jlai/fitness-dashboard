# Fitness Dashboard

This is a dashboard app for displaying your fitness data using the Fitbit Web API.

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
in it:

```
NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=idgoeshere
GOOGLE_OAUTH_CLIENT_SECRET=secretgoeshere
GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN=http://localhost:3000
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

Build the static site:

```bash
npm run build
```

Upload the files to a hosting service. Note that you'll need to configure SPA-style
routing so that 404's get rewritten to serve `index.html`. The process for this will
vary by hosting provider.

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

Since this project is early in development and will likely undergo major refactorings,
I recommend keeping pull requests small, and open a ticket to discuss larger changes.
