import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Activity, User, HeartPulse, Stethoscope, 
  Apple, Flame, Moon, Clock, AlertTriangle, ShieldCheck 
} from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout";
import { useApiQuery } from "../../../hooks/useApiQuery";
import LoadError from "../../../components/ui/LoadError";
import { useAuth } from "../../../contexts/useAuth";
import { formatUserRef } from "../../../utils/formatUserRef";
import { UI, FONTS } from "../../../styles/tokens";
import { StatusBadge } from "../../../styles/designSystem";

const normalizeHssTier = (score, tier) => {
  if (score !== undefined && score !== null) {
    if (score >= 80) return "Stable";
    if (score >= 60) return "Moderate";
    if (score >= 50) return "Elevated Risk";
    return "Critical";
  }
  if (!tier) return "N/A";
  const t = tier.toLowerCase();
  if (t.includes("low")) return "Stable";
  if (t.includes("medium") || t.includes("mid") || t.includes("moderate")) return "Moderate";
  if (t.includes("high") || t.includes("elevated")) return "Elevated Risk";
  if (t.includes("critical")) return "Critical";
  return tier;
};

const UserWellnessProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUserRole = user?.role || "admin";
  const [activeTab, setActiveTab] = useState("overview");

  const profileQuery = useApiQuery(`/api/users/${id}/profile`);
  // The timeline is extra: if it can't load, the tab just shows no events
  const timelineQuery = useApiQuery(`/api/admin/users/${id}/timeline`);
  const data = profileQuery.data ?? null;
  const timeline = timelineQuery.data || [];

  if (profileQuery.isPending) {
    return (
      <AdminLayout>
        <div className={UI.page.container} style={{ fontFamily: FONTS.sans }}>
          <div className="flex items-center gap-2 mb-6 text-ds-steel">
            <ArrowLeft size={16} />
            <span className="text-xs uppercase tracking-widest font-semibold">Loading Profile...</span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // A real "not found" keeps its message; anything else (network, server) can be retried
  if (profileQuery.isError && profileQuery.error?.status !== 404) {
    return (
      <AdminLayout>
        <div className={UI.page.container} style={{ fontFamily: FONTS.sans }}>
          <LoadError what="this profile" onRetry={profileQuery.refetch} />
        </div>
      </AdminLayout>
    );
  }

  if (!data) {
    return (
      <AdminLayout>
        <div className={UI.page.container} style={{ fontFamily: FONTS.sans }}>
          <div className="bg-ds-canvas p-8 rounded-xl border border-ds-hairline flex flex-col items-center justify-center text-center ">
            <AlertTriangle size={32} className="mb-3 text-ds-danger" />
            <h2 className="text-xl font-medium text-ds-ink" style={{ fontFamily: FONTS.serif }}>User Not Found</h2>
            <p className="text-sm mt-1 text-ds-slate">The requested wellness profile could not be located.</p>
            <button onClick={() => navigate(-1)} className={`mt-4 ${UI.button.primary}`}>
              Go Back
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const { profile, baselines } = data;

  const tabs = [
    { id: "overview", label: "Overview", icon: <User size={15} /> },
    { id: "biometrics", label: "Biometrics & Goals", icon: <Activity size={15} /> },
    { id: "lifestyle", label: "Lifestyle & Diet", icon: <Apple size={15} /> },
    { id: "baselines", label: "Health Baselines", icon: <HeartPulse size={15} /> },
    { id: "timeline", label: "Health Timeline", icon: <Clock size={15} /> }
  ];

  return (
    <AdminLayout>
      <div className={UI.page.container} style={{ fontFamily: FONTS.sans }}>
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-ds-slate hover:text-ds-ink transition-colors mb-5 group w-fit cursor-pointer text-[12px] font-semibold"
        >
          <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Directory</span>
        </button>

        {/* Main Profile Header Card */}
        <div className="bg-ds-canvas rounded-xl p-6 border border-ds-hairline mb-6 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between relative text-ds-ink">
          <div className="flex items-center gap-4.5">
            <div className="w-16 h-16 rounded-xl bg-ds-tint text-ds-on-tint border border-ds-tint flex items-center justify-center text-2xl font-bold ">
              {profile.first_name ? profile.first_name.charAt(0) : "P"}
            </div>
            <div>
              <h1 className="text-2xl font-medium text-ds-ink tracking-tight m-0" style={{ fontFamily: FONTS.serif }}>
                User {formatUserRef(profile.id)}
              </h1>
              <p className="text-ds-slate text-[12.5px] mt-0.5">Anonymized patient telemetry profile</p>
              <div className="flex items-center gap-2.5 mt-2">
                <StatusBadge status={profile.account_status} label={profile.account_status} dot={true} />
                <span className="text-[11.5px] text-ds-steel flex items-center gap-1">
                  <Clock size={12} /> Registered: {new Date(profile.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Open Case Review (Authorized Roles Only) */}
          {(currentUserRole === "super_admin" || currentUserRole === "admin" || currentUserRole === "medical_expert") && (
            <button
              onClick={() => navigate(`/cases?patient_id=${profile.id}`)}
              className={UI.button.primary}
            >
              <Stethoscope size={14} /> Open Case Review
            </button>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:w-60 shrink-0">
            <div className="bg-ds-canvas rounded-xl border border-ds-hairline p-1.5 sticky top-6 space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-[8px] text-[12.5px] font-semibold transition-colors cursor-pointer text-left ${
                    activeTab === tab.id 
                    ? "bg-ds-tint text-ds-on-tint " 
                    : "text-ds-slate hover:bg-ds-surface hover:text-ds-ink"
                  }`}
                >
                  <div className={activeTab === tab.id ? "text-white" : "text-ds-slate"}>
                    {tab.icon}
                  </div>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            
            {/* OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h2 className="text-[17px] font-semibold text-ds-ink mb-2" style={{ fontFamily: FONTS.serif }}>User Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-ds-canvas p-5 rounded-xl border border-ds-hairline ">
                    <h3 className="text-[11px] uppercase tracking-wider text-ds-steel font-semibold mb-3">Privacy Shield</h3>
                    <div className="space-y-3">
                      <div className="bg-ds-surface p-3.5 rounded-[8px] border border-ds-hairline flex items-start gap-2.5">
                        <AlertTriangle size={15} className="text-ds-warm-text shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[12.5px] font-semibold text-ds-ink">Anonymized for Privacy</p>
                          <p className="text-[11.5px] text-ds-slate leading-relaxed mt-0.5">
                            Direct identifiers are shielded to comply with clinical privacy regulations. You may only view telemetry relevant for medical decision support.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-ds-canvas p-5 rounded-xl border border-ds-hairline ">
                    <h3 className="text-[11px] uppercase tracking-wider text-ds-steel font-semibold mb-3">Engagement</h3>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[11px] text-ds-steel uppercase tracking-wider mb-1 font-semibold">Onboarding Status</p>
                        <p className="font-semibold text-ds-ink capitalize text-[15px]">{profile.onboarding_status || "Completed"}</p>
                      </div>
                      <Activity size={22} className="text-ds-steel" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* BIOMETRICS */}
            {activeTab === "biometrics" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h2 className="text-[17px] font-semibold text-ds-ink mb-2" style={{ fontFamily: FONTS.serif }}>Biometrics & Goals</h2>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-4">
                  <div className="bg-ds-canvas p-4 rounded-xl border border-ds-hairline flex flex-col justify-center items-center text-center ">
                    <p className="text-[11px] text-ds-steel uppercase tracking-wider font-semibold mb-1">Height</p>
                    <p className="text-[22px] font-medium text-ds-ink" style={{ fontFamily: FONTS.serif }}>{profile.height_cm} <span className="text-[12px] text-ds-steel font-normal">cm</span></p>
                  </div>
                  <div className="bg-ds-canvas p-4 rounded-xl border border-ds-hairline flex flex-col justify-center items-center text-center ">
                    <p className="text-[11px] text-ds-steel uppercase tracking-wider font-semibold mb-1">Weight</p>
                    <p className="text-[22px] font-medium text-ds-ink" style={{ fontFamily: FONTS.serif }}>{profile.weight_kg} <span className="text-[12px] text-ds-steel font-normal">kg</span></p>
                  </div>
                  <div className="bg-ds-canvas p-4 rounded-xl border border-ds-hairline flex flex-col justify-center items-center text-center ">
                    <p className="text-[11px] text-ds-steel uppercase tracking-wider font-semibold mb-1">Sex</p>
                    <p className="text-[20px] font-medium text-ds-ink capitalize" style={{ fontFamily: FONTS.serif }}>{profile.sex || "N/A"}</p>
                  </div>
                  <div className="bg-ds-canvas p-4 rounded-xl border border-ds-hairline flex flex-col justify-center items-center text-center ">
                    <p className="text-[11px] text-ds-steel uppercase tracking-wider font-semibold mb-1">Age</p>
                    <p className="text-[22px] font-medium text-ds-ink" style={{ fontFamily: FONTS.serif }}>
                      {profile.date_of_birth ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear() : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="bg-ds-canvas p-5 rounded-xl border border-ds-hairline ">
                  <h3 className="text-[11px] uppercase tracking-wider text-ds-steel font-semibold mb-3 flex items-center gap-1.5">
                    <Flame size={13} className="text-ds-primary" /> Primary Health Goals
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.health_goals && profile.health_goals.length > 0 ? (
                      profile.health_goals.map(goal => (
                        <span key={goal} className="px-3 py-1.5 bg-ds-surface border border-ds-hairline rounded-[6px] text-[12px] font-semibold text-ds-ink capitalize">
                          {goal}
                        </span>
                      ))
                    ) : (
                      <p className="text-ds-steel text-[12px]">No specific health goals logged.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* LIFESTYLE & DIET */}
            {activeTab === "lifestyle" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h2 className="text-[17px] font-semibold text-ds-ink mb-2" style={{ fontFamily: FONTS.serif }}>Lifestyle & Diet Profile</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-ds-canvas p-5 rounded-xl border border-ds-hairline ">
                    <h3 className="text-[11px] uppercase tracking-wider text-ds-steel font-semibold mb-4 flex items-center gap-1.5">
                      <Moon size={13} className="text-ds-charcoal" /> Lifestyle Habits
                    </h3>
                    {baselines?.lifestyle ? (
                      <div className="space-y-2.5 text-[12.5px]">
                        <div className="flex justify-between items-center py-1.5 border-b border-ds-hairline">
                          <span className="font-medium text-ds-slate">Smoking Status</span>
                          <span className="font-semibold text-ds-ink capitalize">{baselines.lifestyle.smoking_status}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-ds-hairline">
                          <span className="font-medium text-ds-slate">Avg. Sleep</span>
                          <span className="font-semibold text-ds-ink">{baselines.lifestyle.avg_sleep_hours} Hours</span>
                        </div>
                        {baselines.lifestyle.family_history !== undefined && (
                          <div className="flex justify-between items-center py-1.5">
                            <span className="font-medium text-ds-slate">Family History</span>
                            <span className="font-semibold text-ds-ink">{baselines.lifestyle.family_history ? "Yes" : "No"}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-ds-steel text-[12px]">No lifestyle baseline available.</p>
                    )}
                  </div>

                  <div className="bg-ds-canvas p-5 rounded-xl border border-ds-hairline ">
                    <h3 className="text-[11px] uppercase tracking-wider text-ds-steel font-semibold mb-4 flex items-center gap-1.5">
                      <Apple size={13} className="text-ds-primary" /> Dietary Baseline
                    </h3>
                    {baselines?.dietary ? (
                      <div className="space-y-2.5 text-[12.5px]">
                        <div className="flex justify-between items-center py-1.5 border-b border-ds-hairline">
                          <span className="font-medium text-ds-slate">Dietary Practice</span>
                          <span className="font-semibold text-ds-ink">{baselines.dietary.dietary_practice}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-ds-hairline">
                          <span className="font-medium text-ds-slate">Sodium Frequency</span>
                          <span className="font-semibold text-ds-ink capitalize">{baselines.dietary.sodium_frequency}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5">
                          <span className="font-medium text-ds-slate">Allergies</span>
                          <span className="font-semibold text-ds-ink">
                            {baselines.dietary.allergies?.join(', ') || "None"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-ds-steel text-[12px]">No dietary baseline available.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* HEALTH BASELINES */}
            {activeTab === "baselines" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h2 className="text-[17px] font-semibold text-ds-ink mb-2" style={{ fontFamily: FONTS.serif }}>Health Baselines</h2>
                {baselines?.clinical ? (
                  <>
                    <div className="bg-ds-canvas p-5 rounded-xl border border-ds-hairline mb-4 ">
                      <h3 className="text-[11px] uppercase tracking-wider text-ds-steel font-semibold mb-3">Core Vitals</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-[11px] text-ds-steel uppercase tracking-wider mb-1 font-semibold">Resting BP</p>
                          <p className="text-[20px] font-medium text-ds-ink" style={{ fontFamily: FONTS.serif }}>{baselines.clinical.resting_bp_mmhg || "--"} <span className="text-[11px] text-ds-steel font-normal">mmHg</span></p>
                        </div>
                        <div>
                          <p className="text-[11px] text-ds-steel uppercase tracking-wider mb-1 font-semibold">Max HR</p>
                          <p className="text-[20px] font-medium text-ds-ink" style={{ fontFamily: FONTS.serif }}>{baselines.clinical.max_heart_rate_bpm || "--"} <span className="text-[11px] text-ds-steel font-normal">bpm</span></p>
                        </div>
                        <div>
                          <p className="text-[11px] text-ds-steel uppercase tracking-wider mb-1 font-semibold">Cholesterol</p>
                          <p className="text-[20px] font-medium text-ds-ink" style={{ fontFamily: FONTS.serif }}>{baselines.clinical.serum_cholesterol || "--"} <span className="text-[11px] text-ds-steel font-normal">mg/dL</span></p>
                        </div>
                        <div>
                          <p className="text-[11px] text-ds-steel uppercase tracking-wider mb-1 font-semibold">Fasting Blood Sugar</p>
                          <p className="text-[18px] font-medium text-ds-ink" style={{ fontFamily: FONTS.serif }}>{baselines.clinical.fasting_blood_sugar ? "Elevated" : "Normal"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-ds-canvas p-5 rounded-xl border border-ds-hairline ">
                        <h3 className="text-[11px] uppercase tracking-wider text-ds-steel font-semibold mb-3">Reported Conditions</h3>
                        {baselines.clinical.diagnosed_conditions && baselines.clinical.diagnosed_conditions.length > 0 ? (
                          <ul className="space-y-1.5">
                            {baselines.clinical.diagnosed_conditions.map((cond, i) => (
                              <li key={i} className="flex items-center gap-2 text-[12.5px] font-semibold text-ds-ink before:content-[''] before:w-1.5 before:h-1.5 before:bg-ds-primary before:rounded-full capitalize">
                                {cond}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-[12px] text-ds-steel">None reported.</p>
                        )}
                      </div>
                      <div className="bg-ds-canvas p-5 rounded-xl border border-ds-hairline ">
                        <h3 className="text-[11px] uppercase tracking-wider text-ds-steel font-semibold mb-3">Health Flags</h3>
                        <div className="space-y-2 text-[12.5px]">
                          <div className="flex justify-between items-center py-1 border-b border-ds-hairline">
                            <span className="font-medium text-ds-slate">On Medication</span>
                            <span className="font-semibold text-ds-ink">{baselines.clinical.on_medication ? "Yes" : "No"}</span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-ds-hairline">
                            <span className="font-medium text-ds-slate">Chest Pain Type</span>
                            <span className="font-semibold text-ds-ink">{baselines.clinical.chest_pain_type || "None"}</span>
                          </div>
                          <div className="flex justify-between items-center py-1">
                            <span className="font-medium text-ds-slate">Exercise Angina</span>
                            <span className="font-semibold text-ds-ink">{baselines.clinical.exercise_angina ? "Yes" : "No"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-ds-canvas p-8 rounded-xl border border-ds-hairline flex flex-col items-center text-center ">
                    <Stethoscope size={24} className="text-ds-steel mb-2" />
                    <p className="text-ds-steel text-[12px] font-medium">No health baselines recorded yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* HEALTH TIMELINE */}
            {activeTab === "timeline" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h2 className="text-[17px] font-semibold text-ds-ink mb-2 flex items-center gap-2" style={{ fontFamily: FONTS.serif }}>
                  <Clock size={16} className="text-ds-primary" />
                  Chronological Health Timeline
                </h2>
                
                <div className="bg-ds-canvas p-6 rounded-xl border border-ds-hairline relative">
                  {timeline && timeline.length > 0 ? (
                    <div className="relative border-l border-ds-hairline ml-3 md:ml-4 space-y-6 pb-2">
                      {timeline.map((item, index) => {
                        const normalizeTimelineType = (type) => {
                          if (!type) return "";
                          const lower = type.toLowerCase();
                          if (lower === "vitals") return "vital";
                          if (lower === "symptoms") return "symptom";
                          return lower;
                        };
                        const normalizedType = normalizeTimelineType(item.type);

                        let iconColor = "bg-ds-surface text-ds-slate border-ds-hairline";
                        let Icon = Activity;
                        let typeLabel = "Log";
                        
                        if (normalizedType === "vital") {
                          iconColor = "bg-ds-rose text-ds-ink border-ds-rose";
                          Icon = HeartPulse;
                          typeLabel = "Vitals";
                        } else if (normalizedType === "symptom") {
                          iconColor = "bg-ds-yellow text-ds-warm-text border-ds-yellow-bold";
                          Icon = AlertTriangle;
                          typeLabel = "Symptoms";
                        } else if (normalizedType === "meal") {
                          iconColor = "bg-ds-mint text-ds-charcoal border-ds-mint";
                          Icon = Apple;
                          typeLabel = "Meal";
                        } else if (normalizedType === "exercise") {
                          iconColor = "bg-ds-tint text-ds-on-tint border-ds-tint";
                          Icon = Flame;
                          typeLabel = "Exercise";
                        } else if (normalizedType === "sleep") {
                          iconColor = "bg-ds-surface text-ds-ink border-ds-hairline";
                          Icon = Moon;
                          typeLabel = "Sleep";
                        } else if (normalizedType === "hss") {
                          iconColor = "bg-ds-tint text-ds-on-tint border-ds-tint";
                          Icon = ShieldCheck;
                          typeLabel = "HSS Update";
                        }

                        return (
                          <div key={index} className="relative pl-6 md:pl-8">
                            {/* Timeline Dot */}
                            <div className={`absolute -left-[17px] top-1 w-8 h-8 rounded-full border flex items-center justify-center ${iconColor}`}>
                              <Icon size={14} />
                            </div>
                            
                            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 mb-1.5">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-ds-steel">{typeLabel}</span>
                              <span className="text-[11.5px] text-ds-steel font-medium">{new Date(item.timestamp).toLocaleString()}</span>
                            </div>
                            
                            <div className="bg-ds-surface/60 p-3.5 rounded-[8px] border border-ds-hairline">
                              {normalizedType === "vital" && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  {item.data.systolic && item.data.diastolic && (
                                    <div>
                                      <p className="text-[11px] text-ds-steel uppercase tracking-wider mb-0.5 font-semibold">Blood Pressure</p>
                                      <p className="text-[13px] font-bold text-ds-ink">{item.data.systolic}/{item.data.diastolic} <span className="text-[11px] text-ds-steel font-normal">mmHg</span></p>
                                    </div>
                                  )}
                                  {item.data.heart_rate && (
                                    <div>
                                      <p className="text-[11px] text-ds-steel uppercase tracking-wider mb-0.5 font-semibold">Heart Rate</p>
                                      <p className="text-[13px] font-bold text-ds-ink">{item.data.heart_rate} <span className="text-[11px] text-ds-steel font-normal">bpm</span></p>
                                    </div>
                                  )}
                                  {item.data.blood_sugar && (
                                    <div>
                                      <p className="text-[11px] text-ds-steel uppercase tracking-wider mb-0.5 font-semibold">Blood Sugar</p>
                                      <p className="text-[13px] font-bold text-ds-ink">{item.data.blood_sugar} <span className="text-[11px] text-ds-steel font-normal">mg/dL</span></p>
                                    </div>
                                  )}
                                  {item.data.weight_kg && (
                                    <div>
                                      <p className="text-[11px] text-ds-steel uppercase tracking-wider mb-0.5 font-semibold">Weight</p>
                                      <p className="text-[13px] font-bold text-ds-ink">{item.data.weight_kg} <span className="text-[11px] text-ds-steel font-normal">kg</span></p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {normalizedType === "symptom" && (
                                <div>
                                  <p className="text-[11px] text-ds-steel uppercase tracking-wider mb-0.5 font-semibold">Symptoms Reported</p>
                                  <p className="text-[13px] font-bold text-ds-ink capitalize">{item.data.symptoms?.join(", ") || "No specific symptoms"}</p>
                                  {item.data.severity_map && Object.keys(item.data.severity_map).length > 0 && (
                                    <p className="text-[11.5px] text-ds-slate mt-1 font-medium">
                                      Severity: {Object.entries(item.data.severity_map).map(([k, v]) => `${k.replace('_', ' ')} (${v})`).join(", ")}
                                    </p>
                                  )}
                                  {item.data.context && <p className="text-[11.5px] text-ds-slate mt-1.5 italic">Context: "{item.data.context}"</p>}
                                </div>
                              )}

                              {normalizedType === "meal" && (
                                <div>
                                  <p className="text-[13px] font-bold text-ds-ink mb-0.5">{item.data.meal_name || "Logged Meal"}</p>
                                  <p className="text-[11.5px] text-ds-slate font-medium">
                                    {item.data.calories ? `${item.data.calories} kcal` : ""}
                                    {item.data.calories && item.data.sodium_mg ? " | " : ""}
                                    {item.data.sodium_mg ? `Sodium: ${item.data.sodium_mg} mg` : ""}
                                  </p>
                                </div>
                              )}

                              {normalizedType === "exercise" && (
                                <div>
                                  <p className="text-[13px] font-bold text-ds-ink mb-0.5">{item.data.routine_name || "Custom Exercise"}</p>
                                  <div className="flex gap-3 mt-1 text-[11.5px] text-ds-slate">
                                    <p><span className="font-bold text-ds-ink">{item.data.duration_minutes}</span> min duration</p>
                                    {item.data.status && (
                                      <p className="capitalize">Status: <span className="font-bold text-ds-ink">{item.data.status}</span></p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {normalizedType === "sleep" && (
                                <div>
                                  <div className="flex gap-3 text-[11.5px] text-ds-slate">
                                    <p><span className="font-bold text-ds-ink">{item.data.duration_hours}</span> hours slept</p>
                                    {item.data.quality && (
                                      <p className="capitalize">Quality: <span className="font-bold text-ds-ink">{item.data.quality}</span></p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {normalizedType === "hss" && (
                                <div className="flex items-center gap-3">
                                  <div>
                                    <p className="text-[11px] text-ds-steel uppercase tracking-wider mb-0.5 font-semibold">HSS Tier Updated</p>
                                    <p className="text-[13px] font-bold text-ds-ink">{normalizeHssTier(item.data.score, item.data.tier)}</p>
                                  </div>
                                  <div className="h-6 w-px bg-ds-hairline"></div>
                                  <div>
                                    <p className="text-[11px] text-ds-steel uppercase tracking-wider mb-0.5 font-semibold">Score</p>
                                    <p className="text-[13px] font-bold text-ds-charcoal">{item.data.score}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Clock size={28} className="text-ds-steel mb-2" />
                      <h3 className="text-[13px] font-semibold text-ds-ink">No Timeline Data</h3>
                      <p className="text-[11.5px] text-ds-slate mt-1 max-w-sm">
                        There are no recent logs, vital readings, or HSS updates recorded for this user.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default UserWellnessProfile;
