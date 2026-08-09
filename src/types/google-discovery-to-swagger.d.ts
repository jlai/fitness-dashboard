declare module "google-discovery-to-swagger" {
  export function checkFormat(data: unknown): boolean;
  export function getVersion(data: { discoveryVersion?: string }): string | undefined;
  export function setStrict(value: boolean): void;
  export function convert(data: unknown): {
    openapi: string;
    info?: { title?: string; version?: string; description?: string };
    paths?: Record<string, unknown>;
    components?: { schemas?: Record<string, unknown> };
    [key: string]: unknown;
  };
}
