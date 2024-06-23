/**
 * Setup is in a separate file so we can avoid loading Polly if it's
 * not enabled.
 */

"use client";

import { Polly } from "@pollyjs/core";
import FetchAdapter from "@pollyjs/adapter-fetch";
import PersisterLocalStorage from "@pollyjs/persister-local-storage";

Polly.register(FetchAdapter);
Polly.register(PersisterLocalStorage);

export async function createPolly() {
  const polly = new Polly("default", {
    adapters: ["fetch"],
    persister: "local-storage",
    persisterOptions: {
      // Save requests immediately, not just on stop
      keepUnusedRequests: true,
    },
    matchRequestsBy: {
      headers(headers) {
        delete headers["Authorization"];
        return headers;
      },
    },
  });

  console.log("polly ready");

  return polly;
}
