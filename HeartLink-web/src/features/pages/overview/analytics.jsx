import { Link } from "react-router-dom";
import { ArrowRight, ChartColumn } from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout";
import { PageHeader } from "../../../styles/designSystem";
import { UI } from "../../../styles/tokens";

export default function Analytics() {
  return (
    <AdminLayout>
      <div className={UI.page.container}>
        <PageHeader
          eyebrow="General Wellness workspace"
          title="Analytics"
          description="Operational reporting is not available yet."
        />
        <section className={UI.card.root} aria-labelledby="analytics-state">
          <div className="max-w-2xl space-y-4 p-6 sm:p-8">
            <ChartColumn
              size={28}
              className="text-cal-muted"
              aria-hidden="true"
            />
            <h2 id="analytics-state" className="text-xl font-semibold">
              A clearer view, when the data is ready
            </h2>
            <p className="text-sm leading-relaxed text-cal-muted">
              The previous health-score and symptom reports are retired from
              this website. Current account and content workflow counts are
              available in the operational overview.
            </p>
            <Link to="/dashboard" className={UI.button.primary + " w-fit"}>
              Open overview <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
