import { parseSetCookie } from "cookie";

import {
  applyClearedSessionCookie,
  applySessionCookie,
  readSessionCookie,
  serializeClearedSessionCookie,
  serializeSessionCookie,
  SESSION_COOKIE_NAME,
  sessionCookieMaxAgeSeconds,
  sessionCookieRequestHeader,
} from "@/server/auth/session-cookie";

function expectHostSessionFlags(header: string) {
  const parsed = parseSetCookie(header);

  expect(parsed.name).toBe(SESSION_COOKIE_NAME);
  expect(parsed.path).toBe("/");
  expect(parsed.httpOnly).toBe(true);
  expect(parsed.secure).toBe(true);
  expect(parsed.sameSite).toBe("strict");
  expect(parsed.domain).toBeUndefined();
}

describe("session cookie helpers", () => {
  it("serializes a session cookie without Max-Age", () => {
    const header = serializeSessionCookie("token.jwt");

    expectHostSessionFlags(header);
    expect(parseSetCookie(header).value).toBe("token.jwt");
    expect(parseSetCookie(header).maxAge).toBeUndefined();
  });

  it("serializes a persistent cookie with Max-Age", () => {
    expect(
      parseSetCookie(serializeSessionCookie("token.jwt", 3600)).maxAge,
    ).toBe(3600);
  });

  it("clears the cookie with Max-Age=0 and matching flags", () => {
    const header = serializeClearedSessionCookie();

    expectHostSessionFlags(header);
    expect(parseSetCookie(header).value).toBe("");
    expect(parseSetCookie(header).maxAge).toBe(0);
  });

  it("caps Max-Age at remaining JWT lifetime", () => {
    expect(sessionCookieMaxAgeSeconds(24, 1_000, 100)).toBe(900);
    expect(sessionCookieMaxAgeSeconds(0.25, 10_000, 1_000)).toBe(900);
  });

  it("reads the session cookie from a request", () => {
    const request = new Request("http://localhost:3000/auth/session", {
      headers: {
        Cookie: `other=1; ${sessionCookieRequestHeader("abc.def.ghi")}`,
      },
    });

    expect(readSessionCookie(request)).toBe("abc.def.ghi");
  });

  it("treats an empty session cookie as missing", () => {
    const request = new Request("http://localhost:3000/auth/session", {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=` },
    });

    expect(readSessionCookie(request)).toBeUndefined();
  });

  it("appends Set-Cookie on a response", () => {
    const response = applySessionCookie(
      new Response(null, { status: 204 }),
      "jwt",
    );

    expect(parseSetCookie(response.headers.get("Set-Cookie")!).value).toBe(
      "jwt",
    );

    const cleared = applyClearedSessionCookie(
      new Response(null, { status: 204 }),
    );
    expect(parseSetCookie(cleared.headers.get("Set-Cookie")!).maxAge).toBe(0);
  });
});
