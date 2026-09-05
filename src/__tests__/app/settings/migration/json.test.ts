import {
  buildMigrationBackupDocument,
  stringifyMigrationBackup,
} from "@/app/settings/migration/json";

describe("stringifyMigrationBackup", () => {
  it("serializes selected custom foods, meals, and goals", () => {
    const document = buildMigrationBackupDocument({
      customFoods: [
        {
          accessLevel: "PRIVATE",
          foodId: 9001,
          name: "Homemade Scramble",
          calories: 147,
          units: [{ id: 304, name: "serving", plural: "servings" }],
        },
      ],
      meals: [
        {
          id: "1001",
          name: "Breakfast Plate",
          description: "Eggs",
          mealFoods: [],
        },
      ],
      goals: [
        {
          metric: "distance",
          period: "weekly",
          value: 56.33,
          units: "kilometers",
        },
      ],
    });

    expect(JSON.parse(stringifyMigrationBackup(document))).toEqual(document);
  });

  it("includes empty collections", () => {
    expect(
      JSON.parse(
        stringifyMigrationBackup(
          buildMigrationBackupDocument({
            customFoods: [],
            meals: [],
            goals: [],
          })
        )
      )
    ).toEqual({
      customFoods: [],
      meals: [],
      goals: [],
    });
  });
});
