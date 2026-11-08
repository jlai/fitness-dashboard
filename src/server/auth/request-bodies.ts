import { z } from "zod";

function nonEmptyString(error: string) {
  return z.string({ error }).min(1, { error });
}

export const createSessionBodySchema = z.object({
  idToken: nonEmptyString("missing idToken"),
});

export const patchSessionBodySchema = z.object({
  maxLifetimeHours: z
    .number({ error: "invalid maxLifetimeHours" })
    .positive({ error: "invalid maxLifetimeHours" }),
});

export const sessionLogoutBodySchema = z.object({
  encryptedHealthToken: nonEmptyString("missing encrypted token").optional(),
  encryptedDriveToken: nonEmptyString("missing encrypted token").optional(),
  unlink: z.boolean({ error: "invalid value for unlink" }).optional(),
});

export const authorizeBodySchema = z.object({
  code: nonEmptyString("missing authorization code"),
});

export const healthAccessBodySchema = z.object({
  encryptedHealthToken: nonEmptyString("missing encrypted token"),
});

export const driveAccessBodySchema = z.object({
  encryptedDriveToken: nonEmptyString("missing encrypted token"),
});

export const driveLogoutBodySchema = driveAccessBodySchema;
