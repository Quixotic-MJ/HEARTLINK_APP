import React from "react";
import { render, screen, userEvent, waitFor, within } from "@testing-library/react-native";
import { ExerciseScreening } from "../ExerciseScreening";
import { PAGE_ONE, SECTIONS } from "../../../constants/exerciseScreening";
import { PARQ_WORDING, missingParqWording, parqText } from "../../../constants/parqWording";

const mockMutate = jest.fn();
jest.mock("../../../hooks/useExerciseScreening", () => ({
  useExerciseScreening: () => ({ save: { mutate: mockMutate, isPending: false }, clear: { mutateAsync: jest.fn() } }),
}));
jest.mock("../../../contexts/ToastContext", () => ({ useToast: () => ({ showToast: jest.fn() }) }));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

type User = ReturnType<typeof userEvent.setup>;
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Answers the question whose number is `number` (like "1." or "3b."). */
async function answer(user: User, number: string, yes: boolean) {
  const group = screen.getByLabelText(new RegExp(`^${escape(number)} `));
  await user.press(within(group).getByText(yes ? "Yes" : "No"));
}

async function page1(user: User, yes: string[] = []) {
  for (const [i, q] of PAGE_ONE.entries()) await answer(user, `${i + 1}.`, yes.includes(q));
}

async function finish(user: User) {
  await user.press(within(screen.getByLabelText("Are you pregnant?")).getByText("No"));
  await user.press(within(screen.getByLabelText(/Are you ill right now/)).getByText("No"));
  await user.press(screen.getByText("I filled in the PAR-Q+ myself, read it fully and answered honestly."));
}

const next = () => screen.getByRole("button", { name: "Next" });

// The tests that walk through a whole step tap many buttons, so they get 20 s instead of 5 s
describe("Exercise safety check: the whole PAR-Q+ in the app (2026-11-12)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("all NO on page 1 skips the follow-ups and saves every answer", async () => {
    const user = userEvent.setup();
    await render(<ExerciseScreening onDone={jest.fn()} />);
    expect(next()).toBeDisabled();
    await page1(user);
    await user.press(next());
    expect(screen.getByText("Almost done")).toBeOnTheScreen();
    await finish(user);
    await user.press(screen.getByRole("button", { name: "Save my answers" }));
    await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));
    const sent = mockMutate.mock.calls[0][0];
    expect(sent.parq_form.page1).toEqual(Object.fromEntries(PAGE_ONE.map((q) => [q, false])));
    expect(sent.parq_form.sections).toBeUndefined();
    expect(sent).toMatchObject({ pregnant: false, unwell: false, declared: true });
  }, 20000);

  it("a YES on page 1 asks the condition sections, and a condition's follow-ups only when it's present", async () => {
    const user = userEvent.setup();
    await render(<ExerciseScreening onDone={jest.fn()} />);
    await page1(user, ["q1"]);
    await user.press(next());
    expect(screen.getByText("Follow-up questions")).toBeOnTheScreen();
    expect(screen.queryByLabelText(/^4a\. /)).not.toBeOnTheScreen();

    for (const { n } of SECTIONS) await answer(user, `${n}.`, n === "4");
    expect(next()).toBeDisabled(); // 4a and 4b still to answer
    await answer(user, "4a.", false);
    await answer(user, "4b.", true);
    await user.press(next());
    await finish(user);
    await user.press(screen.getByRole("button", { name: "Save my answers" }));
    await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));
    const sections = mockMutate.mock.calls[0][0].parq_form.sections;
    expect(sections["4"]).toEqual({ present: true, answers: { a: false, b: true } });
    expect(sections["1"]).toEqual({ present: false, answers: null });
  }, 20000);

  it("offers the form's list box after a YES to question 4, 5 or 6", async () => {
    const user = userEvent.setup();
    await render(<ExerciseScreening onDone={jest.fn()} />);
    await answer(user, "4.", true);
    expect(screen.getByText(new RegExp(escape(parqText("p1.q4_list"))))).toBeOnTheScreen();
  });

  it("says why it's asked again", async () => {
    await render(<ExerciseScreening onDone={jest.fn()} reason="expired" />);
    expect(screen.getByText("Your safety check is over 12 months old. Please do it again.")).toBeOnTheScreen();
  });

  it("shows the result, the form's own advice, and that scores don't change", async () => {
    mockMutate.mockImplementation((_answers, { onSuccess }) => onSuccess({ answered: true, paused: false, state: "eligible" }));
    const user = userEvent.setup();
    await render(<ExerciseScreening onDone={jest.fn()} />);
    await page1(user);
    await user.press(next());
    await finish(user);
    await user.press(screen.getByRole("button", { name: "Save my answers" }));
    expect(await screen.findByText("You're good to start gently")).toBeOnTheScreen();
    expect(screen.getByText("What the PAR-Q+ says")).toBeOnTheScreen();
    expect(screen.getByText(/doesn't change your scores/)).toBeOnTheScreen();
  }, 20000);
});

describe("The PAR-Q+ wording file", () => {
  it("has a place for every question the form has", () => {
    const ids = Object.keys(PARQ_WORDING);
    for (const q of PAGE_ONE) expect(ids).toContain(`p1.${q}`);
    for (const { n, follow_ups } of SECTIONS) {
      expect(ids).toContain(`s${n}`);
      for (const l of follow_ups) expect(ids).toContain(`s${n}.${l}`);
    }
  });

  it("shows a clear placeholder until the team copies the official wording in", () => {
    const empty = missingParqWording();
    if (empty.length) {
      expect(parqText(empty[0])).toMatch(/^\[PAR-Q\+ wording missing: /);
    }
  });
});

describe("tidyParqText", () => {
  it("removes the tabs and stray spaces copying from the PDF leaves, and keeps line breaks", () => {
    const { tidyParqText } = jest.requireActual("../../../constants/parqWording");
    expect(tidyParqText("  One\tTWO  three\t? ")).toBe("One TWO three?");
    expect(tidyParqText("First line \n• Second   line")).toBe("First line\n• Second line");
  });
});
