import React from "react";
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
  await userEvent.setup().press(screen.getByRole("button", { name: "See what to do" }));
  expect(onAction).toHaveBeenCalledWith("see_what_to_do");
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
});
