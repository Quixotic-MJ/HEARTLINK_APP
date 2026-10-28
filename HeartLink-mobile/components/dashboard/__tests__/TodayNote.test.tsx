import React from "react";
import { Linking } from "react-native";
import { render, screen, userEvent } from "@testing-library/react-native";
import { TodayNote } from "../TodayNote";

// Today's note offers the step that fits what happened: after an emergency-level reading that is "See what to do"
// (Call 911 and nearby clinics), never "Review today's meals".

const props = { hidden: false, onHide: jest.fn(), onShow: jest.fn() };

it("offers See what to do after an emergency-level reading", async () => {
  const onAction = jest.fn();
  await render(
    <TodayNote
      {...props}
      onAction={onAction}
      insight={{
        title: "Your reading 185/95 is at an emergency level.",
        body: "If you feel unwell, call 911 now. HeartLink can't diagnose; please get checked in person.",
        icon: "alert-triangle",
        action: "see_what_to_do",
      }}
    />,
  );
  expect(screen.queryByText("Review today's meals")).toBeNull();
  const user = userEvent.setup();
  await user.press(screen.getByRole("button", { name: "See what to do" }));
  expect(onAction).toHaveBeenCalledWith("see_what_to_do");
  // The emergency card also dials 911 straight away, and can't be hidden
  const dial = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
  await user.press(screen.getByRole("button", { name: "Call 911" }));
  expect(dial).toHaveBeenCalledWith("tel:911");
  expect(screen.queryByRole("button", { name: "Hide today's note" })).toBeNull();
  dial.mockRestore();
});

it("offers Log a reading after an ordinary high reading", async () => {
  const onAction = jest.fn();
  await render(
    <TodayNote
      {...props}
      onAction={onAction}
      insight={{ title: "Down 10 after your 134/86 reading.", body: "Log another one later.", action: "log_later" }}
    />,
  );
  await userEvent.setup().press(screen.getByRole("button", { name: "Log a reading" }));
  expect(onAction).toHaveBeenCalledWith("log_later");
  expect(screen.getByText("Log another one later.")).toBeOnTheScreen(); // the explanation shows when there's a step
});

it("keeps a note with no step to one line", async () => {
  await render(
    <TodayNote
      {...props}
      onAction={jest.fn()}
      insight={{ title: "Your 118/76 reading is in the healthy range.", body: "Your score stays at 99.", action: null }}
    />,
  );
  expect(screen.getByText("Your 118/76 reading is in the healthy range.")).toBeOnTheScreen();
  expect(screen.queryByText("Your score stays at 99.")).toBeNull();
});
