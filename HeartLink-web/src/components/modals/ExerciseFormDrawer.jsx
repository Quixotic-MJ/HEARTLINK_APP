import React, { useState, useEffect } from "react";
import {
  X,
  ShieldCheck,
  ShieldAlert,
  Activity,
  PlaySquare,
  PlusCircle,
  Trash2,
  Archive,
  CheckCircle2,
  Save,
  Clock,
} from "lucide-react";

const ExerciseFormDrawer = ({ isOpen, onClose, exercise, userRole = "medical", onSave }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    duration: 10,
    cssTarget: "Stable (80-100)",
    videoUrl: "",
    status: "draft",
    expertValidated: false,
  });

  const [steps, setSteps] = useState([""]);

  useEffect(() => {
    if (exercise) {
      setFormData({
        ...exercise,
        description: exercise.description || "",
        videoUrl: exercise.videoUrl || "",
      });
      setSteps(exercise.steps || [""]);
    } else {
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
  }, [exercise, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (onSave) {
      onSave({ ...formData, steps });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Panel */}
      <div className="relative w-full max-w-2xl bg-white max-h-full rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {exercise ? "Edit Exercise Routine" : "Create New Exercise"}
            </h3>
            <p className="text-[10px] font-medium tracking-[0.1em] text-slate-400 uppercase mt-1">
              Manage physical activities and CSS assignments
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Scrollable Form */}
        <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar space-y-8">
          {/* Expert Validation Workflow */}
          <div
            className={`p-4 rounded-xl border ${
              formData.expertValidated
                ? "bg-emerald-50/50 border-emerald-100"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4
                  className={`text-xs font-semibold ${
                    formData.expertValidated ? "text-emerald-700" : "text-slate-900"
                  } flex items-center gap-2 mb-1.5`}
                >
                  {formData.expertValidated ? (
                    <ShieldCheck size={14} className="text-emerald-600" />
                  ) : (
                    <ShieldAlert size={14} className="text-slate-400" />
                  )}
                  Medical Expert Validation
                </h4>
                <p className="text-[10px] text-slate-500 leading-relaxed">
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
                  className={`w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${
                    userRole !== "medical"
                      ? "cursor-not-allowed opacity-50"
                      : ""
                  } peer-checked:bg-emerald-500`}
                ></div>
              </label>
            </div>
          </div>

          {/* Section 1: Basic Information */}
          <div>
            <h4 className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 mb-4">
              Basic Information
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1.5">
                  Routine Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:bg-white transition-colors"
                  placeholder="e.g. 15-Minute Chair Yoga"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1.5">
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
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:bg-white transition-colors resize-none"
                  placeholder="Short text summary of physical benefits..."
                ></textarea>
              </div>

              <div className="w-1/2 pr-2">
                <label className="block text-[11px] font-medium text-slate-700 mb-1.5">
                  Duration (Minutes)
                </label>
                <div className="relative">
                  <Clock
                    size={13}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
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
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:bg-white transition-colors"
                    min="1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Algorithmic Assignment (Critical) */}
          <div>
            <h4 className="text-[10px] font-medium uppercase tracking-[0.2em] border-b pb-2 mb-4 flex items-center gap-2" style={{ color: "#0f172a", borderColor: "rgba(15,23,42,0.1)" }}>
              <Activity size={12} /> Algorithmic Assignment
            </h4>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-[11px] font-medium text-slate-900 mb-1.5">
                CSS Risk Level Suitability
              </label>
              <p className="text-[10px] text-slate-500 mb-3">
                Select the cardiovascular stability states this exercise is
                safe for. The engine uses this to filter content for users.
              </p>
              <select
                value={formData.cssTarget}
                onChange={(e) =>
                  setFormData({ ...formData, cssTarget: e.target.value })
                }
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 transition-colors cursor-pointer"
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
            <h4 className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 mb-4">
              Media & Execution
            </h4>

            <div className="mb-5">
              <label className="block text-[11px] font-medium text-slate-700 mb-1.5">
                Video Guide URL
              </label>
              <div className="relative">
                <PlaySquare
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={formData.videoUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, videoUrl: e.target.value })
                  }
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:bg-white transition-colors"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1.5">
                Step-by-Step Instructions
              </label>
              <p className="text-[10px] text-slate-500 mb-3">
                Build the JSON array of instructions for safe execution.
              </p>
              <div className="space-y-2.5 mb-3">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-1 text-[10px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 w-5 h-5 flex items-center justify-center rounded-full shrink-0">
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
                      className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:bg-white transition-colors resize-none leading-relaxed"
                      placeholder="Describe this step..."
                    />
                    <button
                      onClick={() =>
                        setSteps(steps.filter((_, idx) => idx !== i))
                      }
                      className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100 transition-colors mt-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setSteps([...steps, ""])}
                className="flex items-center gap-1.5 text-[10px] font-medium hover:opacity-75 transition-opacity"
                style={{ color: "#0f172a" }}
              >
                <PlusCircle size={13} /> Add Step
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
          {formData.status === "archived" ? (
            <button
              onClick={() => setFormData({ ...formData, status: "draft" })}
              className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              <CheckCircle2 size={14} /> Restore Exercise
            </button>
          ) : (
            <button
              onClick={() => setFormData({ ...formData, status: "archived" })}
              className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-red-500 transition-colors"
            >
              <Archive size={14} /> Archive Exercise
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[11px] font-medium text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 text-[11px] font-medium text-white rounded-xl transition-all hover:opacity-90 active:scale-[0.99]"
              style={{ backgroundColor: "#0f172a" }}
            >
              <Save size={14} /> Save to Database
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExerciseFormDrawer;
