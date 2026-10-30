import { Bug, Lightbulb, UserCircle, HelpCircle } from "lucide-react";

const PILL =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold leading-none whitespace-nowrap";

const getCategoryConfig = (category) => {
  switch (category) {
    case "Bug Report":
      return {
        label: "Bug Report",
        icon: Bug,
        iconCls: "text-cal-error",
        className: "border-cal-error/25 bg-cal-error/10 text-cal-ink",
      };
    case "UI/UX Suggestion":
      return {
        label: "Suggestion",
        icon: Lightbulb,
        iconCls: "text-cal-warning",
        className: "border-cal-warning/35 bg-cal-warning/15 text-cal-ink",
      };
    case "Account Issue":
      return {
        label: "Account Issue",
        icon: UserCircle,
        iconCls: "text-cal-badge-violet",
        className: "border-cal-badge-violet/30 bg-cal-badge-violet/15 text-cal-ink",
      };
    default:
      return {
        label: "Question",
        icon: HelpCircle,
        iconCls: "text-cal-brand-accent",
        className: "border-cal-brand-accent/25 bg-cal-brand-accent/10 text-cal-ink",
      };
  }
};

const FeedbackCategoryBadge = ({ category }) => {
  const config = getCategoryConfig(category);
  const Icon = config.icon;
  return (
    <span className={`${PILL} ${config.className}`}>
      <Icon size={11} className={config.iconCls} aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
};

export default FeedbackCategoryBadge;
