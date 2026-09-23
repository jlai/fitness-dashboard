import localFont from "next/font/local";

export const roboto = localFont({
  src: "./roboto-latin.woff2",
  weight: "400 500",
  display: "swap",
  variable: "--font-roboto",
});

export const poppins = localFont({
  src: [
    {
      path: "./poppins-latin-400.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./poppins-latin-500.woff2",
      weight: "500",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-poppins",
});

export const openSans = localFont({
  src: "./open-sans-latin.woff2",
  weight: "400 500",
  display: "swap",
  variable: "--font-open-sans",
});
