import React from "react";
import { Bug, Lightbulb, UserCircle, HelpCircle } from "lucide-react";

export const getCategoryConfig = (category) => {
  switch (category) {
    case "Bug Report":
      return {
        label: "Bug",
        icon: Bug,
        className: "bg-[#F7E4E1] text-[#A93226] border-[#F0C4B8]",
      };
    case "UI/UX Suggestion":
      return {
        label: "Suggestion",
        icon: Lightbulb,
        className: "bg-[#F6EDDD] text-[#A9741B] border-[#EBD7B8]",
      };
    case "Account Issue":
      return {
        label: "Account",
        icon: UserCircle,
        className: "bg-[#E3EFEC] text-[#1B6E63] border-[#C5DFD8]",
      };
    default:
      return {
        label: "Question",
        icon: HelpCircle,
        className: "bg-[#EDF1EF] text-[#5C6B66] border-[#DCE3DF]",
      };
  }
};

const FeedbackCategoryBadge = ({ category }) => {
  const config = getCategoryConfig(category);
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider border whitespace-nowrap ${config.className}`}>
      <Icon size={10} /> {config.label}
    </span>
  );
};

export default FeedbackCategoryBadge;
