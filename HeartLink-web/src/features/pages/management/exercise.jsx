import React, { useState } from "react";
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
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
} from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout"; 

// Mock Data
const initialExercises = [
  {
    id: 1,
    name: "15-Minute Chair Yoga",
    description:
      "Low-impact seated stretching focusing on flexibility and deep breathing.",
    duration: 15,
    cssTarget: "Monitor Closely (50-79)",
    videoUrl: "https://heartlink-assets.com/videos/chair-yoga-15m.mp4",
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
    description:
      "Gentle cardiovascular activation through steady, flat-surface walking.",
    duration: 20,
    cssTarget: "Stable (80-100)",
    videoUrl: "https://heartlink-assets.com/videos/light-walking.mp4",
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
    description:
      "Extremely low-exertion movement to promote blood flow while resting.",
    duration: 5,
    cssTarget: "Critical (<50)",
    videoUrl: "https://heartlink-assets.com/videos/ankle-pumps.mp4",
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
    description:
      "Moderate intensity intervals for cardiovascular strengthening.",
    duration: 30,
    cssTarget: "Stable (80-100)",
    videoUrl: "https://heartlink-assets.com/videos/brisk-intervals.mp4",
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

  // Drawer & Form State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);

  // Toggle this between "sysadmin" and "medical" to test the Validation Toggle
  const [userRole] = useState("medical");

  // Form State Handlers
  const [formData, setFormData] = useState({});
  const [steps, setSteps] = useState([]);

  // Open Drawer for Create or Edit
  const openDrawer = (exercise = null) => {
    if (exercise) {
      setEditingExercise(exercise);
      setFormData(exercise);
      setSteps(exercise.steps || [""]);
    } else {
      setEditingExercise(null);
      setFormData({
        name: "",
        description: "",
        duration: 10,
        cssTarget: "Stable (80-100)",
        videoUrl: "",
        status: "draft",
        expertValidated: false,
      });
      setSteps([""]);
    }
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
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
      return "bg-blue-50 text-[#1e4ed8] border-blue-100";
    if (target.includes("Monitor"))
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
    return "bg-red-50 text-red-600 border-red-100";
  };

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 gap-4">
        <div>
          <p className="text-[9px] font-bold text-[#1e4ed8] tracking-[0.2em] uppercase mb-1.5">
            Content Library
          </p>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 leading-[1.1] tracking-tight">
            Exercise <span className="text-[#1e4ed8]">Management.</span>
          </h2>
        </div>
        <button
          onClick={() => openDrawer()}
          className="flex items-center gap-1.5 bg-[#1e4ed8] hover:bg-[#113296] text-white font-bold text-[11px] px-3 py-1.5 rounded-lg shadow-sm shadow-blue-900/20 transition-colors"
        >
          <Plus size={14} strokeWidth={2.5} /> Create New Exercise
        </button>
      </div>

      {/* Main View: Data Table Container */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-gray-50 bg-[#f8fafc]">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search routine names..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-[11px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] focus:ring-1 focus:ring-[#1e4ed8]/20 transition-all shadow-sm"
              />
            </div>
            <div className="relative">
              <Filter
                size={12}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <select
                value={filterCss}
                onChange={(e) => setFilterCss(e.target.value)}
                className="pl-8 pr-8 py-1.5 text-[11px] font-bold text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none appearance-none cursor-pointer hover:border-gray-300 transition-colors shadow-sm"
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
        <div className="w-full overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr>
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 w-1/3">
                  Routine Name
                </th>
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                  Target Stability Level
                </th>
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 text-center">
                  Duration
                </th>
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 text-center">
                  Status / Validation
                </th>
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredExercises.map((exercise) => (
                <tr
                  key={exercise.id}
                  className={`hover:bg-[#f8fafc] transition-colors group cursor-pointer ${exercise.status === "archived" ? "opacity-50" : ""}`}
                  onClick={() => openDrawer(exercise)}
                >
                  <td className="py-3 px-4 align-middle">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                        <Dumbbell size={14} />
                      </div>
                      <div>
                        <p className="text-gray-900 font-bold text-[11px] mb-0.5">
                          {exercise.name}
                        </p>
                        <p className="text-gray-500 text-[9px] font-medium truncate max-w-[200px]">
                          {exercise.description}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 align-middle">
                    <span
                      className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded border tracking-widest uppercase ${getCssBadgeColor(exercise.cssTarget)}`}
                    >
                      {exercise.cssTarget}
                    </span>
                  </td>
                  <td className="py-3 px-4 align-middle text-center">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-700 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">
                      <Clock size={12} className="text-[#1e4ed8]" />{" "}
                      {exercise.duration}m
                    </span>
                  </td>
                  <td className="py-3 px-4 align-middle text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={`text-[9px] font-bold uppercase tracking-widest ${exercise.status === "published" ? "text-green-600" : exercise.status === "draft" ? "text-yellow-600" : "text-gray-400"}`}
                      >
                        {exercise.status}
                      </span>
                      {exercise.expertValidated ? (
                        <div
                          className="inline-flex items-center gap-1 text-[8px] font-bold text-green-600"
                          title="Clinically Validated"
                        >
                          <ShieldCheck size={10} /> Validated
                        </div>
                      ) : (
                        <div
                          className="inline-flex items-center gap-1 text-[8px] font-bold text-yellow-600"
                          title="Pending Validation"
                        >
                          <ShieldAlert size={10} /> Pending
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 align-middle text-right">
                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="p-1 text-gray-400 hover:text-[#1e4ed8] hover:bg-blue-50 rounded transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDrawer(exercise);
                        }}
                      >
                        <MoreVertical size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================= */}
      {/* SLIDE-OUT DRAWER: Exercise Editor         */}
      {/* ========================================= */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm transition-opacity"
            onClick={closeDrawer}
          ></div>

          {/* Drawer Panel */}
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-[#f8fafc]">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  {editingExercise
                    ? "Edit Exercise Routine"
                    : "Create New Exercise"}
                </h3>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Manage physical activities and CSS assignments
                </p>
              </div>
              <button
                onClick={closeDrawer}
                className="text-gray-400 hover:text-gray-900 bg-white p-1 rounded-md border border-gray-200 shadow-sm transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer Scrollable Form */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-6">
              {/* Expert Validation Workflow */}
              <div
                className={`p-4 rounded-xl border ${formData.expertValidated ? "bg-green-50/50 border-green-200" : "bg-blue-50/50 border-blue-200"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4
                      className={`text-xs font-bold ${formData.expertValidated ? "text-green-800" : "text-[#1e4ed8]"} flex items-center gap-1.5 mb-1`}
                    >
                      {formData.expertValidated ? (
                        <ShieldCheck size={14} />
                      ) : (
                        <ShieldAlert size={14} />
                      )}
                      Medical Expert Validation
                    </h4>
                    <p className="text-[9px] text-gray-600 leading-relaxed">
                      Only Authorized Medical Experts can officially verify that
                      this routine is safe for the assigned CSS target group.
                    </p>
                  </div>

                  {/* Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={formData.expertValidated}
                      disabled={userRole !== "medical"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          expertValidated: e.target.checked,
                        })
                      }
                    />
                    <div
                      className={`w-8 h-4.5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all ${
                        userRole !== "medical"
                          ? "cursor-not-allowed opacity-50"
                          : ""
                      } peer-checked:bg-green-500`}
                    ></div>
                  </label>
                </div>
              </div>

              {/* Section 1: Basic Information */}
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-1.5 mb-3">
                  Basic Information
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">
                      Routine Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-3 py-1.5 text-xs bg-[#f8fafc] border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] focus:bg-white transition-colors"
                      placeholder="e.g. 15-Minute Chair Yoga"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      rows="2"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-xs bg-[#f8fafc] border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] focus:bg-white transition-colors resize-none"
                      placeholder="Short text summary of physical benefits..."
                    ></textarea>
                  </div>

                  <div className="w-1/2 pr-2">
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">
                      Duration (Minutes)
                    </label>
                    <div className="relative">
                      <Clock
                        size={12}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="number"
                        value={formData.duration}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            duration: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full pl-7 pr-3 py-1.5 text-xs font-mono font-bold bg-[#f8fafc] border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] focus:bg-white transition-colors"
                        min="1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Algorithmic Assignment (Critical) */}
              <div>
                <h4 className="text-[10px] font-bold text-[#1e4ed8] uppercase tracking-widest border-b border-blue-100 pb-1.5 mb-3 flex items-center gap-1.5">
                  <Activity size={12} /> Algorithmic Assignment
                </h4>
                <div className="bg-blue-50/30 p-3 rounded-lg border border-blue-50">
                  <label className="block text-[10px] font-bold text-gray-900 mb-1.5">
                    CSS Risk Level Suitability
                  </label>
                  <p className="text-[9px] text-gray-500 mb-2">
                    Select the cardiovascular stability states this exercise is
                    safe for. The engine uses this to filter content for users.
                  </p>
                  <select
                    value={formData.cssTarget}
                    onChange={(e) =>
                      setFormData({ ...formData, cssTarget: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] transition-colors shadow-sm cursor-pointer"
                  >
                    <option value="Stable (80-100)">Stable (80-100)</option>
                    <option value="Monitor Closely (50-79)">
                      Monitor Closely (50-79)
                    </option>
                    <option value="Critical (<50)">Critical (&lt;50)</option>
                  </select>
                </div>
              </div>

              {/* Section 3: Media & Execution */}
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-1.5 mb-3">
                  Media & Execution
                </h4>

                <div className="mb-4">
                  <label className="block text-[10px] font-bold text-gray-700 mb-1">
                    Video Guide URL
                  </label>
                  <div className="relative">
                    <PlaySquare
                      size={14}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={formData.videoUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, videoUrl: e.target.value })
                      }
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#f8fafc] border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] focus:bg-white transition-colors"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-700 mb-1.5">
                    Step-by-Step Instructions
                  </label>
                  <p className="text-[9px] text-gray-500 mb-2">
                    Build the JSON array of instructions for safe execution.
                  </p>
                  <div className="space-y-2 mb-2">
                    {steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="mt-1.5 text-[9px] font-bold text-gray-400 bg-gray-100 w-4 h-4 flex items-center justify-center rounded-full shrink-0">
                          {i + 1}
                        </div>
                        <textarea
                          rows="2"
                          value={step}
                          onChange={(e) => {
                            const newSteps = [...steps];
                            newSteps[i] = e.target.value;
                            setSteps(newSteps);
                          }}
                          className="flex-1 px-3 py-1.5 text-xs bg-[#f8fafc] border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] focus:bg-white transition-colors resize-none leading-relaxed"
                          placeholder="Describe this step..."
                        />
                        <button
                          onClick={() =>
                            setSteps(steps.filter((_, idx) => idx !== i))
                          }
                          className="text-gray-400 hover:text-red-500 p-1 mt-0.5"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setSteps([...steps, ""])}
                    className="flex items-center gap-1 text-[10px] font-bold text-[#1e4ed8] hover:text-[#113296] bg-blue-50 px-2 py-1 rounded-md transition-colors w-fit mt-2"
                  >
                    <PlusCircle size={12} /> Add Step
                  </button>
                </div>
              </div>
            </div>

            {/* Drawer Footer / Actions */}
            <div className="p-4 border-t border-gray-100 bg-[#f8fafc] flex justify-between items-center shrink-0">
              {formData.status === "archived" ? (
                <button className="flex items-center gap-1.5 text-[11px] font-bold text-green-600 hover:text-green-700 transition-colors px-3 py-1.5">
                  <CheckCircle2 size={14} /> Restore Exercise
                </button>
              ) : (
                <button className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 hover:text-red-600 transition-colors px-3 py-1.5">
                  <Archive size={14} /> Archive Exercise
                </button>
              )}

              <div className="flex gap-2">
                <button
                  onClick={closeDrawer}
                  className="px-4 py-1.5 text-[11px] font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                >
                  Cancel
                </button>
                <button className="flex items-center gap-1.5 px-5 py-1.5 text-[11px] font-bold text-white bg-[#1e4ed8] hover:bg-[#113296] rounded-lg shadow-sm shadow-blue-900/20 transition-colors">
                  <Save size={14} /> Save to Database
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Exercises;
