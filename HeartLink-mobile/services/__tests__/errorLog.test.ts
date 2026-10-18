import { logAppError } from "../errorLog";

describe("logAppError (HL-024)", () => {
  it("writes one structured app_error line", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      logAppError(new TypeError("bad value"), "error_boundary");

      expect(spy).toHaveBeenCalledTimes(1);
      const [prefix, json] = spy.mock.calls[0];
      expect(prefix).toBe("[HeartLink]");
      expect(JSON.parse(json as string)).toMatchObject({
        event: "app_error",
        source: "error_boundary",
        name: "TypeError",
        message: "bad value",
      });
    } finally {
      spy.mockRestore();
    }
  });

  it("handles things that are not Error objects", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      logAppError("plain text", "global");
      expect(JSON.parse(spy.mock.calls[0][1] as string).message).toBe("plain text");
    } finally {
      spy.mockRestore();
    }
  });
});
