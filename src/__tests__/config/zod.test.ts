import { z } from "zod";

import "@/config/zod";

describe("zod jitless config", () => {
  it("disables AOT compilation for CSP environments", () => {
    expect(z.config().jitless).toBe(true);
  });
});
