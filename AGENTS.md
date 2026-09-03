# Overview
This web app provides a dashboard and other features for users to view their Google Health (formerly Fitbit) data
using the [Google Health API](https://developers.google.com/health). It was previously built for the
[Fitbit Web API](https://dev.fitbit.com/build/reference/web-api/) and is in the process of being migrated to Google
Health.

# Architecture
All data is stored on the client side or accessed from / written to the Google Health API. There is no server database.

# Security
This application is intended to comply with [CASA](https://github.com/appdefensealliance/ASA-WG/blob/main/CASA/CASA%20Specification.md)
when deployed to a server. The requirements and considerations should be taken into consideration especially when implementing
OAuth2-related functionality.

External links that open in a new tab (`target="_blank"`) must include `rel="noopener noreferrer"`. This applies to `<a>` tags, Next.js `Link`, MUI `Button`/`Link` with an external `href`, and links injected via sanitized HTML.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
