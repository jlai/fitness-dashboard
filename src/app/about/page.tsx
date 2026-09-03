import { ArrowDropDown } from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Container,
  Typography,
} from "@mui/material";

import { CONTACT_INFO_LINK, PRIVACY_POLICY_LINK, TOS_LINK } from "@/config";

export default function AboutPage() {
  return (
    <Container maxWidth="md" className="space-y-8">
      <section className="space-y-4">
        <Typography variant="h4">Introduction</Typography>
        <Typography variant="body2">
          A dashboard for viewing stats from your Google Health account, managing and
          logging meals, viewing maps of your runs, and more. This is an early
          preview. There are likely to be bugs and some data may not be
          displayed accurately.
        </Typography>
        <Typography variant="body2">
          This is a volunteer effort created by Fitbit users, for Fitbit users.
          As a result, the site is free to use with no ads and no data
          collection.
        </Typography>
        <Typography variant="body2">
          <b>
            This website is not affiliated with Fitbit or Google LLC. Do not ask
            Fitbit support for help with this website.
          </b>{" "}
          Conversely, we can&quot;t provide support for Fitbit devices.
        </Typography>
        {TOS_LINK && (
          <Typography variant="body2">
            <Button
              variant="text"
              href={TOS_LINK}
              target="_blank"
              rel="noopener noreferrer"
            >
              View Terms of Service
            </Button>
          </Typography>
        )}
      </section>
      <section className="space-y-4">
        <Typography variant="h4">Privacy</Typography>
        <Typography variant="h6">How this works</Typography>
        <Typography variant="body2">
          This website uses the{" "}
          <a
            href="https://developers.google.com/health"
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Health API
          </a>{" "}
          to directly get and display your fitness stats, without passing
          through or syncing to other cloud servers. This means we don&apos;t
          collect, store, transfer, sell, or otherwise have access to your data
          outside your browser.
        </Typography>
        <Typography variant="body2">
          When you connect with Google, we will open a new window to log into
          your Google Account. You&apos;ll be asked to grant permission to this
          website for your Google Health data, and you can choose what types of
          data you would like to authorize access for. Google then redirects
          back to this site with an access token, which is stored locally in
          your browser. This token allows your browser to request data from
          Google&apos;s servers without syncing it to another account or server
          like some other 3rd party services.
        </Typography>
        <Typography variant="body2">
          Some features, such as displaying maps of runs, may send coordinates
          to third-party mapping services in order to fetch relevant map tiles.
        </Typography>
        {PRIVACY_POLICY_LINK && (
          <Typography variant="body2">
            <Button
              variant="text"
              href={PRIVACY_POLICY_LINK}
              target="_blank"
              rel="noopener noreferrer"
            >
              View Privacy Policy
            </Button>
          </Typography>
        )}
      </section>
      <section>
        <Typography variant="h4" className="mb-4">
          FAQ
        </Typography>
        <Accordion>
          <AccordionSummary expandIcon={<ArrowDropDown />}>
            Where can I leave feedback/suggestions or report bugs?
          </AccordionSummary>
          <AccordionDetails>
            <Button
              variant="text"
              href="https://github.com/jlai/fitness-dashboard/discussions"
              target="_blank"
              rel="noopener noreferrer"
            >
              Feature suggestions
            </Button>
            <Button
              variant="text"
              href="https://github.com/jlai/fitness-dashboard/issues"
              target="_blank"
              rel="noopener noreferrer"
            >
              Bug reports
            </Button>
            {CONTACT_INFO_LINK && (
              <Button
                variant="text"
                href={CONTACT_INFO_LINK}
                target="_blank"
                rel="noopener noreferrer"
              >
                Contact
              </Button>
            )}
          </AccordionDetails>
        </Accordion>
      </section>
    </Container>
  );
}
