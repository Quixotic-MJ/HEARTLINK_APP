import React, { useEffect, useState } from "react";
import {
  X,
  ShieldCheck,
  ShieldAlert,
  Activity,
  PlusCircle,
  Trash2,
  Archive,
  CheckCircle2,
  Save,
  Clock,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { InputField } from "../ui/InputField";
import { BASE_URL, apiUpload } from "../../api";

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
  const [isUploading, setIsUploading] = useState(false);

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
          ? exercise.guideImages.map(img => {
              if (typeof img === 'string') {
                return { url: img };
              } else if (img && typeof img === 'object') {
                return { url: img.url || "" };
              }
              return { url: "" };
            })
          : [],
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

  const onSubmit = (data) => {
    if (onSave) {
      const cleanSteps = (data.steps || [])
        .map(s => (s.value || "").trim())
        .filter(s => s.length > 0);

      const cleanGuides = (data.guideImages || [])
        .map(g => (g.url || "").trim())
        .filter(g => g.length > 0);

      onSave({
        ...data,
        steps: cleanSteps,
        guideImages: cleanGuides,
      });
    }
    onClose();
  };

  const handleSaveWithStatus = (newStatus) => {
    setValue("status", newStatus);
    handleSubmit((data) => {
      onSubmit({ ...data, status: newStatus });
    })();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Panel */}
      <div className="relative w-full max-w-2xl bg-[#FFFFFF] border border-[#DCE3DF] max-h-full rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden text-[#152131]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#DCE3DF] bg-[#FFFFFF]">
          <div>
            <h3 
              className="text-[18px] font-medium text-[#152131] tracking-tight"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              {exercise ? "Edit exercise routine" : "Create new routine"}
            </h3>
            <p className="text-[11px] font-semibold text-[#8B9893] uppercase tracking-wider mt-0.5 flex items-center gap-1.5">
              <span className="capitalize">{status}</span>
              <span>•</span>
              <span>{watch("hssTarget")}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#5C6B66] hover:text-[#152131] hover:bg-[#EDF1EF] p-1.5 rounded-lg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Scrollable Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-6 py-5 space-y-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          
          {/* ── BASIC INFORMATION ── */}
          <div>
            <h4 className="text-[11px] font-semibold text-[#8B9893] uppercase tracking-wider border-b border-[#DCE3DF] pb-2 mb-3.5">
              Basic information
            </h4>
            <div className="space-y-3.5">
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
                <label className="block text-[11px] font-semibold text-[#5C6B66] uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows="2"
                  {...register("description")}
                  className={`w-full px-3 py-2 text-[12.5px] bg-[#EDF1EF] border ${
                    errors.description ? 'border-[#A93226]' : 'border-[#DCE3DF] focus:border-[#152131]'
                  } rounded-[8px] focus:outline-none text-[#152131] placeholder:text-[#8B9893] transition-colors resize-none`}
                  placeholder="Short text summary of physical benefits…"
                />
                {errors.description && <p className="text-[11px] text-[#A93226] mt-1">{errors.description.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#5C6B66] uppercase tracking-wider mb-1">
                    Exercise Type
                  </label>
                  <select
                    {...register("type")}
                    className="w-full px-3 py-2 text-[13px] font-medium bg-[#EDF1EF] border border-[#DCE3DF] rounded-[8px] focus:outline-none focus:border-[#152131] text-[#152131] transition-colors cursor-pointer"
                  >
                    <option value="Breathing">Breathing</option>
                    <option value="Light Cardio">Light Cardio</option>
                    <option value="Stationary">Stationary</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#5C6B66] uppercase tracking-wider mb-1">
                    Intensity
                  </label>
                  <select
                    {...register("intensity")}
                    className="w-full px-3 py-2 text-[13px] font-medium bg-[#EDF1EF] border border-[#DCE3DF] rounded-[8px] focus:outline-none focus:border-[#152131] text-[#152131] transition-colors cursor-pointer"
                  >
                    <option value="None">None</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
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
                  <label className="block text-[11px] font-semibold text-[#5C6B66] uppercase tracking-wider mb-1">
                    Routine Goal
                  </label>
                  <input
                    type="text"
                    {...register("goal")}
                    className="w-full px-3 py-2 text-[12.5px] bg-[#EDF1EF] border border-[#DCE3DF] rounded-[8px] focus:outline-none focus:border-[#152131] text-[#152131] placeholder:text-[#8B9893] transition-colors"
                    placeholder="e.g. Builds gentle aerobic endurance…"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── TARGETING ── */}
          <div>
            <h4 className="text-[11px] font-semibold text-[#8B9893] uppercase tracking-wider border-b border-[#DCE3DF] pb-2 mb-3.5">
              Clinical targeting
            </h4>
            <div className="bg-[#EDF1EF]/60 p-3.5 rounded-[8px] border border-[#DCE3DF]">
              <label className="block text-[12.5px] font-semibold text-[#152131] mb-0.5">
                HSS Suitability
              </label>
              <p className="text-[11px] text-[#5C6B66] mb-2 font-medium">
                Determines which patients receive this exercise routine based on clinical HSS status.
              </p>
              <select
                {...register("hssTarget")}
                className={`w-full px-3 py-2 text-[13px] font-medium bg-[#FFFFFF] border ${
                  errors.hssTarget ? 'border-[#A93226]' : 'border-[#DCE3DF] focus:border-[#152131]'
                } rounded-[8px] focus:outline-none text-[#152131] transition-colors cursor-pointer`}
              >
                <option value="Stable (80-100)">Stable (80-100)</option>
                <option value="Moderate (60-79)">Moderate (60-79)</option>
                <option value="Elevated Risk (50-59)">Elevated Risk (50-59)</option>
                <option value="Critical (<50)">Critical &lt;50</option>
              </select>
            </div>
          </div>

          {/* ── MEDIA ── */}
          <div>
            <h4 className="text-[11px] font-semibold text-[#8B9893] uppercase tracking-wider border-b border-[#DCE3DF] pb-2 mb-3.5">
              Media assets
            </h4>
            <div className="space-y-4">
              {/* Thumbnail Image */}
              <div>
                <label className="block text-[11px] font-semibold text-[#5C6B66] uppercase tracking-wider mb-1">
                  Thumbnail Image
                </label>
                <div className="flex gap-2 mb-2.5">
                  <div className="flex-1">
                    <input
                      {...register("mediaUrl")}
                      type="text"
                      placeholder="Paste image URL…"
                      className="w-full text-[12.5px] px-3 py-2 bg-[#EDF1EF] border border-[#DCE3DF] rounded-[8px] focus:outline-none focus:border-[#152131] text-[#152131] placeholder:text-[#8B9893]"
                    />
                  </div>
                  <label className="px-3.5 py-2 bg-[#EDF1EF] hover:bg-[#DCE3DF] border border-[#DCE3DF] text-[#152131] text-[12px] font-semibold rounded-[8px] cursor-pointer transition-colors flex items-center justify-center shrink-0">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setIsUploading(true);
                          try {
                            const data = await apiUpload(file, "exercises");
                            setValue("mediaUrl", data.url, { shouldValidate: true, shouldDirty: true });
                          } catch (err) {
                            console.error("Upload error:", err);
                          } finally {
                            setIsUploading(false);
                          }
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                {isUploading && <p className="text-[10.5px] text-[#E8532E] font-semibold mb-2">Uploading asset…</p>}
                
                {mediaUrl && !mediaUrl.includes("youtube.com") && !mediaUrl.includes("youtu.be") && (
                  <div className="w-36 h-20 rounded-[8px] overflow-hidden border border-[#DCE3DF] bg-[#EDF1EF] flex items-center justify-center">
                    {mediaUrl.startsWith("data:video") || mediaUrl.endsWith(".mp4") ? (
                      <video src={resolveMediaUrl(mediaUrl)} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={resolveMediaUrl(mediaUrl)} alt="Thumbnail Preview" className="w-full h-full object-cover" />
                    )}
                  </div>
                )}
              </div>

              {/* Instructional Video Link */}
              <div>
                <label className="block text-[11px] font-semibold text-[#5C6B66] uppercase tracking-wider mb-1">
                  Instructional Video Link
                </label>
                <input
                  {...register("videoUrl")}
                  type="text"
                  placeholder="Paste YouTube video link…"
                  className="w-full text-[12.5px] px-3 py-2 bg-[#EDF1EF] border border-[#DCE3DF] rounded-[8px] focus:outline-none focus:border-[#152131] text-[#152131] placeholder:text-[#8B9893] mb-2.5"
                />

                {watch("videoUrl") && (watch("videoUrl").includes("youtube.com") || watch("videoUrl").includes("youtu.be")) && (
                  <div className="w-full max-w-md aspect-video rounded-[8px] overflow-hidden border border-[#DCE3DF] bg-black">
                    <iframe
                      width="100%"
                      height="100%"
                      src={watch("videoUrl").replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── GUIDE IMAGES ── */}
          <div>
            <h4 className="text-[11px] font-semibold text-[#8B9893] uppercase tracking-wider border-b border-[#DCE3DF] pb-2 mb-3.5">
              Movement guide images
            </h4>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {guideImageFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2.5 border border-[#DCE3DF] rounded-[8px] p-2 bg-[#EDF1EF]/40">
                  <div className="w-10 h-10 rounded-[6px] bg-[#FFFFFF] border border-[#DCE3DF] overflow-hidden shrink-0 flex items-center justify-center relative">
                    {watch(`guideImages.${index}.url`) ? (
                      <img src={resolveMediaUrl(watch(`guideImages.${index}.url`))} alt="Guide Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[9px] text-[#8B9893] font-semibold">No img</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      {...register(`guideImages.${index}.url`)}
                      type="text"
                      placeholder="Paste guide image URL…"
                      className="w-full text-[12px] px-2.5 py-1.5 bg-[#FFFFFF] border border-[#DCE3DF] rounded-[6px] focus:outline-none focus:border-[#152131] text-[#152131] placeholder:text-[#8B9893]"
                    />
                    <div className="relative mt-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const data = await apiUpload(file, "exercises");
                              setValue(`guideImages.${index}.url`, data.url, { shouldValidate: true, shouldDirty: true });
                            } catch (err) {
                              console.error("Guide upload error:", err);
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setValue(`guideImages.${index}.url`, reader.result, { shouldValidate: true, shouldDirty: true });
                              };
                              reader.readAsDataURL(file);
                            }
                          }
                        }}
                        className="w-full text-[10px] text-[#5C6B66] file:mr-2 file:py-0.5 file:px-2 file:rounded file:border file:border-[#DCE3DF] file:text-[9.5px] file:font-semibold file:bg-[#FFFFFF] file:text-[#152131] hover:file:border-[#E8532E] hover:file:text-[#E8532E] cursor-pointer"
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
                      className="p-1 hover:bg-[#EDF1EF] text-[#5C6B66] hover:text-[#152131] disabled:opacity-30 rounded transition-colors cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp size={13} />
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
                      className="p-1 hover:bg-[#EDF1EF] text-[#5C6B66] hover:text-[#152131] disabled:opacity-30 rounded transition-colors cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeGuideImage(index)}
                      className="p-1 hover:bg-[#F7E4E1] text-[#5C6B66] hover:text-[#A93226] rounded transition-colors cursor-pointer"
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
              className="flex items-center gap-1.5 text-[12px] font-semibold text-[#E8532E] hover:text-[#C13E20] transition-colors py-1 mt-2 cursor-pointer"
            >
              <PlusCircle size={14} /> <span>Add guide image</span>
            </button>
          </div>

          {/* ── STEP-BY-STEP INSTRUCTIONS ── */}
          <div>
            <h4 className="text-[11px] font-semibold text-[#8B9893] uppercase tracking-wider border-b border-[#DCE3DF] pb-2 mb-3.5">
              Step-by-step instructions
            </h4>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {stepsFields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-2.5 w-full border border-[#DCE3DF] rounded-[8px] p-2.5 bg-[#EDF1EF]/40">
                  <div className="mt-1 text-[10px] font-bold text-[#8B9893] bg-[#FFFFFF] border border-[#DCE3DF] w-5 h-5 flex items-center justify-center rounded-full shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <textarea
                      rows="2"
                      {...register(`steps.${index}.value`)}
                      className={`w-full px-3 py-2 text-[12.5px] bg-[#FFFFFF] border ${
                        errors.steps?.[index]?.value ? 'border-[#A93226]' : 'border-[#DCE3DF] focus:border-[#152131]'
                      } rounded-[6px] focus:outline-none text-[#152131] placeholder:text-[#8B9893] transition-colors resize-none leading-relaxed`}
                      placeholder="Describe this instruction step…"
                    />
                    {errors.steps?.[index]?.value && (
                      <span className="text-[10px] text-[#A93226] mt-1 block font-medium">
                        {errors.steps[index].value.message}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveStepUp(index)}
                      disabled={index === 0}
                      className="p-1 hover:bg-[#EDF1EF] text-[#5C6B66] hover:text-[#152131] disabled:opacity-30 rounded transition-colors cursor-pointer"
                      title="Move Step Up"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStepDown(index)}
                      disabled={index === stepsFields.length - 1}
                      className="p-1 hover:bg-[#EDF1EF] text-[#5C6B66] hover:text-[#152131] disabled:opacity-30 rounded transition-colors cursor-pointer"
                      title="Move Step Down"
                    >
                      <ArrowDown size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-1 hover:bg-[#F7E4E1] text-[#5C6B66] hover:text-[#A93226] rounded transition-colors cursor-pointer"
                      title="Delete Step"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => append({ value: "" })}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-[#E8532E] hover:text-[#C13E20] transition-colors mt-2 cursor-pointer"
            >
              <PlusCircle size={14} /> <span>Add step</span>
            </button>
          </div>

          {/* ── EXPERT VALIDATION ── */}
          <div>
            <h4 className="text-[11px] font-semibold text-[#8B9893] uppercase tracking-wider border-b border-[#DCE3DF] pb-2 mb-3">
              Expert validation
            </h4>
            <div
              onClick={() => setValue("expertValidated", !expertValidated, { shouldValidate: true, shouldDirty: true })}
              className={`p-3.5 rounded-[8px] border cursor-pointer transition-colors ${
                expertValidated
                  ? "bg-[#E3EFEC] border-[#C5DFD8]"
                  : "bg-[#EDF1EF]/60 border-[#DCE3DF] hover:border-[#8B9893]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4
                    className={`text-[12.5px] font-semibold ${
                      expertValidated ? "text-[#1B6E63]" : "text-[#152131]"
                    } flex items-center gap-1.5 mb-0.5`}
                  >
                    {expertValidated ? (
                      <ShieldCheck size={14} className="text-[#1B6E63]" />
                    ) : (
                      <ShieldAlert size={14} className="text-[#A9741B]" />
                    )}
                    {expertValidated ? "Expert reviewed" : "Pending review"}
                  </h4>
                  <p className="text-[11px] text-[#5C6B66] leading-relaxed select-none">
                    Reviewed or developed with input from a qualified cardiology or sports medicine expert.
                  </p>
                </div>

                <div className="relative inline-flex items-center shrink-0 mt-0.5 pointer-events-none">
                  <div
                    className={`w-9 h-5 rounded-full transition-colors relative ${
                      expertValidated ? "bg-[#1B6E63]" : "bg-[#DCE3DF]"
                    }`}
                  >
                    <div
                      className={`absolute top-[2px] left-[2px] bg-white rounded-full h-4 w-4 transition-transform ${
                        expertValidated ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </form>

        {/* Modal Footer / Actions */}
        <div className="px-6 py-3.5 border-t border-[#DCE3DF] bg-[#FFFFFF] flex justify-between items-center shrink-0">
          <div>
            {exercise && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDelete(exercise);
                }}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-[#A93226] hover:text-[#8A1F1A] transition-colors cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Delete routine</span>
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[12px] font-semibold text-[#152131] bg-[#EDF1EF] hover:bg-[#DCE3DF] border border-[#DCE3DF] rounded-[8px] transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {status === "draft" && (
              <>
                <button
                  type="button"
                  onClick={() => handleSaveWithStatus("draft")}
                  className="px-3.5 py-2 text-[12px] font-semibold text-[#152131] bg-[#EDF1EF] hover:bg-[#DCE3DF] border border-[#DCE3DF] rounded-[8px] transition-colors cursor-pointer"
                >
                  Save draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveWithStatus("published")}
                  className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold text-white bg-[#1B6E63] hover:bg-[#14534B] rounded-[8px] shadow-2xs transition-colors cursor-pointer"
                >
                  <CheckCircle2 size={14} />
                  <span>Publish</span>
                </button>
              </>
            )}

            {status === "published" && (
              <>
                <button
                  type="button"
                  onClick={() => handleSaveWithStatus("archived")}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-semibold text-[#A9741B] bg-[#F6EDDD] hover:bg-[#ebd7b8] border border-[#ebd7b8] rounded-[8px] transition-colors cursor-pointer"
                >
                  <Archive size={14} />
                  <span>Archive</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveWithStatus("published")}
                  className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold text-white bg-[#E8532E] hover:bg-[#C13E20] rounded-[8px] shadow-2xs transition-colors cursor-pointer"
                >
                  <Save size={14} />
                  <span>Save changes</span>
                </button>
              </>
            )}

            {status === "archived" && (
              <button
                type="button"
                onClick={() => handleSaveWithStatus("draft")}
                className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold text-white bg-[#1B6E63] hover:bg-[#14534B] rounded-[8px] shadow-2xs transition-colors cursor-pointer"
              >
                <CheckCircle2 size={14} />
                <span>Restore to draft</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExerciseFormModal;
