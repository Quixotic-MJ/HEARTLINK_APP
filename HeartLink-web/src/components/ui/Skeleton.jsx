import React from "react";

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={`relative overflow-hidden bg-slate-100 rounded-xl ${className}`}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer" />
    </div>
  );
}
