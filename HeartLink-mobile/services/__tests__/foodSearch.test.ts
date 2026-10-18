import { fetchRecentMeals, fetchRecipes, searchPackagedFoods } from "../foodSearch";

function mockFetch(responses: Record<string, unknown>) {
  global.fetch = jest.fn(async (url: string) => {
    const key = Object.keys(responses).find((k) => url.includes(k));
    if (!key) return { ok: false, json: async () => ({}) };
    return { ok: true, json: async () => responses[key] };
  }) as unknown as typeof fetch;
}

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
});

describe("food search sources (HL-032)", () => {
  it("keeps believable Open Food Facts products and converts sodium to mg per 100 g", async () => {
    mockFetch({
      openfoodfacts: {
        products: [
          { code: "1", product_name: "Chicken nuggets", brands: "Brand", nutriments: { "energy-kcal": 270, sodium: 0.52, "saturated-fat": 3.1, fiber: 1.2 } },
          { code: "2", product_name: "12345", brands: "Brand", nutriments: { "energy-kcal": 10, sodium: 0.1 } },
          { code: "3", product_name: "No sodium value", brands: "Brand", nutriments: { "energy-kcal": 10 } },
          { code: "4", product_name: "Salt block", brands: "Brand", nutriments: { "energy-kcal": 0, sodium: 39 } },
        ],
      },
    });
    const items = await searchPackagedFoods("chicken");
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: "off-1", source: "packaged", base: { sodium_mg: 520, calories: 270 } });
  });

  it("makes the search words safe for the web address", async () => {
    mockFetch({ openfoodfacts: { products: [] } });
    await searchPackagedFoods("mac & cheese");
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain("search_terms=mac%20%26%20cheese");
  });

  it("does not search packaged foods for an empty query", async () => {
    mockFetch({});
    expect(await searchPackagedFoods("")).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("puts recommended recipes first when nothing is typed", async () => {
    mockFetch({
      "/api/meals/search": [
        { id: "a", name: "Adobo, low sodium", sodium_mg: 480, calories: 300 },
        { id: "b", name: "Tinola", sodium_mg: 420, calories: 280 },
      ],
      "/api/meals/recommendations/me": [{ id: "b" }],
    });
    const recipes = await fetchRecipes("", "token");
    expect(recipes.map((r) => r.id)).toEqual(["b", "a"]);
    expect(recipes[0]).toMatchObject({ source: "recipe", recommended: true, recipe_id: "b" });
  });

  it("turns recent meal logs into one serving each, without repeats", async () => {
    mockFetch({
      "/api/meals/u1": {
        data: [
          { id: "m1", meal_name: "Garlic rice", portion: 2, sodium_mg: 640, calories: 480 },
          { id: "m2", meal_name: "garlic rice", portion: 1, sodium_mg: 320, calories: 240 },
          { id: "m3", meal_name: "Pandesal", sodium_mg: 300, calories: 170 },
        ],
      },
    });
    const recent = await fetchRecentMeals("u1", "token");
    expect(recent.map((r) => r.name)).toEqual(["Garlic rice", "Pandesal"]);
    expect(recent[0].base.sodium_mg).toBe(320);
  });
});
