import { QueryClient } from "@tanstack/react-query";

import { buildCreateWeightLogMutation } from "@/api/body";

describe("buildCreateWeightLogMutation cache invalidation", () => {
  it("invalidates the weight daily-rollup cache so a refetch does not reuse it", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const rollupKey = [
      "datapoints",
      "daily-rollup",
      "weight",
      "2021-02-01",
      "2021-03-01",
    ];
    let fetches = 0;
    const queryFn = async () => {
      fetches += 1;
      return { rollupDataPoints: [] };
    };
    const staleTime = 60 * 60 * 1000;

    await queryClient.fetchQuery({
      queryKey: rollupKey,
      queryFn,
      staleTime,
    });
    expect(fetches).toBe(1);

    const { onSuccess } = buildCreateWeightLogMutation(queryClient);
    await onSuccess?.(
      undefined,
      undefined as never,
      undefined,
      undefined as never,
    );

    await queryClient.fetchQuery({
      queryKey: rollupKey,
      queryFn,
      staleTime,
    });
    expect(fetches).toBe(2);
  });
});
