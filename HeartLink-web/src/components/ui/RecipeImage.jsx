import React, { useState, useEffect } from "react";
import { Utensils } from "lucide-react";

export const RecipeImage = ({
  src,
  alt = "Recipe image",
  className = "w-full h-full object-cover",
  fallbackIconSize = 14,
  containerClassName = "w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden bg-slate-100 border border-slate-200/50",
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
        style={{ backgroundColor: "rgba(15,23,42,0.04)" }}
        title={alt}
        role="img"
        aria-label={alt}
      >
        <Utensils size={fallbackIconSize} style={{ color: "#0f172a" }} />
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
