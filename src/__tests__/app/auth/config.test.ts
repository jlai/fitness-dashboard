import { GET } from "@/app/auth/config/route";

const envName = "NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID";
const originalId = process.env[envName];

afterEach(() => {
  if (originalId === undefined) delete process.env[envName];
  else process.env[envName] = originalId;
  jest.restoreAllMocks();
});

it("fetches the runtime client ID once when the build omitted it", async () => {
  delete process.env[envName];
  await jest.isolateModulesAsync(async () => {
    const config = await import("@/config");
    process.env[envName] = "runtime-client";
    const fetchConfig = jest
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => GET());

    expect(await config.loadGoogleClientId()).toBe("runtime-client");
    expect(config.GOOGLE_OAUTH_CLIENT_ID).toBe("runtime-client");
    expect(await config.loadGoogleClientId()).toBe("runtime-client");
    expect(fetchConfig).toHaveBeenCalledWith(
      config.withBasePath("/auth/config"),
    );
    expect(fetchConfig).toHaveBeenCalledTimes(1);
  });
});

it("uses the build-time ID without requesting config", async () => {
  process.env[envName] = "build-client";
  await jest.isolateModulesAsync(async () => {
    const config = await import("@/config");
    const fetchConfig = jest.spyOn(globalThis, "fetch");
    expect(await config.loadGoogleClientId()).toBe("build-client");
    expect(fetchConfig).not.toHaveBeenCalled();
  });
});
