import { render, screen } from "@testing-library/react";
import dayjs from "dayjs";

import DayNavigator from "@/components/day-navigator";

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

  it("displays a formatted date for other days", () => {
    const baseDay = dayjs("2024-02-10T12:00:00");
    const selectedDay = dayjs("2024-02-02T12:00:00");

    jest.setSystemTime(baseDay.toDate());

    const onSelectDay = () => {};

    render(
      <DayNavigator selectedDay={selectedDay} onSelectDay={onSelectDay} />
    );

    const label = screen.getByText("Feb 2, 2024");
    expect(label).toBeTruthy();
  });
});
