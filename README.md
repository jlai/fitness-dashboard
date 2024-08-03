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

### Register a Fitbit developer app

Go to https://dev.fitbit.com/apps/new to register an application. You'll need this
to be able to access the Fitbit API.

Set the `OAuth 2.0 Application Type` to either Client or Personal. Personal apps will
only be able to access your own data, and should not be used for publicly-hosted
dashboards.

For the redirect URL, use `http://localhost:3000/login/callback` (or the appropriate
domain if hosted somewhere other than localhost). You can add multiple URLs to the
field separated by spaces.

Set the access type to read/write if you need to modify data.

Once you create the application, it will be assigned a `OAuth 2.0 Client ID`. Create a
`.env.local` file in the same directory as this README, and put the ID in it:

```
NEXT_PUBLIC_FITBIT_OAUTH_CLIENT_ID=idgoeshere
```

If the application type is Personal, you can enable intraday data requests
(e.g. calories/minute) with:

```
NEXT_PUBLIC_ENABLE_INTRADAY=true
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
