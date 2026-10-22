import { apiFetch } from "../lib/api";
import type { FoodItem } from "./foodLogging";
/**
 * HL-032: the three places food search looks, each returning FoodItems with their
 * source, so the screens can show where a food came from and treat it the right way.
 */

type RawRecipe = {
  id: string;
  name?: string;
  image_url?: string | null;
  sodium_mg?: number | null;
  calories?: number | null;
  saturated_fat_g?: number | null;
  fiber_g?: number | null;
  cholesterol_mg?: number | null;
};

type RawMealLog = {
  id: string;
  meal_name?: string;
  portion?: number | null;
  sodium_mg?: number | null;
  calories?: number | null;
  saturated_fat_g?: number | null;
  fiber_g?: number | null;
  cholesterol_mg?: number | null;
  image_url?: string | null;
  recipe_id?: string | null;
  logged_at?: string | null;
};

type RawOffProduct = {
  id?: string;
  code?: string;
  product_name?: string;
  brands?: string;
  image_url?: string;
  image_front_url?: string;
  nutriments?: Record<string, number | string | undefined>;
};

const n = (v: unknown) => {
  const x = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(x) && x > 0 ? x : 0;
};

/** The patient's last five different meals. Values are per portion they logged, so 1 serving = last time. */
export async function fetchRecentMeals(userId: string, token: string | null, signal?: AbortSignal): Promise<FoodItem[]> {
  const res = await apiFetch(`/api/meals/${userId}?page=1&page_size=50`, {
    headers: { Authorization: `Bearer ${token || ""}` },
    signal,
  });
  if (!res.ok) throw new Error("Could not load recent meals");
  const body = await res.json();
  const logs: RawMealLog[] = body.data ?? body;
  const seen = new Set<string>();
  const items: FoodItem[] = [];
  for (const log of logs) {
    const name = (log.meal_name || "").trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    const portion = n(log.portion) || 1;
    items.push({
      id: `recent-${log.id}`,
      source: "recent",
      name,
      image_url: log.image_url,
      recipe_id: log.recipe_id ?? undefined,
      logged_at: log.logged_at ?? undefined,
      base: {
        sodium_mg: n(log.sodium_mg) / portion,
        calories: n(log.calories) / portion,
        saturated_fat_g: n(log.saturated_fat_g) / portion,
        fiber_g: n(log.fiber_g) / portion,
        cholesterol_mg: n(log.cholesterol_mg) / portion,
      },
    });
    if (items.length === 5) break;
  }
  return items;
}

/** Published HeartLink recipes; with an empty query, the ones recommended for this patient come first. */
export async function fetchRecipes(query: string, token: string | null, signal?: AbortSignal): Promise<FoodItem[]> {
  const res = await apiFetch(`/api/meals/search?q=${encodeURIComponent(query)}`, { signal });
  if (!res.ok) throw new Error("Could not load HeartLink recipes");
  const recipes: RawRecipe[] = await res.json();

  let recommended = new Set<string>();
  if (!query) {
    try {
      const recoRes = await apiFetch(`/api/meals/recommendations/me`, {
        headers: { Authorization: `Bearer ${token || ""}` },
        signal,
      });
      if (recoRes.ok) {
        const recos: { id: string }[] = await recoRes.json();
        recommended = new Set(recos.map((r) => String(r.id)));
      }
    } catch {
      // Recommendations only change the order; the recipes still show without them.
    }
  }

  return recipes
    .map((r) => ({
      id: String(r.id),
      source: "recipe" as const,
      name: r.name || "Recipe",
      image_url: r.image_url,
      recipe_id: String(r.id),
      recommended: recommended.has(String(r.id)),
      base: {
        sodium_mg: n(r.sodium_mg),
        calories: n(r.calories),
        saturated_fat_g: n(r.saturated_fat_g),
        fiber_g: n(r.fiber_g),
        cholesterol_mg: n(r.cholesterol_mg),
      },
    }))
    .sort((a, b) => Number(b.recommended) - Number(a.recommended));
}

/**
 * Packaged foods from Open Food Facts. Its values are per 100 g, which is how the
 * review screen treats them. Entries without a name, a picture or brand, calories
 * and a believable sodium value are left out.
 */
export async function searchPackagedFoods(query: string, signal?: AbortSignal): Promise<FoodItem[]> {
  if (!query) return [];
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=15`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("Could not search packaged foods");
  const data: { products?: RawOffProduct[] } = await res.json();

  return (data.products || [])
    .filter((p) => {
      const name = (p.product_name || "").trim();
      if (name.length < 3 || /^\d+$/.test(name)) return false;
      if (!(p.brands && p.brands.trim()) && !(p.image_url || p.image_front_url)) return false;
      const kcal = p.nutriments?.["energy-kcal"];
      const sodiumG = p.nutriments?.sodium;
      return typeof kcal === "number" && typeof sodiumG === "number" && sodiumG >= 0 && sodiumG <= 10;
    })
    .map((p) => ({
      id: `off-${p.code || p.id || p.product_name}`,
      source: "packaged" as const,
      name: (p.product_name || "").trim(),
      image_url: p.image_front_url || p.image_url || null,
      base: {
        // Open Food Facts gives sodium in grams per 100 g.
        sodium_mg: Math.round(n(p.nutriments?.sodium) * 1000),
        calories: Math.round(n(p.nutriments?.["energy-kcal"])),
        saturated_fat_g: n(p.nutriments?.["saturated-fat"]),
        fiber_g: n(p.nutriments?.fiber),
        // Cholesterol is in grams per 100 g too, and often missing: then it isn't counted.
        ...(typeof p.nutriments?.cholesterol === "number" ? { cholesterol_mg: Math.round(n(p.nutriments?.cholesterol) * 1000) } : {}),
      },
    }));
}
