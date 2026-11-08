// @ts-expect-error `.open-next/worker.js` is generated at build time
import { default as handler } from "./.open-next/worker.js";

import { rotateTokenSecrets } from "./src/server/auth/rotate-token-secrets";

export default {
  fetch: handler.fetch,

  async scheduled(
    _controller: { cron: string; scheduledTime: number },
    env: Record<string, unknown>,
  ) {
    await rotateTokenSecrets(env);
  },
};
