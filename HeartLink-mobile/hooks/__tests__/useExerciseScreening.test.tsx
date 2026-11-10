import { renderHook, act, waitFor } from "@testing-library/react-native";
import { useExerciseScreening } from "../useExerciseScreening";
import { apiFetch } from "../../lib/api";
import { createTestQueryClient, queryClientWrapper } from "../../test-utils/reactQuery";

// HL-122: the safety check must reach the server in the shape the server reads (found in the HL-137 preview check:
// wrapped in `answers` it was refused with 422, so no one could finish setup).
jest.mock("../../lib/api", () => ({ apiFetch: jest.fn() }));
jest.mock("../../contexts/UserContext", () => ({ useUser: () => ({ userId: "u1" }) }));

describe("useExerciseScreening", () => {
  it("sends the PAR-Q+ result at the top level", async () => {
    (apiFetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ state: "eligible" }) });
    const { result } = await renderHook(() => useExerciseScreening(), { wrapper: queryClientWrapper(createTestQueryClient()) });
    const answers = { parq_result: "all_no" as const, extra_check_yes: null, pregnant: false, unwell: false, declared: true };

    await act(async () => {
      result.current.save.mutate(answers);
    });

    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    const [path, init] = (apiFetch as jest.Mock).mock.calls[0];
    expect(path).toBe("/api/users/u1/exercise-screening");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual(answers);
  });
});
