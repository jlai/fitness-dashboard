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
