import { Button, Container, Typography } from "@mui/material";
import NextLink from "next/link";

export default function AboutMigrationPage() {
  return (
    <Container maxWidth="md" className="space-y-8">
      <section className="space-y-4">
        <Typography variant="h4">
          Preparing for the transition to Google Health
        </Typography>
        <Typography variant="body2">
          Over the last few years, Google has been in the process of
          transforming the Fitbit platform into Google Health. As part of the
          transition, they are migrating the API used by 3rd party apps like
          this one to a new Google Health API. The new API should provide a
          faster and more reliable experience, and potentially unlock new
          features in the future.
        </Typography>
        <Typography variant="body2">
          As a result, we are updating this website to work with Google
          Health&apos;s new API. This transition will not make any changes to
          your Fitbit/Google Health account (which has already been migrated to
          Google Health by Google) but will require you to sign in with your
          Google account and authorize access to Google Health once the new site
          is live.
        </Typography>
        <Typography variant="body2">
          After September 29th, this website will be unavailable while we
          prepare the new site. See the timeline below for more details.
        </Typography>
        <Typography variant="body2">
          The new site will mostly look the same, but the login process will be
          different. Some features may be removed or changed. You can read more
          about the transition{" "}
          <a
            href="https://github.com/jlai/fitness-dashboard/discussions/148"
            target="_blank"
            className="underline"
            rel="noopener noreferrer"
          >
            here
          </a>
          .
        </Typography>
      </section>

      <section className="space-y-6">
        <Typography variant="h4">Timeline</Typography>

        <div className="space-y-2">
          <Typography variant="h6">Now through September 29th</Typography>
          <Typography variant="body2">
            The website will remain available until September 29th. If you want
            to keep using your existing custom foods, meals, and goals on the
            new site, back them up before the September 29th.
          </Typography>
          <Button
            variant="contained"
            href="/settings/migration"
            LinkComponent={NextLink}
          >
            Back up custom foods, meals, and goals
          </Button>
        </div>

        <div className="space-y-2">
          <Typography variant="h6">After September 29th</Typography>
          <Typography variant="body2">
            The website will be unavailable while we prepare the new version of
            the dashboard. Unfortunately, this process will take some time while
            we work with Google and undergo a security assessment, which is a
            new requirement for all third-party apps to validate that we are
            handling your Google Health data securely.
          </Typography>
        </div>

        <div className="space-y-2">
          <Typography variant="h6">Mid-October (exactly date TBD)</Typography>
          <Typography variant="body2">
            Once the website returns, you will sign in with your Google account
            and authorize access to Google Health. If you previously saved a
            backup of custom meals, you should be able to import them.
          </Typography>
        </div>
      </section>
    </Container>
  );
}
