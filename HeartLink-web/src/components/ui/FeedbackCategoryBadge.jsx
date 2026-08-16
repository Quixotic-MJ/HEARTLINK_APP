import React from "react";
import { Bug, Lightbulb, UserCircle, HelpCircle } from "lucide-react";

export const getCategoryConfig = (category) => {
  switch (category) {
    case "Bug Report":
      return {
        label: "Bug",
        icon: Bug,
        className: "bg-red-50 text-red-600 border border-red-200",
      };
    case "UI/UX Suggestion":
      return {
        label: "Suggestion",
        icon: Lightbulb,
        className: "bg-yellow-50 text-yellow-700 border border-yellow-200",
      };
    case "Account Issue":
      return {
        label: "Account",
        icon: UserCircle,
        className: "bg-purple-50 text-purple-700 border border-purple-200",
      };
    default:
      return {
        label: "Question",
        icon: HelpCircle,
        className: "bg-slate-50 text-slate-600 border border-slate-200",
      };
  }
};

const FeedbackCategoryBadge = ({ category }) => {
  const config = getCategoryConfig(category);
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest whitespace-nowrap ${config.className}`}>
      <Icon size={10} /> {config.label}
    </span>
  );
};

export default FeedbackCategoryBadge;
