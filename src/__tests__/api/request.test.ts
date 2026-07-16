import { getJSON } from "@/api/request";

describe("getJSON", () => {
  it("parses ids larger than Number.MAX_SAFE_INTEGER without losing precision", async () => {
    const body = JSON.stringify({
      activities: [{ logId: "BIG_ID", steps: 5000, distance: 1.5 }],
    }).replace('"BIG_ID"', "2369048793018741424");

    const response = { text: async () => body } as Response;

    const parsed = await getJSON<{
      activities: Array<{
        logId: number | bigint;
        steps: number;
        distance: number;
      }>;
    }>(response);

    const [activity] = parsed.activities;

    // JSON.parse would round this to 2369048793018741000
    expect(activity.logId).toBe(BigInt("2369048793018741424"));

    // safe integers and floats are unaffected
    expect(activity.steps).toBe(5000);
    expect(activity.distance).toBe(1.5);
  });
});
