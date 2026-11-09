import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import AdminLayout from "../../components/layouts/adminLayout.jsx";
import { PageHeader } from "../../styles/designSystem.jsx";
import { UI } from "../../styles/tokens.js";
import ScoreDesignPreview from "./scoreDesignPreview.jsx";

export default function Analytics() {
  return <AdminLayout><div className={`${UI.page.container} home-analytics`}>
    <PageHeader eyebrow="General Wellness workspace" title="Analytics & reporting" description="Explore the reporting design with clearly labelled synthetic examples." actions={<Link to="/dashboard" className={UI.button.secondary}>Operational overview <ArrowRight size={15} aria-hidden="true" /></Link>} />
    <ScoreDesignPreview />
    <p className="home-updated">Live account and content workflow counts remain in the operational overview. This preview does not request health analytics or calculate a score.</p>
  </div></AdminLayout>;
}
