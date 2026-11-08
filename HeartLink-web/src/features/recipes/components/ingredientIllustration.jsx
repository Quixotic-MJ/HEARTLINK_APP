import { Utensils } from "lucide-react";
import { ingredientArtwork } from "../ingredientArtwork.js";
import rice from "../../../assets/ingredients/rice.svg";
import onion from "../../../assets/ingredients/onion.svg";
import garlic from "../../../assets/ingredients/garlic.svg";
import carrot from "../../../assets/ingredients/carrot.svg";
import tomato from "../../../assets/ingredients/tomato.svg";
import herbs from "../../../assets/ingredients/herbs.svg";
import egg from "../../../assets/ingredients/egg.svg";
import shrimp from "../../../assets/ingredients/shrimp.svg";
import fish from "../../../assets/ingredients/fish.svg";
import chicken from "../../../assets/ingredients/chicken.svg";
import beans from "../../../assets/ingredients/beans.svg";
import potato from "../../../assets/ingredients/potato.svg";
import mushroom from "../../../assets/ingredients/mushroom.svg";
import salt from "../../../assets/ingredients/salt.svg";

const artwork = {
  rice,
  onion,
  garlic,
  carrot,
  tomato,
  herbs,
  egg,
  shrimp,
  fish,
  chicken,
  beans,
  potato,
  mushroom,
  salt,
};
export function IngredientIllustration({ name }) {
  const src = artwork[ingredientArtwork(name)];
  return src ? (
    <img src={src} alt="" aria-hidden="true" />
  ) : (
    <Utensils size={30} aria-hidden="true" className="my-1 text-cal-muted" />
  );
}
