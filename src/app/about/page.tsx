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
          A dashboard for viewing stats from your Google Health account,
          managing and logging meals, viewing maps of your runs, and more. This
          is an early preview. There are likely to be bugs and some data may not
          be displayed accurately.
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
          data you would like to authorize access for. The authentication token
          is sent to our server and encrypted, and sent back to your browser
          where it is stored locally. This ensures that our server does not have
          access to your authentication token or health data except briefly when you
          visit the website, while keeping your authentication token secure.
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
        <Accordion>
          <AccordionSummary expandIcon={<ArrowDropDown />}>
            How does this website use Google Drive permissions?
          </AccordionSummary>
          <AccordionDetails>
            <div className="space-y-2">
              <p>
                In order to make sure that settings don't get lost when you sign
                out, we store your settings (dashboard layout, meals, etc.) in a
                hidden folder in your Google Drive.
              </p>
              <p>
                The permission you grant when you enable the Google Drive
                integration will only allow this website to read and write to
                this folder, and will not be able to access any other data in
                your Google Drive.
              </p>
              <p>
                To delete this folder, you can go to your{" "}
                <a
                  href="https://drive.google.com/drive/settings"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Google Drive settings
                </a>{" "}
                and select "Manage apps".
              </p>
            </div>
          </AccordionDetails>
        </Accordion>
      </section>
    </Container>
  );
}
