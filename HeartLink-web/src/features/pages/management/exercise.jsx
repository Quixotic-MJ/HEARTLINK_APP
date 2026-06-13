import React, { useState } from "react";
import {
  Search,
  Plus,
  Filter,
  X,
  Dumbbell,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Archive,
  Save,
  Activity,
  PlaySquare,
  PlusCircle,
  Trash2,
  Clock,
  Edit2,
} from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout";
import ExerciseFormModal from "../../../components/modals/ExerciseFormModal";

// Mock Data
const initialExercises = [
  {
    id: 1,
    name: "15-Minute Chair Yoga",
    description: "Low-impact seated stretching focusing on flexibility and deep breathing.",
    duration: 15,
    cssTarget: "Monitor Closely (50-79)",
    mediaUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    status: "published",
    expertValidated: true,
    steps: [
      "Sit upright in a sturdy chair with feet flat on the floor.",
      "Inhale deeply while raising both arms towards the ceiling.",
      "Exhale and slowly lower arms back to your sides.",
    ],
  },
  {
    id: 2,
    name: "Light Paced Walking",
    description: "Gentle cardiovascular activation through steady, flat-surface walking.",
    duration: 20,
    cssTarget: "Stable (80-100)",
    mediaUrl: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&q=80&w=150&h=150",
    status: "published",
    expertValidated: true,
    steps: [
      "Ensure you are wearing supportive athletic shoes.",
      "Begin walking at a pace where you can comfortably hold a conversation.",
      "Cool down for the last 3 minutes by slowing your pace.",
    ],
  },
  {
    id: 3,
    name: "Bed-Assisted Ankle Pumps",
    description: "Extremely low-exertion movement to promote blood flow while resting.",
    duration: 5,
    cssTarget: "Critical (<50)",
    mediaUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    status: "draft",
    expertValidated: false,
    steps: [
      "Lie flat on your back or sit slightly propped up in bed.",
      "Point your toes downward away from your body, then pull them back up towards your shins.",
      "Repeat 10 times per foot, breathing normally.",
    ],
  },
  {
    id: 4,
    name: "Brisk Jogging Intervals",
    description: "Moderate intensity intervals for cardiovascular strengthening.",
    duration: 30,
    cssTarget: "Stable (80-100)",
    mediaUrl: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&q=80&w=150&h=150",
    status: "archived",
    expertValidated: false,
    steps: [
      "Warm up with a 5-minute brisk walk.",
      "Jog at a moderate pace for 2 minutes, then walk for 1 minute.",
      "Repeat interval 5 times.",
    ],
  },
];

const Exercises = () => {
  const [exercises, setExercises] = useState(initialExercises);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCss, setFilterCss] = useState("all");

  React.useEffect(() => {
    setExercises(initialExercises);
  }, [initialExercises]);

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);

  // Toggle this between "sysadmin" and "medical" to test the Validation Toggle
  const [userRole] = useState("medical");

  // Open Modal for Create or Edit
  const openModal = (exercise = null) => {
    setEditingExercise(exercise || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingExercise(null);
  };

  // Filter Logic
  const filteredExercises = exercises.filter((e) => {
    const matchesSearch = e.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesFilter = filterCss === "all" || e.cssTarget === filterCss;
    return matchesSearch && matchesFilter;
  });

  // Badge Color Helper
  const getCssBadgeColor = (target) => {
    if (target.includes("Stable"))
      return { bg: "rgba(15,23,42,0.05)", text: "#0f172a", border: "transparent" };
    if (target.includes("Monitor"))
      return { bg: "rgba(245,158,11,0.08)", text: "#d97706", border: "transparent" };
    return { bg: "rgba(239,68,68,0.08)", text: "#dc2626", border: "transparent" };
  };

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-8 gap-4">
        <div>
          <p className="text-[10px] font-medium text-slate-400 tracking-[0.22em] uppercase mb-2">
            Content Library
          </p>
          <h2 className="text-2xl lg:text-3xl font-semibold text-slate-900 leading-[1.1] tracking-tight">
            Exercise Management.
          </h2>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-1.5 text-white font-medium text-[11px] px-3.5 py-2 rounded-xl transition-all hover:opacity-90 active:scale-[0.99]"
          style={{ backgroundColor: "#0f172a" }}
        >
          <Plus size={14} strokeWidth={2} /> Create New Exercise
        </button>
      </div>

      {/* Main View: Data Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search routine names..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-[11px] border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 transition-all bg-white"
              />
            </div>
            <div className="relative">
              <Filter
                size={12}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <select
                value={filterCss}
                onChange={(e) => setFilterCss(e.target.value)}
                className="pl-9 pr-8 py-2 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none appearance-none cursor-pointer hover:border-slate-300 transition-colors"
              >
                <option value="all">All Risk Levels</option>
                <option value="Stable (80-100)">Stable (80-100)</option>
                <option value="Monitor Closely (50-79)">
                  Monitor Closely (50-79)
                </option>
                <option value="Critical (<50)">Critical (&lt;50)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Exercise List Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr>
                <th className="py-3 px-5 text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 w-1/3">
                  Routine Name
                </th>
                <th className="py-3 px-5 text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  Target Stability Level
                </th>
                <th className="py-3 px-5 text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  Duration
                </th>
                <th className="py-3 px-5 text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 text-center">
                  Status / Validation
                </th>
                <th className="py-3 px-5 text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredExercises.map((exercise) => {
                const badge = getCssBadgeColor(exercise.cssTarget);
                return (
                  <tr
                    key={exercise.id}
                    className={`hover:bg-slate-50/60 transition-colors group cursor-pointer ${exercise.status === "archived" ? "opacity-50" : ""}`}
                    onClick={() => openModal(exercise)}
                  >
                    <td className="py-4 px-5 align-middle">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors overflow-hidden bg-slate-100 border border-slate-200"
                        >
                          {exercise.mediaUrl ? (
                            exercise.mediaUrl.startsWith("data:video") || exercise.mediaUrl.endsWith(".mp4") ? (
                              <video src={exercise.mediaUrl} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                            ) : (
                              <img src={exercise.mediaUrl} alt={exercise.name} className="w-full h-full object-cover" />
                            )
                          ) : (
                            <Dumbbell size={16} className="text-slate-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-slate-900 font-semibold text-xs mb-0.5">
                            {exercise.name}
                          </p>
                          <p className="text-slate-400 text-[10px] truncate max-w-[220px]">
                            {exercise.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5 align-middle">
                      <span
                        className="inline-flex items-center text-[9px] font-medium px-2.5 py-1 rounded-full uppercase tracking-[0.15em]"
                        style={{
                          backgroundColor: badge.bg,
                          color: badge.text,
                        }}
                      >
                        {exercise.cssTarget}
                      </span>
                    </td>
                    <td className="py-4 px-5 align-middle">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <Clock size={13} className="text-slate-400" />
                        {exercise.duration}m
                      </span>
                    </td>
                    <td className="py-4 px-5 align-middle text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <span
                          className={`text-[9px] font-semibold uppercase tracking-[0.15em] ${
                            exercise.status === "published"
                              ? "text-emerald-600"
                              : exercise.status === "draft"
                              ? "text-amber-500"
                              : "text-slate-400"
                          }`}
                        >
                          {exercise.status}
                        </span>
                        {exercise.expertValidated ? (
                          <div
                            className="inline-flex items-center gap-1 text-[8px] font-medium tracking-[0.1em] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase"
                            title="Clinically Validated"
                          >
                            <ShieldCheck size={10} /> Validated
                          </div>
                        ) : (
                          <div
                            className="inline-flex items-center gap-1 text-[8px] font-medium tracking-[0.1em] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded uppercase"
                            title="Pending Validation"
                          >
                            <ShieldAlert size={10} /> Pending
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-5 align-middle text-right">
                      <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal(exercise);
                          }}
                          title="Edit Exercise"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Modal Component */}
      <ExerciseFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        exercise={editingExercise}
        userRole={userRole}
        onSave={(data) => {
          console.log("Saving exercise to DB:", data);
          // Dispatch action or API call here
        }}
      />
    </AdminLayout>
  );
};

export default Exercises;
