import React from "react";
import { render, screen, userEvent } from "@testing-library/react-native";
import NearestBarangayCard from "../NearestBarangayCard";

// HL-171: the nearest barangay card in My care team and the Emergency locator.

const mockAskAgain = jest.fn();
let mockState: Record<string, unknown> = {};
jest.mock("../../../hooks/useNearestBarangay", () => ({
  useNearestBarangay: () => ({ askAgain: mockAskAgain, retry: jest.fn(), ...mockState }),
}));

const lahug = (phones: string[]) => ({
  status: "found",
  nearest: {
    km: 0.8,
    barangay: { id: "lahug", name: "Lahug", latitude: 10.33, longitude: 123.9, locationKind: "hall", phones, city: null, hallAddress: null },
  },
});

describe("Nearest barangay card", () => {
  beforeEach(() => mockAskAgain.mockReset());

  it("offers Call only for a checked number", async () => {
    mockState = lahug(["032 231 1234"]);
    await render(<NearestBarangayCard />);
    expect(screen.getByText("Barangay Lahug")).toBeOnTheScreen();
    expect(screen.getByText("Hall about 800 m away")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: /Call 032 231 1234/ })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: /Directions/ })).toBeOnTheScreen();
  });

  it("says the number isn't added yet, with Directions only", async () => {
    mockState = lahug([]);
    await render(<NearestBarangayCard />);
    expect(screen.getByText("Number not added yet. In an emergency, call 911.")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /^Call/ })).toBeNull();
  });

  it("asks to turn on location when it's off", async () => {
    mockState = { status: "off", nearest: null };
    const user = userEvent.setup();
    await render(<NearestBarangayCard />);
    expect(screen.getByText("Turn on location to see your nearest barangay's emergency contacts.")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: /Turn on location/ }));
    expect(mockAskAgain).toHaveBeenCalledTimes(1);
  });

  it("says when the area isn't covered", async () => {
    mockState = { status: "none", nearest: null };
    await render(<NearestBarangayCard />);
    expect(screen.getByText("No barangay contacts for your area yet. In an emergency, call 911.")).toBeOnTheScreen();
  });
});
