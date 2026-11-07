import { HEART_TOPICS } from "../heartBasics";

const textOf = (id: string) => HEART_TOPICS.find((t) => t.id === id)!.paragraphs.join(" ");

describe("heart basics", () => {
  it("covers the agreed topics", () => {
    expect(HEART_TOPICS.map((t) => t.id)).toEqual(["blood-pressure", "sodium", "activity", "sleep", "get-help"]);
  });

  it("gives every topic a source", () => {
    for (const topic of HEART_TOPICS) {
      expect(topic.sources.length).toBeGreaterThan(0);
      for (const source of topic.sources) expect(source.url).toMatch(/^https:\/\//);
    }
  });

  it("keeps the emergency numbers the same as the app's emergency rule", () => {
    expect(textOf("get-help")).toContain("180/120");
    expect(textOf("get-help")).toContain("90/60");
    expect(textOf("get-help")).toContain("911");
    expect(textOf("get-help")).toContain("fainting");
  });

  it("stays educational: no diagnosis, cure or dose advice", () => {
    const all = HEART_TOPICS.flatMap((t) => t.paragraphs).join(" ");
    expect(all).not.toMatch(/you have (hypertension|high blood pressure)|\bcures?\b|increase your dose|stop taking/i);
    expect(textOf("blood-pressure")).toContain("Only a health professional can diagnose");
  });
});
