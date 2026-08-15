import React, { useEffect } from "react";
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
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { InputField } from "../ui/InputField";
import { BASE_URL } from "../../api";

const resolveMediaUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const cleanBase = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL;
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${cleanBase}${cleanPath}`;
};

const exerciseSchema = z.object({
  name: z.string().min(1, "Name is required."),
  description: z.string().min(1, "Description is required."),
  duration: z.coerce.number().min(1, "Must be at least 1 minute."),
  hssTarget: z.string().default("Stable (80-100)"),
  mediaUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  type: z.string().default("General"),
  intensity: z.string().default("Low"),
  goal: z.string().optional(),
  status: z.string().default("draft"),
  expertValidated: z.boolean().default(false),
  steps: z.array(z.object({ value: z.string().min(1, "Step cannot be empty") })).optional(),
  guideImages: z.array(z.object({ url: z.string().min(1, "URL cannot be empty") })).optional(),
});

const ExerciseFormModal = ({ isOpen, onClose, exercise, userRole = "medical", onSave, onDelete }) => {
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      name: "",
      description: "",
      duration: 10,
      hssTarget: "Stable (80-100)",
      mediaUrl: "",
      videoUrl: "",
      type: "General",
      intensity: "Low",
      goal: "",
      status: "draft",
      expertValidated: false,
      steps: [{ value: "" }],
      guideImages: [],
    },
    mode: "onTouched",
  });

  const { fields: stepsFields, append, remove, move } = useFieldArray({
    control,
    name: "steps",
  });

  const moveStepUp = (index) => {
    if (index > 0) {
      move(index, index - 1);
    }
  };

  const moveStepDown = (index) => {
    if (index < stepsFields.length - 1) {
      move(index, index + 1);
    }
  };

  const { fields: guideImageFields, append: appendGuideImage, remove: removeGuideImage } = useFieldArray({
    control,
    name: "guideImages",
  });

  const expertValidated = watch("expertValidated");
  const mediaUrl = watch("mediaUrl");
  const status = watch("status");
  const [isUploading, setIsUploading] = React.useState(false);

  useEffect(() => {
    if (exercise) {
      reset({
        ...exercise,
        description: exercise.description || "",
        mediaUrl: exercise.mediaUrl || "",
        videoUrl: exercise.videoUrl || "",
        type: exercise.type || "General",
        intensity: exercise.intensity || "Low",
        goal: exercise.goal || "",
        steps: exercise.steps 
          ? exercise.steps.map(step => {
              if (typeof step === 'string') {
                return { value: step };
              } else if (step && typeof step === 'object') {
                return { value: step.instruction || "" };
              }
              return { value: "" };
            })
          : [{ value: "" }],
        guideImages: exercise.guideImages
          ? exercise.guideImages.map(url => (typeof url === 'string' ? { url } : { url: url.url || "" }))
          : (exercise.guide_images 
              ? exercise.guide_images.map(url => (typeof url === 'string' ? { url } : { url: url.url || "" }))
              : []),
      });
    } else {
      reset({
        name: "",
        description: "",
        duration: 10,
        hssTarget: "Stable (80-100)",
        mediaUrl: "",
        videoUrl: "",
        type: "General",
        intensity: "Low",
        goal: "",
        status: "draft",
        expertValidated: false,
        steps: [{ value: "" }],
        guideImages: [],
      });
    }
  }, [exercise, isOpen, reset]);

  const handleSaveWithStatus = (newStatus) => {
    setValue("status", newStatus, { shouldValidate: true, shouldDirty: true });
  };

  const onSubmit = (data) => {
    if (onSave) {
      const originalSteps = exercise?.steps || [];
      const flatSteps = data.steps ? data.steps.map((s, index) => {
        const originalStep = originalSteps[index];
        if (originalStep && typeof originalStep === 'object') {
          return {
            ...originalStep,
            instruction: s.value
          };
        }
        return s.value;
      }) : [];
      const flatGuideImages = data.guideImages ? data.guideImages.map(gi => gi.url) : [];
      onSave({ ...data, steps: flatSteps, guideImages: flatGuideImages });
    }
    onClose();
  };

  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log("Validation Errors:", errors);
    }
  }, [errors]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Panel */}
      <form onSubmit={handleSubmit(onSubmit)} className="relative w-full max-w-2xl bg-white max-h-[90vh] rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Modal Header (Fixed) */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white shrink-0">
          <div>
            <span className="text-[9px] font-bold tracking-[0.15em] text-slate-400 uppercase">
              {exercise ? "Edit Exercise" : "Create Exercise"}
            </span>
            <h3 className="text-sm font-semibold text-slate-900 mt-0.5">
              {watch("name") || (exercise ? exercise.name : "New Exercise")}
            </h3>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${status === "published" ? "bg-emerald-500" : status === "draft" ? "bg-amber-500" : "bg-slate-400"}`}></span>
              <span className="capitalize">{status}</span>
              <span className="text-slate-300">•</span>
              <span>{watch("hssTarget")}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar space-y-8">
          {/* Section 1: Basic Information */}
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 mb-4">
              Basic Information
            </h4>
            <div className="space-y-4">
              <div>
                <InputField
                  id="name"
                  label="Routine Name"
                  placeholder="e.g. 15-Minute Chair Yoga"
                  error={errors.name}
                  {...register("name")}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1.5">
                  Description
                </label>
                <textarea
                  rows="2"
                  {...register("description")}
                  className={`w-full px-3 py-2 text-xs bg-slate-50 border ${errors.description ? 'border-red-400' : 'border-slate-200'} rounded-xl focus:outline-none focus:border-slate-400 focus:bg-white transition-colors resize-none`}
                  placeholder="Short text summary of physical benefits..."
                ></textarea>
                {errors.description && <p className="text-[11px] text-red-500 mt-1">{errors.description.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1.5">
                    Exercise Type
                  </label>
                  <select
                    {...register("type")}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:bg-white transition-colors cursor-pointer"
                  >
                    <option value="Breathing">Breathing</option>
                    <option value="Light Cardio">Light Cardio</option>
                    <option value="Stationary">Stationary</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1.5">
                    Intensity
                  </label>
                  <select
                    {...register("intensity")}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:bg-white transition-colors cursor-pointer"
                  >
                    <option value="None">None</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <InputField
                    id="duration"
                    type="number"
                    label="Duration (Minutes)"
                    left={<Clock size={13} />}
                    error={errors.duration}
                    {...register("duration")}
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1.5">
                    Routine Goal
                  </label>
                  <input
                    type="text"
                    {...register("goal")}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:bg-white transition-colors"
                    placeholder="e.g. Builds gentle endurance..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Targeting */}
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 mb-4">
              Targeting
            </h4>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-[11px] font-bold text-slate-900 mb-1">
                HSS Suitability
              </label>
              <p className="text-[10px] text-slate-500 mb-2.5">
                Determines which users may receive this exercise.
              </p>
              <select
                {...register("hssTarget")}
                className={`w-full px-3 py-2 text-xs bg-white border ${errors.hssTarget ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-slate-400'} rounded-xl focus:outline-none transition-colors cursor-pointer`}
              >
                <option value="Stable (80-100)">Stable (80-100)</option>
                <option value="Moderate (60-79)">Moderate (60-79)</option>
                <option value="Elevated Risk (50-59)">Elevated Risk (50-59)</option>
                <option value="Critical (<50)">Critical (&lt;50)</option>
              </select>
            </div>
          </div>

          {/* Section 3: Media */}
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 mb-4">
              Media Assets
            </h4>
            <div className="space-y-6">
              {/* Thumbnail Image */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                  Thumbnail Image
                </label>
                <div className="flex gap-2 mb-3">
                  <div className="flex-1">
                    <input
                      {...register("mediaUrl")}
                      type="text"
                      placeholder="Paste image URL..."
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:bg-white"
                    />
                  </div>
                  <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-[11px] font-semibold rounded-xl cursor-pointer transition-colors flex items-center justify-center">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploading}
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setIsUploading(true);
                          try {
                            const formData = new FormData();
                            formData.append("file", file);
                            const response = await fetch(`${BASE_URL}/api/upload`, {
                              method: "POST",
                              body: formData,
                            });
                            if (!response.ok) throw new Error("Upload failed");
                            const data = await response.json();
                            setValue("mediaUrl", data.url, { shouldValidate: true, shouldDirty: true });
                          } catch (err) {
                            console.error("Upload error:", err);
                            alert("Failed to upload file.");
                          } finally {
                            setIsUploading(false);
                          }
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                {isUploading && <p className="text-[10px] text-blue-500 mb-2">Uploading...</p>}
                
                {mediaUrl && !mediaUrl.includes("youtube.com") && !mediaUrl.includes("youtu.be") && (
                  <div className="w-40 h-24 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                    {mediaUrl.startsWith("data:video") || mediaUrl.endsWith(".mp4") ? (
                      <video src={resolveMediaUrl(mediaUrl)} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={resolveMediaUrl(mediaUrl)} alt="Thumbnail Preview" className="w-full h-full object-cover" />
                    )}
                  </div>
                )}
              </div>

              {/* Instructional Video */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                  Instructional Video
                </label>
                <input
                  {...register("videoUrl")}
                  type="text"
                  placeholder="Paste YouTube video link..."
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:bg-white mb-3"
                />

                {watch("videoUrl") && (watch("videoUrl").includes("youtube.com") || watch("videoUrl").includes("youtu.be")) && (
                  <div className="w-full max-w-md aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                    <iframe
                      width="100%"
                      height="100%"
                      src={watch("videoUrl").replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Guide Images */}
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 mb-4">
              Movement Guide Images
            </h4>
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {guideImageFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-3 border border-slate-200 rounded-xl p-2.5 bg-slate-50/50">
                  <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center relative">
                    {watch(`guideImages.${index}.url`) ? (
                      <img src={resolveMediaUrl(watch(`guideImages.${index}.url`))} alt="Guide Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[9px] text-slate-400">No Image</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      {...register(`guideImages.${index}.url`)}
                      type="text"
                      placeholder="Paste guide image URL..."
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
                    />
                    <div className="relative mt-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (file) {
                            try {
                              const formData = new FormData();
                              formData.append("file", file);
                              const response = await fetch(`${BASE_URL}/api/upload`, {
                                method: "POST",
                                body: formData,
                              });
                              if (!response.ok) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setValue(`guideImages.${index}.url`, reader.result, { shouldValidate: true, shouldDirty: true });
                                };
                                reader.readAsDataURL(file);
                                return;
                              }
                              const data = await response.json();
                              setValue(`guideImages.${index}.url`, data.url, { shouldValidate: true, shouldDirty: true });
                            } catch (err) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setValue(`guideImages.${index}.url`, reader.result, { shouldValidate: true, shouldDirty: true });
                              };
                              reader.readAsDataURL(file);
                            }
                          }
                        }}
                        className="w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-semibold file:bg-slate-100 hover:file:bg-slate-200 cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (index > 0) {
                          const currentVal = watch(`guideImages.${index}.url`);
                          const prevVal = watch(`guideImages.${index - 1}.url`);
                          setValue(`guideImages.${index}.url`, prevVal, { shouldDirty: true });
                          setValue(`guideImages.${index - 1}.url`, currentVal, { shouldDirty: true });
                        }
                      }}
                      disabled={index === 0}
                      className="p-1.5 hover:bg-white text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg transition-colors"
                      title="Move Up"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (index < guideImageFields.length - 1) {
                          const currentVal = watch(`guideImages.${index}.url`);
                          const nextVal = watch(`guideImages.${index + 1}.url`);
                          setValue(`guideImages.${index}.url`, nextVal, { shouldDirty: true });
                          setValue(`guideImages.${index + 1}.url`, currentVal, { shouldDirty: true });
                        }
                      }}
                      disabled={index === guideImageFields.length - 1}
                      className="p-1.5 hover:bg-white text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg transition-colors"
                      title="Move Down"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={() => removeGuideImage(index)}
                      className="p-1.5 hover:bg-white text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                      title="Remove"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => appendGuideImage({ url: "" })}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-700 transition-colors py-1.5 px-2.5 rounded hover:bg-slate-100 mt-2"
            >
              <PlusCircle size={13} /> Add Guide Image
            </button>
          </div>

          {/* Section 5: Instructions */}
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 mb-4">
              Step-by-Step Instructions
            </h4>
            <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
              {stepsFields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-3 w-full border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                  <div className="mt-1 text-[10px] font-bold text-slate-400 bg-white border border-slate-200 w-5 h-5 flex items-center justify-center rounded-full shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <textarea
                      rows="2"
                      {...register(`steps.${index}.value`)}
                      className={`w-full px-3 py-2 text-xs bg-white border ${errors.steps?.[index]?.value ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-slate-400'} rounded-xl focus:outline-none focus:bg-white transition-colors resize-none leading-relaxed`}
                      placeholder="Describe this instruction step..."
                    />
                    {errors.steps?.[index]?.value && (
                      <span className="text-[10px] text-red-500 mt-1 block">
                        {errors.steps[index].value.message}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveStepUp(index)}
                      disabled={index === 0}
                      className="p-1.5 hover:bg-white text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg transition-colors"
                      title="Move Step Up"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStepDown(index)}
                      disabled={index === stepsFields.length - 1}
                      className="p-1.5 hover:bg-white text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg transition-colors"
                      title="Move Step Down"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-1.5 hover:bg-white text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                      title="Delete Step"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => append({ value: "" })}
              className="flex items-center gap-1.5 text-[10px] font-bold mt-3 hover:opacity-75 transition-opacity"
              style={{ color: "#0f172a" }}
            >
              <PlusCircle size={13} /> Add Step
            </button>
          </div>

          {/* Section 6: Validation Toggle */}
          <div className="border-t border-slate-100 pt-6">
            <div
              className={`p-4 rounded-xl border ${
                expertValidated
                  ? "bg-emerald-50/50 border-emerald-100"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4
                    className={`text-xs font-semibold ${
                      expertValidated ? "text-emerald-700" : "text-slate-900"
                    } flex items-center gap-2 mb-1`}
                  >
                    {expertValidated ? (
                      <ShieldCheck size={14} className="text-emerald-600" />
                    ) : (
                      <ShieldAlert size={14} className="text-slate-400" />
                    )}
                    Expert Reviewer Validation
                  </h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Reviewed or developed with input from a qualified nutrition expert.
                  </p>
                </div>
  
                {/* Toggle Switch */}
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    disabled={userRole !== "medical"}
                    {...register("expertValidated")}
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
          </div>
        </div>

        {/* Sticky Footer / Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0 sticky bottom-0 z-10">
          {/* Left Actions (Delete) */}
          <div>
            {exercise && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Are you sure you want to permanently delete this exercise routine?")) {
                    onDelete(exercise.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} /> Delete Exercise
              </button>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>

            {/* If Draft: Save Draft + Publish */}
            {status === "draft" && (
              <>
                <button
                  type="submit"
                  onClick={() => handleSaveWithStatus("draft")}
                  className="px-4 py-2 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Save Draft
                </button>
                <button
                  type="submit"
                  onClick={() => handleSaveWithStatus("published")}
                  className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors"
                >
                  <CheckCircle2 size={14} /> Publish
                </button>
              </>
            )}

            {/* If Published: Save Changes + Archive */}
            {status === "published" && (
              <>
                <button
                  type="submit"
                  onClick={() => handleSaveWithStatus("archived")}
                  className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  <Archive size={14} /> Archive
                </button>
                <button
                  type="submit"
                  onClick={() => handleSaveWithStatus("published")}
                  className="flex items-center gap-1.5 px-5 py-2 text-[11px] font-semibold text-white rounded-xl transition-all hover:opacity-90 active:scale-[0.99]"
                  style={{ backgroundColor: "#0f172a" }}
                >
                  <Save size={14} /> Save Changes
                </button>
              </>
            )}

            {/* If Archived: Restore to Draft */}
            {status === "archived" && (
              <button
                type="submit"
                onClick={() => handleSaveWithStatus("draft")}
                className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
              >
                <CheckCircle2 size={14} /> Restore to Draft
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default ExerciseFormModal;
