import { act, render, screen } from "@testing-library/react";

import { SurveyButton } from "@/components/survey";

jest.useFakeTimers();

const DATE_IN_SURVEY_PERIOD = "2024-07-16T12:00:00";
const DATE_OUTSIDE_SURVEY_PERIOD = "2024-07-25T12:00:00";

describe("SurveyButton", () => {
  it("displays survey during configured time period", () => {
    jest.setSystemTime(new Date(DATE_IN_SURVEY_PERIOD));

    render(<SurveyButton />);

    const button = screen.getByRole("button", { name: "Survey" });
    expect(button).toBeTruthy();
  });

  it("does not display survey outside configured time period", () => {
    jest.setSystemTime(new Date(DATE_OUTSIDE_SURVEY_PERIOD));

    render(<SurveyButton />);

    const label = screen.queryByRole("button", { name: "Survey" });
    expect(label).toBeNull();
  });

  it("does not display survey after survey dismissed", async () => {
    jest.setSystemTime(new Date(DATE_IN_SURVEY_PERIOD));

    render(<SurveyButton />);

    const button = screen.getByRole("button", { name: "Survey" });

    act(() => {
      button.click();
    });

    const noThanksButton = await screen.findByRole("button", {
      name: "No thanks",
    });

    act(() => {
      noThanksButton.click();
    });

    const buttonAfterDismiss = screen.queryByRole("button", { name: "Survey" });

    expect(buttonAfterDismiss).toBeNull();
  });
});
