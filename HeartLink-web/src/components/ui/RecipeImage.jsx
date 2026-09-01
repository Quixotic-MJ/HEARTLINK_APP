import React, { useState, useEffect } from "react";
import { Utensils } from "lucide-react";

export const RecipeImage = ({
  src,
  alt = "Recipe image",
  className = "w-full h-full object-cover",
  fallbackIconSize = 15,
  containerClassName = "w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden bg-[#21202E] border border-white/10",
  fallbackIconClassName = "text-[#E55F37]",
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

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
        onError={() => setHasError(true)}
      />
    </div>
  );
};

export default RecipeImage;
