import React from "react";
import { render, screen, userEvent } from "@testing-library/react-native";
import { OfflineNote, savedAtLabel } from "../OfflineNote";

// Offline, the dashboard and Trends keep their saved data and say how old it is (React Query pauses the refresh).

it("says the data could not refresh and when it was saved", async () => {
  const savedAt = new Date().setHours(8, 40, 0, 0);
  const onRetry = jest.fn();
  await render(<OfflineNote savedAt={savedAt} onRetry={onRetry} />);
  expect(screen.getByText(`Couldn't refresh your latest data. You're offline, so this is from ${savedAtLabel(savedAt)}.`)).toBeOnTheScreen();
  await userEvent.setup().press(screen.getByRole("button", { name: "Try again" }));
  expect(onRetry).toHaveBeenCalled();
});

it("names the day when the data is from an earlier day", () => {
  const now = new Date(2026, 9, 28, 9, 0);
  expect(savedAtLabel(new Date(2026, 9, 28, 8, 40).getTime(), now)).not.toMatch(/Oct/);
  expect(savedAtLabel(new Date(2026, 9, 27, 20, 5).getTime(), now)).toMatch(/^Oct 27, /);
  expect(savedAtLabel(0, now)).toBeNull();
});
