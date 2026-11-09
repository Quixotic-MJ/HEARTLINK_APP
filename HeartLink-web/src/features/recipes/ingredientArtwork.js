// Decorative matches only: never infer quantity, nutrition or an ingredient substitution.
const groups = [
  ["salt", /\b(salt|asin)\b/],
  ["garlic", /\b(garlic|bawang)\b/],
  ["onion", /\b(onion|onions|sibuyas)\b/],
  ["carrot", /\b(carrot|carrots|karot)\b/],
  ["tomato", /\b(tomato|tomatoes|kamatis)\b/],
  ["potato", /\b(potato|potatoes|patatas)\b/],
  ["mushroom", /\b(mushroom|mushrooms|kabute)\b/],
  ["egg", /\b(egg|eggs|itlog)\b/],
  ["shrimp", /\b(shrimp|prawn|prawns|hipon)\b/],
  ["fish", /\b(fish|salmon|tilapia|bangus|isda)\b/],
  ["chicken", /\b(chicken|manok)\b/],
  ["beans", /\b(bean|beans|munggo|monggo)\b/],
  ["herbs", /\b(spinach|lettuce|basil|parsley|kangkong|malunggay|pechay)\b/],
  ["rice", /^(cooked |uncooked |steamed )?(brown |white )?(rice|bigas|kanin)$/],
];

export function ingredientArtwork(name) {
  if (typeof name !== "string") return null;
  return (
    groups.find(([, match]) => match.test(name.trim().toLowerCase()))?.[0] ||
    null
  );
}
