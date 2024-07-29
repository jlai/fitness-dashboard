import dayjs from "dayjs";

export function requiredVar(value?: string) {
  if (!value) {
    throw new Error(`Environment variable missing`);
  }
  return value;
}

export const FITBIT_API_URL = requiredVar(
  process.env.NEXT_PUBLIC_FITBIT_API_URL
);

export const OAUTH_CALLBACK_URI = requiredVar(
  process.env.NEXT_PUBLIC_FITBIT_OAUTH_REDIRECT_URI
);

export const FITBIT_OAUTH_SERVER = requiredVar(
  process.env.NEXT_PUBLIC_FITBIT_OAUTH_SERVER
);

export const FITBIT_OAUTH_CLIENT_ID = requiredVar(
  process.env.NEXT_PUBLIC_FITBIT_OAUTH_CLIENT_ID
);

export const FITBIT_OAUTH_AUTHORIZATION_ENDPOINT = requiredVar(
  process.env.NEXT_PUBLIC_FITBIT_OAUTH_AUTHORIZATION_ENDPOINT
);

/**
 * Whether to enable intraday timeseries requests
 * (see https://dev.fitbit.com/build/reference/web-api/intraday/)
 */
export const ENABLE_INTRADAY =
  process.env.NEXT_PUBLIC_ENABLE_INTRADAY === "true";

/** URL for MapLibre style JSON (usually contains API key) */
export const MAPLIBRE_STYLE_URL = process.env.NEXT_PUBLIC_MAPLIBRE_STYLE_URL;

/** Name of the dashboard */
export const WEBSITE_NAME =
  process.env.NEXT_PUBLIC_WEBSITE_NAME ?? "Fitness Dashboard";

/** URL for person or company hosting the dashboard */
export const HOST_WEBSITE_NAME = process.env.NEXT_PUBLIC_HOST_WEBSITE_NAME;

/** Link to person or company hosting the dashboard */
export const HOST_WEBSITE_LINK =
  process.env.NEXT_PUBLIC_HOST_WEBSITE_LINK ?? "";

/** Link to contact info page */
export const CONTACT_INFO_LINK =
  process.env.NEXT_PUBLIC_CONTACT_INFO_LINK ?? HOST_WEBSITE_LINK ?? "";

/** Link to privacy policy */
export const PRIVACY_POLICY_LINK = process.env.NEXT_PUBLIC_PRIVACY_POLICY_LINK;

/** Link to terms of service */
export const TOS_LINK = process.env.NEXT_PUBLIC_TOS_LINK;

/** Link to what's new page */
export const WHATS_NEW_LINK = process.env.NEXT_PUBLIC_WHATS_NEW_LINK;

/** Link to survey */
export const SURVEY_LINK = process.env.NEXT_PUBLIC_SURVEY_LINK;

/**
 * ISO8601 date range to show survey, e.g. 2024-05-01/2024-05-07
 * If time is not provided, uses the (local) start of day.
 * Does not support repeating intervals.
 */
export const SURVEY_DATE_RANGE = ((value: string | undefined) => {
  if (!value) {
    return undefined;
  }

  const [startDate, endDate] = value.split("/");
  return [dayjs(startDate), dayjs(endDate)];
})(process.env.NEXT_PUBLIC_SURVEY_DATE_RANGE);

/** URL to send anonymous analytics */
export const ANALYTICS_PING_URL = process.env.NEXT_PUBLIC_ANALYTICS_PING_URL;

/** Extra content security script-src */
export const EXTRA_CSP_SCRIPT_SRC =
  process.env.NEXT_PUBLIC_CSP_EXTRA_SCRIPT_SRC;
