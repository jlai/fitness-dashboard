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
          A dashboard for viewing stats from your Fitbit account, managing and
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
            <Button variant="text" href={TOS_LINK} target="_blank">
              View Terms of Service
            </Button>
          </Typography>
        )}
      </section>
      <section className="space-y-4">
        <Typography variant="h4">Privacy</Typography>
        <Typography variant="h6">How this works</Typography>
        <Typography variant="body2">
          This website uses the Fitbit Web API to directly get and display your
          fitness stats, without passing through or syncing to other cloud
          servers. This means we don&apos;t collect, store, transfer, sell, or
          otherwise have access to your data outside your browser.
        </Typography>
        <Typography variant="body2">
          Some features, such as displaying maps of runs, may send coordinates
          to third-party mapping services in order to fetch relevant map tiles.
        </Typography>
        {PRIVACY_POLICY_LINK && (
          <Typography variant="body2">
            <Button variant="text" href={PRIVACY_POLICY_LINK} target="_blank">
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
            >
              Feature suggestions
            </Button>
            <Button
              variant="text"
              href="https://github.com/jlai/fitness-dashboard/issues"
              target="_blank"
            >
              Bug reports
            </Button>
            {CONTACT_INFO_LINK && (
              <Button variant="text" href={CONTACT_INFO_LINK} target="_blank">
                Contact
              </Button>
            )}
          </AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary expandIcon={<ArrowDropDown />}>
            Help, I&quot;m getting a blank page or errors due to rate limits
          </AccordionSummary>
          <AccordionDetails>
            The Fitbit Web API has rate limits on the number of data requests
            this website can make on behalf of a user. If the limit is exceeded,
            you may need to wait until the next hour for the quota to reset.
          </AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary expandIcon={<ArrowDropDown />}>
            Can I edit activities or sleep logs?
          </AccordionSummary>
          <AccordionDetails>
            Unfortunately this is not supported in the Fitbit Web API.
          </AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary expandIcon={<ArrowDropDown />}>
            Food search isn&quot;t returning any results
          </AccordionSummary>
          <AccordionDetails>
            There seems to be a problem with the Fitbit API where the food
            search sometimes returns blank results. Unfortunately, this will be
            up to Fitbit to fix.
          </AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary expandIcon={<ArrowDropDown />}>
            I keep getting signed out
          </AccordionSummary>
          <AccordionDetails>
            The Fitbit API has limits on having active sessions in multiple
            browsers. If you log in from multiple browsers, or for example on a
            desktop and a mobile device, you may have to re-login.
          </AccordionDetails>
        </Accordion>
      </section>
    </Container>
  );
}
