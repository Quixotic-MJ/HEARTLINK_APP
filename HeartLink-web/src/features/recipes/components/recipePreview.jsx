import RecipeImage from "./recipeImage.jsx";
import { IngredientIllustration } from "./ingredientIllustration.jsx";

export function RecipePreview({ values, editing }) {
  const ingredients = (values.ingredients || []).filter((item) =>
    item.name?.trim(),
  );
  return (
    <aside className="content-live-preview" aria-label="Recipe preview">
      <RecipeImage
        src={values.mediaUrl}
        alt={values.name || "Recipe photograph"}
        containerClassName="content-preview-photo"
        fallbackIconSize={42}
        fallbackIconClassName="text-cal-primary"
      />
      <p className="mt-5 text-xs font-medium text-cal-muted">
        {editing ? "Unsaved preview" : "Recipe snapshot"}
      </p>
      <h4>{values.name || "Your next recipe"}</h4>
      <p className="mt-2 text-sm text-cal-muted">
        {values.category === "Others"
          ? values.categoryOther || "Other category"
          : values.category}
      </p>
      <dl className="mt-5 grid grid-cols-2 gap-3 border-y border-[var(--workspace-line)] py-4 text-sm">
        <div>
          <dt className="text-xs text-cal-muted">Preparation</dt>
          <dd className="mt-1 font-semibold">
            {values.prepTimeMinutes || "—"} min
          </dd>
        </div>
        <div>
          <dt className="text-xs text-cal-muted">Recipe yield</dt>
          <dd className="mt-1 font-semibold">
            {values.servings || "—"} servings
          </dd>
        </div>
      </dl>
      <h5 className="mt-6 text-sm font-semibold">
        Ingredients{" "}
        <span className="ml-1 font-normal text-cal-muted">
          {ingredients.length}
        </span>
      </h5>
      {ingredients.length ? (
        <ul className="ingredient-preview-grid">
          {ingredients.map((item, index) => (
            <li key={index} className="ingredient-preview-tile">
              <IngredientIllustration name={item.name} />
              <span>{item.name}</span>
              <small>
                {item.amount === null ||
                item.amount === undefined ||
                item.amount === ""
                  ? "Amount not recorded"
                  : `${item.amount} ${item.unit || ""}`.trim()}
              </small>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm leading-relaxed text-cal-muted">
          Add ingredients to see the recipe take shape. Names and quantities
          stay visible here.
        </p>
      )}
      <p className="mt-5 text-[11px] leading-relaxed text-cal-muted">
        Ingredient artwork by OpenMoji (CC BY-SA 4.0). Illustrations are
        decorative, not ingredient substitutions. Source and license links are
        in the application asset credits.
      </p>
    </aside>
  );
}
