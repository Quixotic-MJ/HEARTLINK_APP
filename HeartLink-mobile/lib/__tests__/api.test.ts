import { apiFetch, setSessionEndedHandler } from "../api";
import { getToken } from "../secureTokenStore";
import { refreshSession } from "../../services/SessionService";

jest.mock("../secureTokenStore", () => ({ getToken: jest.fn() }));
jest.mock("../../services/SessionService", () => ({ refreshSession: jest.fn() }));

const mockGetToken = getToken as jest.Mock;
const mockRefresh = refreshSession as jest.Mock;
const realFetch = global.fetch;

function reply(status: number) {
  return { status, ok: status >= 200 && status < 300, json: async () => ({}) } as Response;
}

function sentAuth(call: number): string | undefined {
  const init = (global.fetch as jest.Mock).mock.calls[call][1] as RequestInit;
  return (init.headers as Record<string, string>).Authorization;
}

beforeEach(() => {
  jest.clearAllMocks();
  setSessionEndedHandler(null);
});
afterAll(() => {
  global.fetch = realFetch;
});

describe("apiFetch (HL-023)", () => {
  it("adds the saved token to backend requests", async () => {
    mockGetToken.mockResolvedValue("tok-1");
    global.fetch = jest.fn().mockResolvedValue(reply(200));

    await apiFetch("/api/meals/u1", { method: "POST" });

    expect((global.fetch as jest.Mock).mock.calls[0][0]).toMatch(/\/api\/meals\/u1$/);
    expect(sentAuth(0)).toBe("Bearer tok-1");
  });

  it("sends no token and never renews for auth: false calls", async () => {
    mockGetToken.mockResolvedValue("tok-1");
    global.fetch = jest.fn().mockResolvedValue(reply(401));

    const res = await apiFetch("/api/auth/login", { auth: false, method: "POST" });

    expect(res.status).toBe(401);
    expect(sentAuth(0)).toBeUndefined();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("renews the session once on a 401 and retries with the new token", async () => {
    mockGetToken.mockResolvedValue("old");
    mockRefresh.mockResolvedValue({ status: "refreshed", token: "new" });
    global.fetch = jest.fn().mockResolvedValueOnce(reply(401)).mockResolvedValueOnce(reply(200));

    const res = await apiFetch("/api/dashboard/me", { headers: { Authorization: "Bearer old" } });

    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(sentAuth(1)).toBe("Bearer new");
  });

  it("uses the saved token when a screen sends a blank one (its token hadn't loaded yet)", async () => {
    mockGetToken.mockResolvedValue("tok-1");
    global.fetch = jest.fn().mockResolvedValue(reply(200));

    await apiFetch("/api/users/u1/profile", { headers: { Authorization: "Bearer " } });
    await apiFetch("/api/users/u1/profile", { headers: { Authorization: "Bearer null" } });

    expect(sentAuth(0)).toBe("Bearer tok-1");
    expect(sentAuth(1)).toBe("Bearer tok-1");
  });

  it("signs the patient out when the session can't be renewed", async () => {
    const ended = jest.fn();
    setSessionEndedHandler(ended);
    mockGetToken.mockResolvedValue("old");
    mockRefresh.mockResolvedValue({ status: "expired" });
    global.fetch = jest.fn().mockResolvedValue(reply(401));

    const res = await apiFetch("/api/dashboard/me");

    expect(res.status).toBe(401);
    expect(ended).toHaveBeenCalledTimes(1);
  });

  it("keeps the session when renewal is only unavailable (offline)", async () => {
    const ended = jest.fn();
    setSessionEndedHandler(ended);
    mockGetToken.mockResolvedValue("old");
    mockRefresh.mockResolvedValue({ status: "unavailable" });
    global.fetch = jest.fn().mockResolvedValue(reply(401));

    await apiFetch("/api/dashboard/me");

    expect(ended).not.toHaveBeenCalled();
  });

  it("labels a text body as JSON, so the server can read it (HL-077)", async () => {
    mockGetToken.mockResolvedValue("tok-1");
    global.fetch = jest.fn().mockResolvedValue(reply(200));

    await apiFetch("/api/notifications/push-token", { method: "POST", body: JSON.stringify({ token: "ExponentPushToken[x]" }) });

    const init = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("keeps a caller's own content type and adds none without a text body", async () => {
    mockGetToken.mockResolvedValue("tok-1");
    global.fetch = jest.fn().mockResolvedValue(reply(200));

    await apiFetch("/api/x", { method: "POST", headers: { "content-type": "text/csv" }, body: "a,b" });
    await apiFetch("/api/y", { method: "GET" });

    const first = (global.fetch as jest.Mock).mock.calls[0][1].headers as Record<string, string>;
    const second = (global.fetch as jest.Mock).mock.calls[1][1].headers as Record<string, string>;
    expect(first["content-type"]).toBe("text/csv");
    expect(first["Content-Type"]).toBeUndefined();
    expect(second["Content-Type"]).toBeUndefined();
  });
});
