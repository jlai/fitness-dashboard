# Fitness Dashboard

This is a web dashboard for displaying your Google Health fitness data using the [Google Health API](https://developers.google.com/health).

## Official website

If you'd like a ready-to-use version of this web app, go to https://dashboard.exercise.quest
which is 100% free and doesn't require you to set anything up yourself.

## Running your own version

If you prefer, you can run your own version locally on your own machine.

### Register a Google OAuth client

Follow https://developers.google.com/health/setup to create a Google Cloud project.

1. Create a project.
2. Go to `APIs & Services` from the Quick Access or the left sidebar.
3. Under `Enabled APIs & Services` click the `Enable APIs and Services` button. Search for the Google Health and Google Drive APIs and enable both of them.
4. On the `Credentials` page, click `Create credentials` and choose `OAuth client ID`.
5. Choose `Web Application`. Add `http://localhost:3000` to both `Authorized JavaScript Origins` and `Authorized redirect URIs`. If using the Docker image, add `http://localhost:23000` instead.
6. You'll need to copy the `Client ID` and `Client secret` for the next steps.
7. Go to the `Audience` page to add test users.

### Running the prebuilt Docker image

To run a prebuilt Docker image on your computer, see the [Docker instructions](docs/docker/README.md).

### Local development

See the [docs](docs/local-development.md) on how to develop and test local changes.

## License

[MIT license](LICENSE)

## Contributing

Report bugs in the [issue tracker](https://github.com/jlai/fitness-dashboard/issues).

If you'd like to contribute bugfixes and features, feel free to open a pull request. For larger changes, please open a discussion issue before you start implementing.
