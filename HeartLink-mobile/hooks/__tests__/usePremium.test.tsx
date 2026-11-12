import { act, renderHook, waitFor } from "@testing-library/react-native";
import { apiFetch } from "../../lib/api";
import { useIsPremium } from "../usePremium";
import { createTestQueryClient, queryClientWrapper } from "../../test-utils/reactQuery";

// 2026-11-12: Premium given by an admin in the portal while the app was open stayed locked on the phone, because the
// screens read the profile saved at sign-in. The server's answer now wins, and the saved profile is refreshed.

jest.mock("../../lib/api", () => ({ apiFetch: jest.fn() }));

const mockRefreshUser = jest.fn(async () => {});
let mockProfile: Record<string, unknown> = { plan: "free", premium_until: null };
jest.mock("../../contexts/UserContext", () => ({
  useUser: () => ({ userId: "user-1", user: mockProfile, refreshUser: mockRefreshUser }),
}));

function serverSays(isPremium: boolean) {
  (apiFetch as jest.Mock).mockResolvedValue({ ok: true, status: 200, json: async () => ({ is_premium: isPremium }) });
}

async function render() {
  return renderHook(() => useIsPremium(), { wrapper: queryClientWrapper(createTestQueryClient()) });
}

describe("useIsPremium", () => {
  beforeEach(() => {
    mockRefreshUser.mockClear();
    (apiFetch as jest.Mock).mockReset();
    mockProfile = { plan: "free", premium_until: null };
  });

  it("unlocks when the server says Premium, and refreshes the saved mockProfile", async () => {
    serverSays(true);
    const { result } = await render();
    await waitFor(() => expect(result.current).toBe(true));
    expect(mockRefreshUser).toHaveBeenCalled();
    expect((apiFetch as jest.Mock).mock.calls[0][0]).toBe("/api/premium");
  });

  it("locks again when Premium was removed, even if the saved mockProfile still says Premium", async () => {
    mockProfile = { plan: "premium", premium_until: "2099-01-01T00:00:00+00:00" };
    // The server answers only when the test says so. An instant answer could arrive before the first check on a busy
    // test run, so that check sometimes saw the final answer and failed.
    let answer: (response: unknown) => void = () => {};
    (apiFetch as jest.Mock).mockReturnValue(new Promise((resolve) => (answer = resolve)));
    const { result } = await render();
    expect(result.current).toBe(true); // the saved mockProfile is the first guess while the server answers
    await act(async () => answer({ ok: true, status: 200, json: async () => ({ is_premium: false }) }));
    await waitFor(() => expect(result.current).toBe(false));
    expect(mockRefreshUser).toHaveBeenCalled();
  });

  it("keeps the saved mockProfile's answer when the server can't be reached, and doesn't refresh", async () => {
    mockProfile = { plan: "premium", premium_until: "2099-01-01T00:00:00+00:00" };
    (apiFetch as jest.Mock).mockRejectedValue(new Error("offline"));
    const { result } = await render();
    await waitFor(() => expect((apiFetch as jest.Mock).mock.calls.length).toBe(1));
    expect(result.current).toBe(true);
    expect(mockRefreshUser).not.toHaveBeenCalled();
  });

  it("doesn't refresh when both agree", async () => {
    serverSays(false);
    const { result } = await render();
    await waitFor(() => expect((apiFetch as jest.Mock).mock.calls.length).toBe(1));
    expect(result.current).toBe(false);
    expect(mockRefreshUser).not.toHaveBeenCalled();
  });
});
