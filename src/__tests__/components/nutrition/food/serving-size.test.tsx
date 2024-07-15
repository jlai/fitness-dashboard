import { extractServingSize } from "@/components/nutrition/food/serving-size";

describe("extractServingSize", () => {
  it("returns undefined when no leading number", () => {
    expect(extractServingSize("x apple")).toEqual({
      quantity: undefined,
      unitName: undefined,
    });

    expect(extractServingSize("")).toEqual({
      quantity: undefined,
      unitName: undefined,
    });
  });

  it("parses simple serving size", () => {
    expect(extractServingSize("1 apple")).toEqual({
      quantity: 1,
      unitName: "apple",
    });
  });

  it("parses decimal serving size", () => {
    expect(extractServingSize(".5 apple")).toEqual({
      quantity: 0.5,
      unitName: "apple",
    });

    expect(extractServingSize("0.5 apple")).toEqual({
      quantity: 0.5,
      unitName: "apple",
    });

    expect(extractServingSize("10.2 grams")).toEqual({
      quantity: 10.2,
      unitName: "grams",
    });
  });
});
