import { ArrowDropDown } from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Container,
  Typography,
} from "@mui/material";

export default function AboutPage() {
  return (
    <Container maxWidth="md" className="space-y-8">
      <section className="space-y-4">
        <Typography variant="h4">Introduction</Typography>
        <Typography variant="body2">
          A dashboard for viewing stats from your Fitbit account.
        </Typography>
        <Typography variant="body2">
          This is an early preview (alpha). There are likely to be many bugs and
          some data may not be displayed accurately.
        </Typography>
        <Typography variant="body2">
          <b>
            This website is not affiliated with Fitbit or Google LLC. Do not ask
            Fitbit support for help with this website.
          </b>{" "}
          Conversely, we can&quot;t provide support for Fitbit devices.
        </Typography>
      </section>
      <section className="space-y-4">
        <Typography variant="h4">Privacy</Typography>
        <Typography variant="body2">
          This website runs entirely in your browser and accesses the Fitbit Web
          API to get your fitness stats without passing through or syncing to
          other cloud servers. This helps ensure the safety and security of your
          data.
        </Typography>
        <Typography variant="body2">
          Some features, such as displaying maps of runs, may send coordinates
          to third-party mapping services in order to fetch relevant map tiles.
        </Typography>
      </section>
      <section>
        <Typography variant="h4" className="mb-4">
          FAQ
        </Typography>
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
            browsers, such as desktop + a device. You may have to re-login
            whenever you switch browsers when the current login tokens expire
            (every 8 hours or so).
          </AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary expandIcon={<ArrowDropDown />}>
            Can I view my sleep score?
          </AccordionSummary>
          <AccordionDetails>
            Sleep score is not available in the Fitbit API.
          </AccordionDetails>
        </Accordion>
      </section>
    </Container>
  );
}
