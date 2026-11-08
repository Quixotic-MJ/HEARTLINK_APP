import { bandName, light, scoreBand } from "../theme";

describe("what patients read for each score level (HL-091)", () => {
  it("gives every stored level its wellness name", () => {
    expect(bandName("Stable")).toBe("On track");
    expect(bandName("Moderate")).toBe("Room to improve");
    expect(bandName("Elevated Risk")).toBe("Needs attention");
    expect(bandName("Critical")).toBe("Get checked");
  });

  it("leaves anything else as it is", () => {
    expect(bandName("Score unavailable")).toBe("Score unavailable");
  });

  it("keeps the same score cut-offs", () => {
    expect(scoreBand(80, light).label).toBe("On track");
    expect(scoreBand(79, light).label).toBe("Room to improve");
    expect(scoreBand(59, light).label).toBe("Needs attention");
    expect(scoreBand(49, light).label).toBe("Get checked");
  });
});
