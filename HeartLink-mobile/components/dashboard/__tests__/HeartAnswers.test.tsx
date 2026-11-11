import React from "react";
import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import HeartAnswersScreen from "../../../app/(home)/(settings)/heart-answers";
import { loadHeartAnswers, saveHeartAnswers } from "../../../services/heartScore";

jest.mock("../../../services/heartScore", () => ({ loadHeartAnswers: jest.fn(), saveHeartAnswers: jest.fn() }));
jest.mock("../../../contexts/UserContext", () => ({ useUser: () => ({ userId: "u1" }) }));
const mockShowToast = jest.fn();
jest.mock("../../../contexts/ToastContext", () => ({ useToast: () => ({ showToast: mockShowToast }) }));
jest.mock("react-native-safe-area-context", () => ({ SafeAreaView: ({ children }: { children: React.ReactNode }) => children }));

const ANSWERS = {
  ever_smoked: true,
  smoke_now: "Not at all",
  smoke_quit_when: null,
  fruit_veg_servings: "2-3",
  fried_food_freq: "sometimes",
  salty_food_freq: "sometimes",
  bp_medicine: true,
  has_diabetes: false,
  cholesterol_medicine: false,
};

async function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  await render(
    <QueryClientProvider client={client}>
      <HeartAnswersScreen />
    </QueryClientProvider>,
  );
}

describe("Health answers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (loadHeartAnswers as jest.Mock).mockResolvedValue(ANSWERS);
    (saveHeartAnswers as jest.Mock).mockResolvedValue(undefined);
  });

  it("asks when someone quit before it can save, then saves the answer", async () => {
    const user = userEvent.setup();
    await show();
    expect(await screen.findByText("When did you quit?")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Save answers" }));
    expect(saveHeartAnswers).not.toHaveBeenCalled();

    await user.press(screen.getByText("1 to 5 years ago"));
    await user.press(screen.getByRole("button", { name: "Save answers" }));
    await waitFor(() => expect(saveHeartAnswers).toHaveBeenCalledTimes(1));
    expect((saveHeartAnswers as jest.Mock).mock.calls[0][1].smoke_quit_when).toBe("1_to_5_years");
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Answers saved" })));
  });

  it("doesn't ask about quitting for someone who never smoked", async () => {
    (loadHeartAnswers as jest.Mock).mockResolvedValue({ ...ANSWERS, ever_smoked: false, smoke_now: null });
    await show();
    expect(await screen.findByText("Fruit and vegetables a day")).toBeOnTheScreen();
    expect(screen.queryByText("When did you quit?")).not.toBeOnTheScreen();
  });

  it("says so if the answers can't be loaded", async () => {
    (loadHeartAnswers as jest.Mock).mockRejectedValue(new Error("offline"));
    await show();
    expect(await screen.findByText(/couldn't load your answers/)).toBeOnTheScreen();
  });
});


describe("Health answers: the Heart risk questions (HL-140)", () => {
  it("can't save until the three questions are answered", async () => {
    jest.clearAllMocks();
    (loadHeartAnswers as jest.Mock).mockResolvedValue({ ...ANSWERS, smoke_quit_when: "5_plus_years", bp_medicine: null, has_diabetes: null, cholesterol_medicine: null });
    (saveHeartAnswers as jest.Mock).mockResolvedValue(undefined);
    const user = userEvent.setup();
    await show();
    expect(await screen.findByText("Do you take medicine for blood pressure?")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Save answers" }));
    expect(saveHeartAnswers).not.toHaveBeenCalled();
  });
});
