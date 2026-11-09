import React from "react";
import { Linking } from "react-native";
import { render, screen, userEvent, waitFor, within } from "@testing-library/react-native";
import { ExerciseScreening } from "../ExerciseScreening";
import { PARQ_PDF_URL } from "../../../constants/exerciseScreening";

const mockMutate = jest.fn();
jest.mock("../../../hooks/useExerciseScreening", () => ({
  useExerciseScreening: () => ({ save: { mutate: mockMutate, isPending: false }, clear: { mutateAsync: jest.fn() } }),
}));
jest.mock("../../../contexts/ToastContext", () => ({ useToast: () => ({ showToast: jest.fn() }) }));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const save = () => screen.getByRole("button", { name: "Save my answers" });

async function answerNoTo(user: ReturnType<typeof userEvent.setup>, question: string) {
  await user.press(within(screen.getByLabelText(question)).getByText("No"));
}

describe("Exercise safety check (HL-122)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("opens the official PAR-Q+ form, unchanged", async () => {
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    const user = userEvent.setup();
    await render(<ExerciseScreening onDone={jest.fn()} />);
    await user.press(screen.getByRole("button", { name: "Open the PAR-Q+ form" }));
    expect(open).toHaveBeenCalledWith(PARQ_PDF_URL);
  });

  it("asks HeartLink's extra check only after a YES on page 1", async () => {
    const user = userEvent.setup();
    await render(<ExerciseScreening onDone={jest.fn()} />);
    await user.press(screen.getByText("I answered NO to every question on page 1"));
    expect(screen.queryByText(/chest pain, dizziness or fainting/)).not.toBeOnTheScreen();
    await user.press(screen.getByText("I answered YES on page 1, but NO to every follow-up question"));
    expect(screen.getByText(/chest pain, dizziness or fainting/)).toBeOnTheScreen();
  });

  it("needs every answer and the declaration before it saves", async () => {
    const user = userEvent.setup();
    await render(<ExerciseScreening onDone={jest.fn()} />);
    await user.press(screen.getByText("I answered NO to every question on page 1"));
    await answerNoTo(user, "Are you pregnant?");
    await answerNoTo(user, "Are you ill right now with something short-term, like a cold or a fever?");
    await user.press(save());
    expect(mockMutate).not.toHaveBeenCalled();

    await user.press(screen.getByText("I filled in the PAR-Q+ myself, read it fully and answered honestly."));
    await user.press(save());
    await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));
    expect(mockMutate.mock.calls[0][0]).toEqual({ parq_result: "all_no", extra_check_yes: null, pregnant: false, unwell: false, declared: true });
  });

  it("says why it's asked again", async () => {
    await render(<ExerciseScreening onDone={jest.fn()} reason="expired" />);
    expect(screen.getByText("Your safety check is over 12 months old. Please do it again.")).toBeOnTheScreen();
  });

  it("shows what each result means, and that it doesn't change the score", async () => {
    mockMutate.mockImplementation((_answers, { onSuccess }) => onSuccess({ answered: true, paused: false, state: "caution", beginner_only: true }));
    const user = userEvent.setup();
    await render(<ExerciseScreening onDone={jest.fn()} />);
    await user.press(screen.getByText("I answered YES on page 1, but NO to every follow-up question"));
    await answerNoTo(user, "Was any of your YES answers about chest pain, dizziness or fainting, or a doctor telling you to exercise only with medical supervision?");
    await answerNoTo(user, "Are you pregnant?");
    await answerNoTo(user, "Are you ill right now with something short-term, like a cold or a fever?");
    await user.press(screen.getByText("I filled in the PAR-Q+ myself, read it fully and answered honestly."));
    await user.press(save());
    expect(await screen.findByText("Beginner exercises for now")).toBeOnTheScreen();
    expect(screen.getByText(/doesn't change your Heart score/)).toBeOnTheScreen();
  });
});
