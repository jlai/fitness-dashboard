import { render, screen } from "@testing-library/react";
import dayjs, { Dayjs } from "dayjs";

import DayNavigator from "@/components/day-navigator";
import { formatAsDate } from "@/api/datetime";

jest.useFakeTimers();

describe("DayNavigator", () => {
  it('displays "Today" for the current day', () => {
    const baseDay = dayjs("2024-02-10T12:00:00");
    const selectedDay = baseDay;

    jest.setSystemTime(baseDay.toDate());

    const onSelectDay = () => {};

    render(
      <DayNavigator selectedDay={selectedDay} onSelectDay={onSelectDay} />
    );

    const label = screen.getByText("Today");
    expect(label).toBeTruthy();
  });

  it('displays "Yesterday" for the previous day', () => {
    const baseDay = dayjs("2024-02-10T12:00:00");
    const selectedDay = dayjs("2024-02-09T12:00:00");

    jest.setSystemTime(baseDay.toDate());

    const onSelectDay = () => {};

    render(
      <DayNavigator selectedDay={selectedDay} onSelectDay={onSelectDay} />
    );

    const label = screen.getByText("Yesterday");
    expect(label).toBeTruthy();
  });

  it("displays a formatted date for other days in the same year", () => {
    const baseDay = dayjs("2024-02-10T12:00:00");
    const selectedDay = dayjs("2024-02-02T12:00:00");

    jest.setSystemTime(baseDay.toDate());

    const onSelectDay = () => {};

    render(
      <DayNavigator selectedDay={selectedDay} onSelectDay={onSelectDay} />
    );

    const label = screen.getByText("February 2");
    expect(label).toBeTruthy();
  });

  it("displays a formatted date for other days in a different year", () => {
    const baseDay = dayjs("2024-02-10T12:00:00");
    const selectedDay = dayjs("2021-02-02T12:00:00");

    jest.setSystemTime(baseDay.toDate());

    const onSelectDay = () => {};

    render(
      <DayNavigator selectedDay={selectedDay} onSelectDay={onSelectDay} />
    );

    const label = screen.getByText("February 2, 2021");
    expect(label).toBeTruthy();
  });

  it("navigates when using arrow buttons", async () => {
    const baseDay = dayjs("2024-02-10T12:00:00");
    let selectedDay = dayjs("2024-02-02T12:00:00");

    jest.setSystemTime(baseDay.toDate());

    const onSelectDay = jest.fn((day: Dayjs) => {
      selectedDay = day;
    });

    const { rerender } = render(
      <DayNavigator selectedDay={selectedDay} onSelectDay={onSelectDay} />
    );

    const label = screen.getByText("February 2");
    expect(label).toBeTruthy();

    const previousButton = screen.getByRole("button", {
      name: /previous day/,
    });
    previousButton.click();

    rerender(
      <DayNavigator selectedDay={selectedDay} onSelectDay={onSelectDay} />
    );

    expect(onSelectDay).toHaveBeenCalledTimes(1);
    expect(formatAsDate(selectedDay)).toBe("2024-02-01");

    const nextButton = screen.getByRole("button", {
      name: /next day/,
    });
    nextButton.click();

    rerender(
      <DayNavigator selectedDay={selectedDay} onSelectDay={onSelectDay} />
    );

    expect(onSelectDay).toHaveBeenCalledTimes(2);
    expect(formatAsDate(selectedDay)).toBe("2024-02-02");

    nextButton.click();

    rerender(
      <DayNavigator selectedDay={selectedDay} onSelectDay={onSelectDay} />
    );

    expect(onSelectDay).toHaveBeenCalledTimes(3);
    expect(formatAsDate(selectedDay)).toBe("2024-02-03");
  });
});
