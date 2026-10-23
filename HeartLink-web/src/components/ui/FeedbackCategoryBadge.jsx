import { Bug, Lightbulb, UserCircle, HelpCircle } from "lucide-react";

const getCategoryConfig = (category) => {
  switch (category) {
    case "Bug Report":
      return {
        label: "Bug",
        icon: Bug,
        className: "bg-ds-rose text-ds-ink border-ds-rose",
      };
    case "UI/UX Suggestion":
      return {
        label: "Suggestion",
        icon: Lightbulb,
        className: "bg-ds-yellow text-ds-warm-text border-ds-yellow-bold",
      };
    case "Account Issue":
      return {
        label: "Account",
        icon: UserCircle,
        className: "bg-ds-mint text-ds-charcoal border-ds-mint",
      };
    default:
      return {
        label: "Question",
        icon: HelpCircle,
        className: "bg-ds-surface text-ds-slate border-ds-hairline",
      };
  }
};

const FeedbackCategoryBadge = ({ category }) => {
  const config = getCategoryConfig(category);
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider border whitespace-nowrap ${config.className}`}>
      <Icon size={10} /> {config.label}
    </span>
  );
};

export default FeedbackCategoryBadge;
