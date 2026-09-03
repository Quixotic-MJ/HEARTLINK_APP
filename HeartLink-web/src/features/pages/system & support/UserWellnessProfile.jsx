import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Activity, User, HeartPulse, Stethoscope, 
  Apple, Flame, Moon, Clock, AlertTriangle, ShieldCheck 
} from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout";
import { apiFetch } from "../../../api";
import { useAuth } from "../../../contexts/AuthContext";
import { formatUserRef } from "../../../utils/formatUserRef";
import { UI, FONTS, StatusBadge } from "../../../styles/designSystem";

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
  const [data, setData] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [profileRes, timelineRes] = await Promise.all([
          apiFetch(`/api/users/${id}/profile`),
          apiFetch(`/api/admin/users/${id}/timeline`).catch(() => [])
        ]);
        setData(profileRes);
        setTimeline(timelineRes || []);
      } catch (err) {
        console.error("Failed to fetch user profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  if (loading) {
    return (
      <AdminLayout>
        <div className={UI.page.container} style={{ fontFamily: FONTS.sans }}>
          <div className="flex items-center gap-2 mb-6 text-[#8B9893]">
            <ArrowLeft size={16} />
            <span className="text-xs uppercase tracking-widest font-semibold">Loading Profile...</span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!data) {
    return (
      <AdminLayout>
        <div className={UI.page.container} style={{ fontFamily: FONTS.sans }}>
          <div className="bg-[#FFFFFF] p-8 rounded-[10px] border border-[#DCE3DF] flex flex-col items-center justify-center text-center shadow-2xs">
            <AlertTriangle size={32} className="mb-3 text-[#A93226]" />
            <h2 className="text-xl font-medium text-[#152131]" style={{ fontFamily: FONTS.serif }}>User Not Found</h2>
            <p className="text-sm mt-1 text-[#5C6B66]">The requested wellness profile could not be located.</p>
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
          className="flex items-center gap-2 text-[#5C6B66] hover:text-[#152131] transition-colors mb-5 group w-fit cursor-pointer text-[12px] font-semibold"
        >
          <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Directory</span>
        </button>

        {/* Main Profile Header Card */}
        <div className="bg-[#FFFFFF] rounded-[10px] p-6 border border-[#DCE3DF] shadow-2xs mb-6 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between relative text-[#152131]">
          <div className="flex items-center gap-4.5">
            <div className="w-16 h-16 rounded-[10px] bg-[#FBEAE6] text-[#E8532E] border border-[#F5C7BD] flex items-center justify-center text-2xl font-bold shadow-2xs">
              {profile.first_name ? profile.first_name.charAt(0) : "P"}
            </div>
            <div>
              <h1 className="text-2xl font-medium text-[#152131] tracking-tight m-0" style={{ fontFamily: FONTS.serif }}>
                User {formatUserRef(profile.id)}
              </h1>
              <p className="text-[#5C6B66] text-[12.5px] mt-0.5">Anonymized patient telemetry profile</p>
              <div className="flex items-center gap-2.5 mt-2">
                <StatusBadge status={profile.account_status} label={profile.account_status} dot={true} />
                <span className="text-[11.5px] text-[#8B9893] flex items-center gap-1">
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
            <div className="bg-[#FFFFFF] rounded-[10px] border border-[#DCE3DF] p-1.5 shadow-2xs sticky top-6 space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-[8px] text-[12.5px] font-semibold transition-colors cursor-pointer text-left ${
                    activeTab === tab.id 
                    ? "bg-[#E8532E] text-white shadow-2xs" 
                    : "text-[#5C6B66] hover:bg-[#EDF1EF] hover:text-[#152131]"
                  }`}
                >
                  <div className={activeTab === tab.id ? "text-white" : "text-[#5C6B66]"}>
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
                <h2 className="text-[17px] font-semibold text-[#152131] mb-2" style={{ fontFamily: FONTS.serif }}>User Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#FFFFFF] p-5 rounded-[10px] border border-[#DCE3DF] shadow-2xs">
                    <h3 className="text-[11px] uppercase tracking-wider text-[#8B9893] font-semibold mb-3">Privacy Shield</h3>
                    <div className="space-y-3">
                      <div className="bg-[#EDF1EF] p-3.5 rounded-[8px] border border-[#DCE3DF] flex items-start gap-2.5">
                        <AlertTriangle size={15} className="text-[#A9741B] shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[12.5px] font-semibold text-[#152131]">Anonymized for Privacy</p>
                          <p className="text-[11.5px] text-[#5C6B66] leading-relaxed mt-0.5">
                            Direct identifiers are shielded to comply with clinical privacy regulations. You may only view telemetry relevant for medical decision support.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#FFFFFF] p-5 rounded-[10px] border border-[#DCE3DF] shadow-2xs">
                    <h3 className="text-[11px] uppercase tracking-wider text-[#8B9893] font-semibold mb-3">Engagement</h3>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[10px] text-[#8B9893] uppercase tracking-wider mb-1 font-semibold">Onboarding Status</p>
                        <p className="font-semibold text-[#152131] capitalize text-[15px]">{profile.onboarding_status || "Completed"}</p>
                      </div>
                      <Activity size={22} className="text-[#8B9893]" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* BIOMETRICS */}
            {activeTab === "biometrics" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h2 className="text-[17px] font-semibold text-[#152131] mb-2" style={{ fontFamily: FONTS.serif }}>Biometrics & Goals</h2>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-4">
                  <div className="bg-[#FFFFFF] p-4 rounded-[10px] border border-[#DCE3DF] flex flex-col justify-center items-center text-center shadow-2xs">
                    <p className="text-[10.5px] text-[#8B9893] uppercase tracking-wider font-semibold mb-1">Height</p>
                    <p className="text-[22px] font-medium text-[#152131]" style={{ fontFamily: FONTS.serif }}>{profile.height_cm} <span className="text-[12px] text-[#8B9893] font-normal">cm</span></p>
                  </div>
                  <div className="bg-[#FFFFFF] p-4 rounded-[10px] border border-[#DCE3DF] flex flex-col justify-center items-center text-center shadow-2xs">
                    <p className="text-[10.5px] text-[#8B9893] uppercase tracking-wider font-semibold mb-1">Weight</p>
                    <p className="text-[22px] font-medium text-[#152131]" style={{ fontFamily: FONTS.serif }}>{profile.weight_kg} <span className="text-[12px] text-[#8B9893] font-normal">kg</span></p>
                  </div>
                  <div className="bg-[#FFFFFF] p-4 rounded-[10px] border border-[#DCE3DF] flex flex-col justify-center items-center text-center shadow-2xs">
                    <p className="text-[10.5px] text-[#8B9893] uppercase tracking-wider font-semibold mb-1">Sex</p>
                    <p className="text-[20px] font-medium text-[#152131] capitalize" style={{ fontFamily: FONTS.serif }}>{profile.sex || "N/A"}</p>
                  </div>
                  <div className="bg-[#FFFFFF] p-4 rounded-[10px] border border-[#DCE3DF] flex flex-col justify-center items-center text-center shadow-2xs">
                    <p className="text-[10.5px] text-[#8B9893] uppercase tracking-wider font-semibold mb-1">Age</p>
                    <p className="text-[22px] font-medium text-[#152131]" style={{ fontFamily: FONTS.serif }}>
                      {profile.date_of_birth ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear() : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="bg-[#FFFFFF] p-5 rounded-[10px] border border-[#DCE3DF] shadow-2xs">
                  <h3 className="text-[11px] uppercase tracking-wider text-[#8B9893] font-semibold mb-3 flex items-center gap-1.5">
                    <Flame size={13} className="text-[#E8532E]" /> Primary Health Goals
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.health_goals && profile.health_goals.length > 0 ? (
                      profile.health_goals.map(goal => (
                        <span key={goal} className="px-3 py-1.5 bg-[#EDF1EF] border border-[#DCE3DF] rounded-[6px] text-[12px] font-semibold text-[#152131] capitalize">
                          {goal}
                        </span>
                      ))
                    ) : (
                      <p className="text-[#8B9893] text-[12px]">No specific health goals logged.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* LIFESTYLE & DIET */}
            {activeTab === "lifestyle" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h2 className="text-[17px] font-semibold text-[#152131] mb-2" style={{ fontFamily: FONTS.serif }}>Lifestyle & Diet Profile</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#FFFFFF] p-5 rounded-[10px] border border-[#DCE3DF] shadow-2xs">
                    <h3 className="text-[11px] uppercase tracking-wider text-[#8B9893] font-semibold mb-4 flex items-center gap-1.5">
                      <Moon size={13} className="text-[#1B6E63]" /> Lifestyle Habits
                    </h3>
                    {baselines?.lifestyle ? (
                      <div className="space-y-2.5 text-[12.5px]">
                        <div className="flex justify-between items-center py-1.5 border-b border-[#DCE3DF]">
                          <span className="font-medium text-[#5C6B66]">Smoking Status</span>
                          <span className="font-semibold text-[#152131] capitalize">{baselines.lifestyle.smoking_status}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-[#DCE3DF]">
                          <span className="font-medium text-[#5C6B66]">Avg. Sleep</span>
                          <span className="font-semibold text-[#152131]">{baselines.lifestyle.avg_sleep_hours} Hours</span>
                        </div>
                        {baselines.lifestyle.family_history !== undefined && (
                          <div className="flex justify-between items-center py-1.5">
                            <span className="font-medium text-[#5C6B66]">Family History</span>
                            <span className="font-semibold text-[#152131]">{baselines.lifestyle.family_history ? "Yes" : "No"}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[#8B9893] text-[12px]">No lifestyle baseline available.</p>
                    )}
                  </div>

                  <div className="bg-[#FFFFFF] p-5 rounded-[10px] border border-[#DCE3DF] shadow-2xs">
                    <h3 className="text-[11px] uppercase tracking-wider text-[#8B9893] font-semibold mb-4 flex items-center gap-1.5">
                      <Apple size={13} className="text-[#E8532E]" /> Dietary Baseline
                    </h3>
                    {baselines?.dietary ? (
                      <div className="space-y-2.5 text-[12.5px]">
                        <div className="flex justify-between items-center py-1.5 border-b border-[#DCE3DF]">
                          <span className="font-medium text-[#5C6B66]">Dietary Practice</span>
                          <span className="font-semibold text-[#152131]">{baselines.dietary.dietary_practice}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-[#DCE3DF]">
                          <span className="font-medium text-[#5C6B66]">Sodium Frequency</span>
                          <span className="font-semibold text-[#152131] capitalize">{baselines.dietary.sodium_frequency}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5">
                          <span className="font-medium text-[#5C6B66]">Allergies</span>
                          <span className="font-semibold text-[#152131]">
                            {baselines.dietary.allergies?.join(', ') || "None"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[#8B9893] text-[12px]">No dietary baseline available.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* HEALTH BASELINES */}
            {activeTab === "baselines" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h2 className="text-[17px] font-semibold text-[#152131] mb-2" style={{ fontFamily: FONTS.serif }}>Health Baselines</h2>
                {baselines?.clinical ? (
                  <>
                    <div className="bg-[#FFFFFF] p-5 rounded-[10px] border border-[#DCE3DF] mb-4 shadow-2xs">
                      <h3 className="text-[11px] uppercase tracking-wider text-[#8B9893] font-semibold mb-3">Core Vitals</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-[10px] text-[#8B9893] uppercase tracking-wider mb-1 font-semibold">Resting BP</p>
                          <p className="text-[20px] font-medium text-[#152131]" style={{ fontFamily: FONTS.serif }}>{baselines.clinical.resting_bp_mmhg || "--"} <span className="text-[11px] text-[#8B9893] font-normal">mmHg</span></p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#8B9893] uppercase tracking-wider mb-1 font-semibold">Max HR</p>
                          <p className="text-[20px] font-medium text-[#152131]" style={{ fontFamily: FONTS.serif }}>{baselines.clinical.max_heart_rate_bpm || "--"} <span className="text-[11px] text-[#8B9893] font-normal">bpm</span></p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#8B9893] uppercase tracking-wider mb-1 font-semibold">Cholesterol</p>
                          <p className="text-[20px] font-medium text-[#152131]" style={{ fontFamily: FONTS.serif }}>{baselines.clinical.serum_cholesterol || "--"} <span className="text-[11px] text-[#8B9893] font-normal">mg/dL</span></p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#8B9893] uppercase tracking-wider mb-1 font-semibold">Fasting Blood Sugar</p>
                          <p className="text-[18px] font-medium text-[#152131]" style={{ fontFamily: FONTS.serif }}>{baselines.clinical.fasting_blood_sugar ? "Elevated" : "Normal"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-[#FFFFFF] p-5 rounded-[10px] border border-[#DCE3DF] shadow-2xs">
                        <h3 className="text-[11px] uppercase tracking-wider text-[#8B9893] font-semibold mb-3">Reported Conditions</h3>
                        {baselines.clinical.diagnosed_conditions && baselines.clinical.diagnosed_conditions.length > 0 ? (
                          <ul className="space-y-1.5">
                            {baselines.clinical.diagnosed_conditions.map((cond, i) => (
                              <li key={i} className="flex items-center gap-2 text-[12.5px] font-semibold text-[#152131] before:content-[''] before:w-1.5 before:h-1.5 before:bg-[#E8532E] before:rounded-full capitalize">
                                {cond}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-[12px] text-[#8B9893]">None reported.</p>
                        )}
                      </div>
                      <div className="bg-[#FFFFFF] p-5 rounded-[10px] border border-[#DCE3DF] shadow-2xs">
                        <h3 className="text-[11px] uppercase tracking-wider text-[#8B9893] font-semibold mb-3">Health Flags</h3>
                        <div className="space-y-2 text-[12.5px]">
                          <div className="flex justify-between items-center py-1 border-b border-[#DCE3DF]">
                            <span className="font-medium text-[#5C6B66]">On Medication</span>
                            <span className="font-semibold text-[#152131]">{baselines.clinical.on_medication ? "Yes" : "No"}</span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-[#DCE3DF]">
                            <span className="font-medium text-[#5C6B66]">Chest Pain Type</span>
                            <span className="font-semibold text-[#152131]">{baselines.clinical.chest_pain_type || "None"}</span>
                          </div>
                          <div className="flex justify-between items-center py-1">
                            <span className="font-medium text-[#5C6B66]">Exercise Angina</span>
                            <span className="font-semibold text-[#152131]">{baselines.clinical.exercise_angina ? "Yes" : "No"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-[#FFFFFF] p-8 rounded-[10px] border border-[#DCE3DF] flex flex-col items-center text-center shadow-2xs">
                    <Stethoscope size={24} className="text-[#8B9893] mb-2" />
                    <p className="text-[#8B9893] text-[12px] font-medium">No health baselines recorded yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* HEALTH TIMELINE */}
            {activeTab === "timeline" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h2 className="text-[17px] font-semibold text-[#152131] mb-2 flex items-center gap-2" style={{ fontFamily: FONTS.serif }}>
                  <Clock size={16} className="text-[#E8532E]" />
                  Chronological Health Timeline
                </h2>
                
                <div className="bg-[#FFFFFF] p-6 rounded-[10px] border border-[#DCE3DF] shadow-2xs relative">
                  {timeline && timeline.length > 0 ? (
                    <div className="relative border-l border-[#DCE3DF] ml-3 md:ml-4 space-y-6 pb-2">
                      {timeline.map((item, index) => {
                        const normalizeTimelineType = (type) => {
                          if (!type) return "";
                          const lower = type.toLowerCase();
                          if (lower === "vitals") return "vital";
                          if (lower === "symptoms") return "symptom";
                          return lower;
                        };
                        const normalizedType = normalizeTimelineType(item.type);

                        let iconColor = "bg-[#EDF1EF] text-[#5C6B66] border-[#DCE3DF]";
                        let Icon = Activity;
                        let typeLabel = "Log";
                        
                        if (normalizedType === "vital") {
                          iconColor = "bg-[#F7E4E1] text-[#A93226] border-[#F0C4B8]";
                          Icon = HeartPulse;
                          typeLabel = "Vitals";
                        } else if (normalizedType === "symptom") {
                          iconColor = "bg-[#F6EDDD] text-[#A9741B] border-[#EBD7B8]";
                          Icon = AlertTriangle;
                          typeLabel = "Symptoms";
                        } else if (normalizedType === "meal") {
                          iconColor = "bg-[#E3EFEC] text-[#1B6E63] border-[#C5DFD8]";
                          Icon = Apple;
                          typeLabel = "Meal";
                        } else if (normalizedType === "exercise") {
                          iconColor = "bg-[#FBEAE6] text-[#E8532E] border-[#F5C7BD]";
                          Icon = Flame;
                          typeLabel = "Exercise";
                        } else if (normalizedType === "sleep") {
                          iconColor = "bg-[#EDF1EF] text-[#152131] border-[#DCE3DF]";
                          Icon = Moon;
                          typeLabel = "Sleep";
                        } else if (normalizedType === "hss") {
                          iconColor = "bg-[#FBEAE6] text-[#E8532E] border-[#F5C7BD]";
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
                              <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#8B9893]">{typeLabel}</span>
                              <span className="text-[11.5px] text-[#8B9893] font-medium">{new Date(item.timestamp).toLocaleString()}</span>
                            </div>
                            
                            <div className="bg-[#EDF1EF]/60 p-3.5 rounded-[8px] border border-[#DCE3DF]">
                              {normalizedType === "vital" && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  {item.data.systolic && item.data.diastolic && (
                                    <div>
                                      <p className="text-[10px] text-[#8B9893] uppercase tracking-wider mb-0.5 font-semibold">Blood Pressure</p>
                                      <p className="text-[13px] font-bold text-[#152131]">{item.data.systolic}/{item.data.diastolic} <span className="text-[10px] text-[#8B9893] font-normal">mmHg</span></p>
                                    </div>
                                  )}
                                  {item.data.heart_rate && (
                                    <div>
                                      <p className="text-[10px] text-[#8B9893] uppercase tracking-wider mb-0.5 font-semibold">Heart Rate</p>
                                      <p className="text-[13px] font-bold text-[#152131]">{item.data.heart_rate} <span className="text-[10px] text-[#8B9893] font-normal">bpm</span></p>
                                    </div>
                                  )}
                                  {item.data.blood_sugar && (
                                    <div>
                                      <p className="text-[10px] text-[#8B9893] uppercase tracking-wider mb-0.5 font-semibold">Blood Sugar</p>
                                      <p className="text-[13px] font-bold text-[#152131]">{item.data.blood_sugar} <span className="text-[10px] text-[#8B9893] font-normal">mg/dL</span></p>
                                    </div>
                                  )}
                                  {item.data.weight_kg && (
                                    <div>
                                      <p className="text-[10px] text-[#8B9893] uppercase tracking-wider mb-0.5 font-semibold">Weight</p>
                                      <p className="text-[13px] font-bold text-[#152131]">{item.data.weight_kg} <span className="text-[10px] text-[#8B9893] font-normal">kg</span></p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {normalizedType === "symptom" && (
                                <div>
                                  <p className="text-[10px] text-[#8B9893] uppercase tracking-wider mb-0.5 font-semibold">Symptoms Reported</p>
                                  <p className="text-[13px] font-bold text-[#152131] capitalize">{item.data.symptoms?.join(", ") || "No specific symptoms"}</p>
                                  {item.data.severity_map && Object.keys(item.data.severity_map).length > 0 && (
                                    <p className="text-[11.5px] text-[#5C6B66] mt-1 font-medium">
                                      Severity: {Object.entries(item.data.severity_map).map(([k, v]) => `${k.replace('_', ' ')} (${v})`).join(", ")}
                                    </p>
                                  )}
                                  {item.data.context && <p className="text-[11.5px] text-[#5C6B66] mt-1.5 italic">Context: "{item.data.context}"</p>}
                                </div>
                              )}

                              {normalizedType === "meal" && (
                                <div>
                                  <p className="text-[13px] font-bold text-[#152131] mb-0.5">{item.data.meal_name || "Logged Meal"}</p>
                                  <p className="text-[11.5px] text-[#5C6B66] font-medium">
                                    {item.data.calories ? `${item.data.calories} kcal` : ""}
                                    {item.data.calories && item.data.sodium_mg ? " | " : ""}
                                    {item.data.sodium_mg ? `Sodium: ${item.data.sodium_mg} mg` : ""}
                                  </p>
                                </div>
                              )}

                              {normalizedType === "exercise" && (
                                <div>
                                  <p className="text-[13px] font-bold text-[#152131] mb-0.5">{item.data.routine_name || "Custom Exercise"}</p>
                                  <div className="flex gap-3 mt-1 text-[11.5px] text-[#5C6B66]">
                                    <p><span className="font-bold text-[#152131]">{item.data.duration_minutes}</span> min duration</p>
                                    {item.data.status && (
                                      <p className="capitalize">Status: <span className="font-bold text-[#152131]">{item.data.status}</span></p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {normalizedType === "sleep" && (
                                <div>
                                  <div className="flex gap-3 text-[11.5px] text-[#5C6B66]">
                                    <p><span className="font-bold text-[#152131]">{item.data.duration_hours}</span> hours slept</p>
                                    {item.data.quality && (
                                      <p className="capitalize">Quality: <span className="font-bold text-[#152131]">{item.data.quality}</span></p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {normalizedType === "hss" && (
                                <div className="flex items-center gap-3">
                                  <div>
                                    <p className="text-[10px] text-[#8B9893] uppercase tracking-wider mb-0.5 font-semibold">HSS Tier Updated</p>
                                    <p className="text-[13px] font-bold text-[#152131]">{normalizeHssTier(item.data.score, item.data.tier)}</p>
                                  </div>
                                  <div className="h-6 w-px bg-[#DCE3DF]"></div>
                                  <div>
                                    <p className="text-[10px] text-[#8B9893] uppercase tracking-wider mb-0.5 font-semibold">Score</p>
                                    <p className="text-[13px] font-bold text-[#1B6E63]">{item.data.score}</p>
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
                      <Clock size={28} className="text-[#8B9893] mb-2" />
                      <h3 className="text-[13px] font-semibold text-[#152131]">No Timeline Data</h3>
                      <p className="text-[11.5px] text-[#5C6B66] mt-1 max-w-sm">
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
