import React from "react";
import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import LabResultsScreen from "../../../app/(home)/(settings)/lab-results";
import { loadLabResults, saveCholesterol } from "../../../services/labResults";

// HL-138: optional lab results. The real unit helpers are kept; only the server calls are replaced.
jest.mock("../../../services/labResults", () => ({
  ...jest.requireActual("../../../services/labResults"),
  loadLabResults: jest.fn(),
  saveCholesterol: jest.fn(),
  saveBloodSugar: jest.fn(),
  removeLabResult: jest.fn(),
}));
jest.mock("../../../contexts/UserContext", () => ({ useUser: () => ({ userId: "u1" }) }));
const mockShowToast = jest.fn();
jest.mock("../../../contexts/ToastContext", () => ({ useToast: () => ({ showToast: mockShowToast }) }));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("@react-native-community/datetimepicker", () => () => null);

const CHOLESTEROL = {
  kind: "cholesterol", test_date: "2026-10-01", total_cholesterol: 201, hdl: 50, cholesterol_medicine: false,
  counts: true, counts_until: "2027-10-01", note: "Share this result with your doctor at your next checkup.",
};

async function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  await render(
    <QueryClientProvider client={client}>
      <LabResultsScreen />
    </QueryClientProvider>,
  );
}

describe("Lab results (HL-138)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (loadLabResults as jest.Mock).mockResolvedValue({ cholesterol: CHOLESTEROL, blood_sugar: null });
    (saveCholesterol as jest.Mock).mockResolvedValue(undefined);
  });

  it("shows a saved result, until when it counts, and the doctor note", async () => {
    await show();
    expect(await screen.findByText(/^Counts until/)).toBeOnTheScreen();
    expect(screen.getByText("Share this result with your doctor at your next checkup.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Remove cholesterol result" })).toBeOnTheScreen();
  });

  it("shows numbers in mmol/L and saves them as mg/dL", async () => {
    const user = userEvent.setup();
    await show();
    await screen.findByText(/^Counts until/);
    await user.press(screen.getByRole("radio", { name: /mmol\/L/ }));
    expect(await screen.findByDisplayValue("5.2")).toBeOnTheScreen(); // 201 mg/dL
    await user.press(screen.getAllByRole("button", { name: "Save new result" })[0]);
    await waitFor(() =>
      expect(saveCholesterol).toHaveBeenCalledWith("u1", { test_date: "2026-10-01", total_cholesterol: 201, hdl: 50, cholesterol_medicine: false }),
    );
  });

  it("asks for HbA1c when someone has diabetes", async () => {
    const user = userEvent.setup();
    await show();
    await screen.findByText(/^Counts until/);
    const yes = screen.getAllByRole("radio", { name: "Yes" });
    await user.press(yes[yes.length - 1]); // "Have you been told you have diabetes?"
    expect(screen.getByText("With diabetes, the AHA scores HbA1c only, so add your HbA1c.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Save blood sugar" })).toBeDisabled();
  });
});
