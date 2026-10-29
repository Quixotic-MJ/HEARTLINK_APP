import { useState } from "react";
import { Utensils } from "lucide-react";

export const RecipeImage = ({
  src,
  alt = "Recipe image",
  className = "w-full h-full object-cover",
  fallbackIconSize = 15,
  containerClassName = "flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-cal-hairline bg-cal-surface-soft",
  fallbackIconClassName = "text-cal-muted",
}) => {
  const [failedSrc, setFailedSrc] = useState(null);
  const hasError = !!src && failedSrc === src;

  const showFallback = !src || hasError;

  if (showFallback) {
    return (
      <div
        className={containerClassName}
        title={alt}
        role="img"
        aria-label={alt}
      >
        <Utensils size={fallbackIconSize} className={fallbackIconClassName} />
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      <img
        src={src}
        alt={alt}
        className={className}
        onError={() => setFailedSrc(src)}
      />
    </div>
  );
};

export default RecipeImage;
