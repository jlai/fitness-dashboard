"use client";

// Intl.NumberFormat doesn't allow specifying patterns directly, so use a representative locale
export const PATTERN_TO_LOCALE: Record<string, string> = {
  "1,234,567.89": "en-US",
  "1 234 567,89": "fr-FR",
  "1.234.567,89": "de-de",
  "12,34,56,789": "en-IN",
};

function createNumberFormats(locale: string | undefined) {
  return {
    locale,
    FRACTION_DIGITS_0: new Intl.NumberFormat(locale, {
      maximumFractionDigits: 0,
    }),
    FRACTION_DIGITS_1: new Intl.NumberFormat(locale, {
      maximumFractionDigits: 1,
    }),
    FRACTION_DIGITS_2: new Intl.NumberFormat(locale, {
      maximumFractionDigits: 2,
    }),
    PERCENT_FRACTION_DIGITS_0: new Intl.NumberFormat(locale, {
      maximumFractionDigits: 0,
      style: "percent",
    }),
    PERCENT_FRACTION_DIGITS_1: new Intl.NumberFormat(locale, {
      maximumFractionDigits: 1,
      style: "percent",
    }),
    TWO_DIGITS: new Intl.NumberFormat(locale, {
      minimumIntegerDigits: 2,
      maximumFractionDigits: 0,
    }),
  };
}

export let NumberFormats = createNumberFormats(undefined);

export function setNumberFormatLocale(locale: string | undefined) {
  NumberFormats = createNumberFormats(locale);
}

export const FRACTION_DIGITS_0 = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

export const FRACTION_DIGITS_1 = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
});

export const FRACTION_DIGITS_2 = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
});

export const PERCENT_FRACTION_DIGITS_0 = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
  style: "percent",
});

export const PERCENT_FRACTION_DIGITS_1 = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
  style: "percent",
});

export const TWO_DIGITS = new Intl.NumberFormat(undefined, {
  minimumIntegerDigits: 2,
  maximumFractionDigits: 0,
});
