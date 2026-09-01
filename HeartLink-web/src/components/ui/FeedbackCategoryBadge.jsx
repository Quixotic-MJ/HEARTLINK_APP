import React from "react";
import { Bug, Lightbulb, UserCircle, HelpCircle } from "lucide-react";

export const getCategoryConfig = (category) => {
  switch (category) {
    case "Bug Report":
      return {
        label: "Bug",
        icon: Bug,
        className: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
      };
    case "UI/UX Suggestion":
      return {
        label: "Suggestion",
        icon: Lightbulb,
        className: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
      };
    case "Account Issue":
      return {
        label: "Account",
        icon: UserCircle,
        className: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
      };
    default:
      return {
        label: "Question",
        icon: HelpCircle,
        className: "bg-white/5 text-slate-300 border border-white/10",
      };
  }
};

const FeedbackCategoryBadge = ({ category }) => {
  const config = getCategoryConfig(category);
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest whitespace-nowrap ${config.className}`}>
      <Icon size={10} /> {config.label}
    </span>
  );
};

export default FeedbackCategoryBadge;

