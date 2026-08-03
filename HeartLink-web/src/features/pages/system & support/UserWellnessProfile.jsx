import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Activity, User, HeartPulse, Stethoscope, 
  Apple, Flame, Moon, BookOpen, Clock, AlertTriangle, Users 
} from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout";
import { apiFetch } from "../../../api";

const UserWellnessProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiFetch(`/api/users/${id}/profile`);
        setData(response);
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
        <div className="flex items-center gap-2 mb-6 text-slate-400">
          <ArrowLeft size={16} />
          <span className="text-xs uppercase tracking-widest font-semibold">Loading Profile...</span>
        </div>
      </AdminLayout>
    );
  }

  if (!data) {
    return (
      <AdminLayout>
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 flex flex-col items-center justify-center text-center">
          <AlertTriangle size={32} className="mb-3 opacity-80" />
          <h2 className="text-xl font-bold">User Not Found</h2>
          <p className="text-sm mt-1 opacity-80">The requested wellness profile could not be located.</p>
          <button onClick={() => navigate(-1)} className="mt-4 px-6 py-2 bg-white text-red-600 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm">
            Go Back
          </button>
        </div>
      </AdminLayout>
    );
  }

  const { profile, baselines, care_team } = data;

  const tabs = [
    { id: "overview", label: "Overview", icon: <User size={16} /> },
    { id: "biometrics", label: "Biometrics & Goals", icon: <Activity size={16} /> },
    { id: "lifestyle", label: "Lifestyle & Diet", icon: <Apple size={16} /> },
    { id: "baselines", label: "Health Baselines", icon: <HeartPulse size={16} /> },
    { id: "support", label: "Support Contacts", icon: <Users size={16} /> }
  ];

  return (
    <AdminLayout>
      {/* Header */}
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors mb-6 group w-fit"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Back to Users</span>
      </button>

      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm mb-8 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between relative overflow-hidden">
        {/* Subtle background accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 opacity-60"></div>
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-20 h-20 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-3xl font-bold shadow-md">
            {profile.first_name[0]}{profile.last_name[0]}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{profile.first_name} {profile.last_name}</h1>
            <p className="text-slate-500 font-mono text-sm mt-1">{profile.id}</p>
            <div className="flex items-center gap-3 mt-3">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${profile.account_status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                {profile.account_status}
              </span>
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <Clock size={12} /> Registered: {new Date(profile.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-sm sticky top-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all mb-1 last:mb-0 ${
                  activeTab === tab.id 
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className={`${activeTab === tab.id ? "text-white/80" : "text-slate-400"}`}>
                  {tab.icon}
                </div>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          
          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl font-bold text-slate-900 mb-6">User Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-4">Contact Info</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Email</p>
                      <p className="font-medium text-slate-900">{profile.email || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Phone</p>
                      <p className="font-medium text-slate-900">{profile.phone || "Not provided"}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-4">Engagement</h3>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Onboarding Status</p>
                      <p className="font-medium text-slate-900 capitalize">{profile.onboarding_status}</p>
                    </div>
                    <Activity size={24} className="text-slate-200" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BIOMETRICS */}
          {activeTab === "biometrics" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Biometrics & Goals</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2">Height</p>
                  <p className="text-2xl font-bold text-slate-900">{profile.height_cm} <span className="text-xs text-slate-400 font-medium">cm</span></p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2">Weight</p>
                  <p className="text-2xl font-bold text-slate-900">{profile.weight_kg} <span className="text-xs text-slate-400 font-medium">kg</span></p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2">Sex</p>
                  <p className="text-lg font-bold text-slate-900 capitalize">{profile.sex}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2">Age</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {profile.date_of_birth ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear() : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-4 flex items-center gap-2">
                  <Flame size={14} className="text-orange-500" /> Primary Health Goals
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.health_goals && profile.health_goals.length > 0 ? (
                    profile.health_goals.map(goal => (
                      <span key={goal} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 capitalize">
                        {goal}
                      </span>
                    ))
                  ) : (
                    <p className="text-slate-400 text-sm">No specific health goals logged.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* LIFESTYLE & DIET */}
          {activeTab === "lifestyle" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Lifestyle & Diet Profile</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-5 flex items-center gap-2">
                    <Moon size={14} className="text-indigo-500" /> Lifestyle Habits
                  </h3>
                  {baselines.lifestyle ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-slate-50">
                        <span className="text-sm font-medium text-slate-500">Smoking Status</span>
                        <span className="text-sm font-bold text-slate-900 capitalize">{baselines.lifestyle.smoking_status}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-50">
                        <span className="text-sm font-medium text-slate-500">Avg. Sleep</span>
                        <span className="text-sm font-bold text-slate-900">{baselines.lifestyle.avg_sleep_hours} Hours</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm font-medium text-slate-500">Family History</span>
                        <span className="text-sm font-bold text-slate-900">{baselines.lifestyle.family_history ? "Yes" : "No"}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm">No lifestyle baseline available.</p>
                  )}
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-5 flex items-center gap-2">
                    <Apple size={14} className="text-emerald-500" /> Dietary Baseline
                  </h3>
                  {baselines.dietary ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-slate-50">
                        <span className="text-sm font-medium text-slate-500">Dietary Practice</span>
                        <span className="text-sm font-bold text-slate-900">{baselines.dietary.dietary_practice}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-50">
                        <span className="text-sm font-medium text-slate-500">Sodium Frequency</span>
                        <span className="text-sm font-bold text-slate-900 capitalize">{baselines.dietary.sodium_frequency}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm font-medium text-slate-500">Allergies</span>
                        <span className="text-sm font-bold text-slate-900">
                          {baselines.dietary.allergies?.join(', ') || "None"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm">No dietary baseline available.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* HEALTH BASELINES */}
          {activeTab === "baselines" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Health Baselines</h2>
              {baselines.clinical ? (
                <>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
                    <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-4">Core Vitals</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Resting BP</p>
                        <p className="text-xl font-bold text-slate-900">{baselines.clinical.resting_bp_mmhg || "--"} <span className="text-xs text-slate-400">mmHg</span></p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Max HR</p>
                        <p className="text-xl font-bold text-slate-900">{baselines.clinical.max_heart_rate_bpm || "--"} <span className="text-xs text-slate-400">bpm</span></p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Cholesterol</p>
                        <p className="text-xl font-bold text-slate-900">{baselines.clinical.serum_cholesterol || "--"} <span className="text-xs text-slate-400">mg/dL</span></p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Fasting Blood Sugar</p>
                        <p className="text-xl font-bold text-slate-900">{baselines.clinical.fasting_blood_sugar ? "Elevated" : "Normal"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-4">Diagnosed Conditions</h3>
                      {baselines.clinical.diagnosed_conditions && baselines.clinical.diagnosed_conditions.length > 0 ? (
                        <ul className="space-y-2">
                          {baselines.clinical.diagnosed_conditions.map((cond, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm font-medium text-slate-700 before:content-[''] before:w-1.5 before:h-1.5 before:bg-slate-900 before:rounded-full capitalize">
                              {cond}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-400">None reported.</p>
                      )}
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-4">Clinical Flags</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-500">On Medication</span>
                          <span className="text-sm font-bold text-slate-900">{baselines.clinical.on_medication ? "Yes" : "No"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-500">Chest Pain Type</span>
                          <span className="text-sm font-bold text-slate-900">{baselines.clinical.chest_pain_type || "None"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-500">Exercise Angina</span>
                          <span className="text-sm font-bold text-slate-900">{baselines.clinical.exercise_angina ? "Yes" : "No"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col items-center text-center">
                  <Stethoscope size={24} className="text-slate-300 mb-2" />
                  <p className="text-slate-500 font-medium">No health baselines recorded yet.</p>
                </div>
              )}
            </div>
          )}

          {/* SUPPORT CONTACTS */}
          {activeTab === "support" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Support Contacts</h2>
              {care_team && care_team.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {care_team.map(contact => (
                    <div key={contact.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
                        <User size={18} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{contact.name}</h4>
                        <p className="text-xs text-slate-500 font-medium">{contact.role_title} • <span className="capitalize">{contact.contact_type}</span></p>
                        <p className="text-sm font-medium text-slate-700 mt-2">{contact.phone}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col items-center text-center">
                  <Users size={24} className="text-slate-300 mb-2" />
                  <p className="text-slate-500 font-medium">No support contacts added.</p>
                </div>
              )}
            </div>
          )}
          
        </div>
      </div>
    </AdminLayout>
  );
};

export default UserWellnessProfile;
