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
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { InputField } from "../ui/InputField";
import { BASE_URL, apiUpload } from "../../api";
import { EquipmentPicker, PartsEditor, SetupEditor, TextListEditor } from "./ExercisePartsEditor";
import { NEW_PART, formatSeconds, partFromStep, partSeconds, stepFromPart } from "./exerciseParts";

const resolveMediaUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const cleanBase = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL;
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${cleanBase}${cleanPath}`;
};

const partSchema = z
  .object({
    instruction: z.string().min(1, "Instruction cannot be empty"),
    details: z.string().optional(),
    mode: z.enum(["time", "count"]).default("time"),
    minutes: z.coerce.number().min(0).default(0),
    seconds: z.coerce.number().min(0).max(59, "Use 0 to 59 seconds").default(30),
    reps: z.coerce.number().min(1).default(10),
    seconds_per_rep: z.coerce.number().min(1).default(3),
    both_sides: z.boolean().default(false),
    // Breathing exercises only: what this step asks for. Empty = the app reads it from the words.
    breath: z.enum(["", "in", "hold", "out"]).optional(),
    image: z.string().optional(),
  })
  .refine((p) => p.mode === "count" || p.minutes * 60 + p.seconds > 0, { message: "Give it a time", path: ["seconds"] });

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
  calories: z.coerce.number().min(0).default(0),
  requirements: z.array(z.string()).default([]),
  position: z.string().optional(),
  setting: z.string().optional(),
  effortHint: z.string().optional(),
  frequency: z.string().optional(),
  easierVersion: z.string().optional(),
  skipIf: z.array(z.object({ value: z.string() })).optional(),
  stopIf: z.array(z.object({ value: z.string() })).optional(),
  setupSteps: z.array(z.object({ instruction: z.string(), details: z.string().optional(), image: z.string().optional() })).optional(),
  warmupParts: z.array(partSchema).optional(),
  mainParts: z.array(partSchema).optional(),
  cooldownParts: z.array(partSchema).optional(),
  rounds: z.coerce.number().min(1, "At least 1").max(20, "20 at most").default(1),
  restSeconds: z.coerce.number().min(0).max(600, "10 minutes at most").default(0),
  guideImages: z.array(z.object({ url: z.string().min(1, "URL cannot be empty") })).optional(),
});

const EMPTY_FORM = {
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
  calories: 0,
  requirements: [],
  position: "",
  setting: "",
  effortHint: "",
  frequency: "",
  easierVersion: "",
  skipIf: [],
  stopIf: [],
  setupSteps: [],
  warmupParts: [],
  mainParts: [{ ...NEW_PART }],
  cooldownParts: [],
  rounds: 1,
  restSeconds: 0,
  guideImages: [],
};

const toValues = (list) => (Array.isArray(list) ? list.filter(Boolean).map((v) => ({ value: typeof v === "string" ? v : v.value || "" })) : []);
const fromValues = (list) => (list || []).map((v) => (v.value || "").trim()).filter(Boolean);

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
    defaultValues: EMPTY_FORM,
    mode: "onTouched",
  });

  const { fields: guideImageFields, append: appendGuideImage, remove: removeGuideImage } = useFieldArray({
    control,
    name: "guideImages",
  });

  const expertValidated = watch("expertValidated");
  const mediaUrl = watch("mediaUrl");
  const status = watch("status");
  const isBreathing = watch("type") === "Breathing";
  const editorProps = { control, register, watch, setValue, errors };
  // Total time, worked out from the parts: warm-up once, the main part each round with rest between, cool-down once.
  const sumParts = (name) => (watch(name) || []).reduce((t, p) => t + partSeconds(p), 0);
  const rounds = Math.max(1, Number(watch("rounds")) || 1);
  const totalSeconds = sumParts("warmupParts") + sumParts("mainParts") * rounds + (Number(watch("restSeconds")) || 0) * (rounds - 1) + sumParts("cooldownParts");
  const [isUploading, setIsUploading] = useState(false);
  // HL-048: upload errors per field ("media" or "guide-<index>"); a rejected file is never saved some other way
  const [uploadErrors, setUploadErrors] = useState({});
  const [picturesNote, setPicturesNote] = useState("");

  // Gives the extra pictures to the steps in order: set-up, warm-up, main, cool-down. Only when
  // the counts match, so a picture never lands on the wrong move.
  const putPicturesOnSteps = () => {
    const urls = (watch("guideImages") || []).map((g) => (g.url || "").trim()).filter(Boolean);
    const slots = ["setupSteps", "warmupParts", "mainParts", "cooldownParts"].flatMap((name) =>
      (watch(name) || []).map((row, i) => ({ name, i, row })).filter(({ row }) => (row.instruction || "").trim())
    );
    if (urls.length === 0 || urls.length !== slots.length) {
      setPicturesNote(`There are ${urls.length} pictures and ${slots.length} steps. Add or remove pictures or steps so they match, then try again.`);
      return;
    }
    slots.forEach(({ name, i }, n) => setValue(`${name}.${i}.image`, urls[n], { shouldDirty: true }));
    setPicturesNote(`Done: ${urls.length} pictures put on the steps in order. Check them under How it's done, then save.`);
  };
  const setUploadError = (key, message) => setUploadErrors((prev) => ({ ...prev, [key]: message }));

  useEffect(() => {
    if (!exercise) {
      reset(EMPTY_FORM);
      return;
    }
    const steps = Array.isArray(exercise.steps) ? exercise.steps : [];
    // Old steps have no section: they all count as the main part.
    const inSection = (section) => steps.filter((s) => (typeof s === "object" && s?.section ? s.section : "main") === section).map(partFromStep);
    const main = inSection("main");
    reset({
      ...EMPTY_FORM,
      ...exercise,
      description: exercise.description || "",
      mediaUrl: exercise.mediaUrl || "",
      videoUrl: exercise.videoUrl || "",
      // "Stretching" was an older type; it plays the same as Stationary.
      type: exercise.type === "Stretching" ? "Stationary" : exercise.type || "General",
      intensity: exercise.intensity === "Medium" ? "Moderate" : exercise.intensity || "Low",
      goal: exercise.goal || "",
      calories: exercise.calories || 0,
      requirements: (exercise.requirements || []).map((r) => (typeof r === "string" ? r : r?.name || r?.value || "")).filter(Boolean),
      position: exercise.position || "",
      setting: exercise.setting || "",
      effortHint: exercise.effortHint || "",
      frequency: exercise.frequency || "",
      easierVersion: exercise.easierVersion || "",
      skipIf: toValues(exercise.skipIf),
      stopIf: toValues(exercise.stopIf),
      setupSteps: (exercise.setupSteps || []).map((s) => ({ instruction: s.instruction || "", details: s.details || "", image: s.image || "" })),
      warmupParts: inSection("warmup"),
      mainParts: main.length ? main : [{ ...NEW_PART }],
      cooldownParts: inSection("cooldown"),
      rounds: exercise.rounds || 1,
      restSeconds: exercise.restSeconds || 0,
      guideImages: (exercise.guideImages || []).map((img) => ({ url: typeof img === "string" ? img : img?.url || "" })),
    });
  }, [exercise, isOpen, reset]);

  const onSubmit = (data) => {
    if (onSave) {
      const breathing = data.type === "Breathing";
      const keep = (parts) => (parts || []).filter((p) => (p.instruction || "").trim());
      const steps = breathing
        ? keep(data.mainParts).map((p) => stepFromPart(p, "main", true))
        : [
            ...keep(data.warmupParts).map((p) => stepFromPart(p, "warmup", false)),
            ...keep(data.mainParts).map((p) => stepFromPart(p, "main", false)),
            ...keep(data.cooldownParts).map((p) => stepFromPart(p, "cooldown", false)),
          ];
      // The three part lists are only for the form; they're saved together as `steps`.
      // eslint-disable-next-line no-unused-vars
      const { warmupParts, mainParts, cooldownParts, ...rest } = data;

      onSave({
        ...rest,
        calories: parseInt(data.calories || 0, 10),
        requirements: (data.requirements || []).map((r) => r.trim()).filter(Boolean),
        skipIf: fromValues(data.skipIf),
        stopIf: fromValues(data.stopIf),
        setupSteps: (data.setupSteps || [])
          .filter((s) => (s.instruction || "").trim())
          .map((s) => ({ instruction: s.instruction.trim(), details: (s.details || "").trim(), ...(s.image ? { image: s.image.trim() } : {}) })),
        steps,
        // Breathing repeats its breaths until its time is up; everything else adds up its parts.
        rounds: breathing ? 1 : data.rounds,
        restSeconds: breathing ? 0 : data.restSeconds,
        duration: breathing ? data.duration : Math.max(1, Math.ceil(totalSeconds / 60)),
        position: data.position || null,
        setting: data.setting || null,
        guideImages: (data.guideImages || []).map((g) => (g.url || "").trim()).filter(Boolean),
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
      <div className="relative w-full max-w-2xl bg-ds-canvas border border-ds-hairline max-h-full rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden text-ds-ink">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-ds-hairline bg-ds-canvas">
          <div>
            <h3 
              className="text-[18px] font-medium text-ds-ink tracking-tight"
            >
              {exercise ? "Edit exercise routine" : "Create new routine"}
            </h3>
            <p className="text-[11px] font-semibold text-ds-steel uppercase tracking-wider mt-0.5 flex items-center gap-1.5">
              <span className="capitalize">{status}</span>
              <span>•</span>
              <span>{watch("hssTarget")}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-ds-slate hover:text-ds-ink hover:bg-ds-surface p-1.5 rounded-lg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Scrollable Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-6 py-5 space-y-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          
          {/* ── BASIC INFORMATION ── */}
          <div>
            <h4 className="text-[11px] font-semibold text-ds-steel uppercase tracking-wider border-b border-ds-hairline pb-2 mb-3.5">
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
                <label className="block text-[13px] font-medium text-ds-ink mb-1">
                  Description
                </label>
                <textarea
                  rows="2"
                  {...register("description")}
                  className={`w-full px-3 py-2 text-[12.5px] bg-ds-canvas border ${
                    errors.description ? 'border-ds-danger' : 'border-ds-hairline-strong focus:border-ds-line'
                  } rounded-[8px] focus:outline-none text-ds-ink placeholder:text-ds-steel transition-colors resize-none`}
                  placeholder="Short text summary of physical benefits…"
                />
                {errors.description && <p className="text-[11px] text-ds-danger mt-1">{errors.description.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[13px] font-medium text-ds-ink mb-1">
                    Exercise Type
                  </label>
                  <select
                    {...register("type")}
                    className="w-full px-3 py-2 text-[13px] font-medium bg-ds-canvas border border-ds-hairline-strong rounded-[8px] focus:outline-none focus:border-ds-line text-ds-ink transition-colors cursor-pointer"
                  >
                    <option value="Breathing">Breathing</option>
                    <option value="Light Cardio">Light Cardio</option>
                    <option value="Stationary">Stationary</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-ds-ink mb-1">
                    Intensity
                  </label>
                  <select
                    {...register("intensity")}
                    className="w-full px-3 py-2 text-[13px] font-medium bg-ds-canvas border border-ds-hairline-strong rounded-[8px] focus:outline-none focus:border-ds-line text-ds-ink transition-colors cursor-pointer"
                  >
                    <option value="None">None</option>
                    <option value="Low">Low</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {isBreathing ? (
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
                    <p className="text-[11px] text-ds-slate mt-1">The breaths repeat until this time is up.</p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[13px] font-medium text-ds-ink mb-1">Total time</label>
                    <div className="flex items-center gap-2 px-3 py-2 text-[13px] font-semibold bg-ds-surface border border-ds-hairline rounded-[8px] text-ds-ink">
                      <Clock size={13} className="text-ds-slate" />
                      {totalSeconds > 0 ? formatSeconds(totalSeconds) : "Add parts below"}
                    </div>
                    <p className="text-[11px] text-ds-slate mt-1">Worked out from the parts below.</p>
                  </div>
                )}

                <div>
                  <label className="block text-[13px] font-medium text-ds-ink mb-1">
                    Routine Goal
                  </label>
                  <input
                    type="text"
                    {...register("goal")}
                    className="w-full px-3 py-2 text-[12.5px] bg-ds-canvas border border-ds-hairline-strong rounded-[8px] focus:outline-none focus:border-ds-line text-ds-ink placeholder:text-ds-steel transition-colors"
                    placeholder="e.g. Builds gentle aerobic endurance…"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── TRACKING & REQUIREMENTS ── */}
          <div>
            <h4 className="text-[11px] font-semibold text-ds-steel uppercase tracking-wider border-b border-ds-hairline pb-2 mb-3.5">
              Tracking & Requirements
            </h4>
            <div className="space-y-4">
              <div>
                <InputField
                  id="calories"
                  type="number"
                  label="Estimated Calories Burned"
                  left={<Activity size={13} />}
                  error={errors.calories}
                  {...register("calories")}
                  min="0"
                  placeholder="e.g. 150"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-ds-ink mb-1">
                  Equipment needed
                </label>
                <p className="text-[11px] text-ds-slate mb-2">Patients tick these off on the app's "Before you start" check.</p>
                <EquipmentPicker
                  value={watch("requirements") || []}
                  onChange={(list) => setValue("requirements", list, { shouldDirty: true })}
                />
              </div>
            </div>
          </div>

          {/* ── WHO IT'S FOR AND SAFETY ── */}
          <div>
            <h4 className="text-[11px] font-semibold text-ds-steel uppercase tracking-wider border-b border-ds-hairline pb-2 mb-3.5">
              Who it's for and safety
            </h4>
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[13px] font-medium text-ds-ink mb-1">Position</label>
                  <select
                    {...register("position")}
                    className="w-full px-3 py-2 text-[13px] font-medium bg-ds-canvas border border-ds-hairline-strong rounded-[8px] focus:outline-none focus:border-ds-line text-ds-ink cursor-pointer"
                  >
                    <option value="">Not set</option>
                    <option value="Seated">Seated</option>
                    <option value="Standing">Standing</option>
                    <option value="Lying down">Lying down</option>
                    <option value="Walking">Walking</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-ds-ink mb-1">Where</label>
                  <select
                    {...register("setting")}
                    className="w-full px-3 py-2 text-[13px] font-medium bg-ds-canvas border border-ds-hairline-strong rounded-[8px] focus:outline-none focus:border-ds-line text-ds-ink cursor-pointer"
                  >
                    <option value="">Not set</option>
                    <option value="Indoors">Indoors</option>
                    <option value="Outdoors">Outdoors</option>
                    <option value="Either">Indoors or outdoors</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <InputField id="effortHint" label="How it should feel" placeholder="e.g. You can still talk while doing it" {...register("effortHint")} />
                <InputField id="frequency" label="How often" placeholder="e.g. 3 times a week" {...register("frequency")} />
              </div>
              <InputField id="easierVersion" label="Easier version" placeholder="e.g. Do it sitting down, with smaller movements" {...register("easierVersion")} />
              <div>
                <label className="block text-[13px] font-medium text-ds-ink mb-1">Skip this exercise if…</label>
                <TextListEditor control={control} register={register} name="skipIf" placeholder="e.g. You have knee pain today" addLabel="Add a reason to skip" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-ds-ink mb-1">Stop right away if…</label>
                <p className="text-[11px] text-ds-slate mb-2">Shown with the app's standard warning signs (chest pain, dizziness, short of breath).</p>
                <TextListEditor control={control} register={register} name="stopIf" placeholder="e.g. Your knee starts to hurt" addLabel="Add a reason to stop" />
              </div>
            </div>
          </div>

          {/* ── TARGETING ── */}
          <div>
            <h4 className="text-[11px] font-semibold text-ds-steel uppercase tracking-wider border-b border-ds-hairline pb-2 mb-3.5">
              Clinical targeting
            </h4>
            <div className="bg-ds-surface/60 p-3.5 rounded-[8px] border border-ds-hairline">
              <label className="block text-[12.5px] font-semibold text-ds-ink mb-0.5">
                HSS Suitability
              </label>
              <p className="text-[11px] text-ds-slate mb-2 font-medium">
                Determines which patients receive this exercise routine based on clinical HSS status.
              </p>
              <select
                {...register("hssTarget")}
                className={`w-full px-3 py-2 text-[13px] font-medium bg-ds-canvas border ${
                  errors.hssTarget ? 'border-ds-danger' : 'border-ds-hairline focus:border-ds-ink'
                } rounded-[8px] focus:outline-none text-ds-ink transition-colors cursor-pointer`}
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
            <h4 className="text-[11px] font-semibold text-ds-steel uppercase tracking-wider border-b border-ds-hairline pb-2 mb-3.5">
              Media assets
            </h4>
            <div className="space-y-4">
              {/* Thumbnail Image */}
              <div>
                <label className="block text-[13px] font-medium text-ds-ink mb-1">
                  Thumbnail Image
                </label>
                <div className="flex gap-2 mb-2.5">
                  <div className="flex-1">
                    <input
                      {...register("mediaUrl")}
                      type="text"
                      placeholder="Paste image URL…"
                      className="w-full text-[12.5px] px-3 py-2 bg-ds-canvas border border-ds-hairline-strong rounded-[8px] focus:outline-none focus:border-ds-line text-ds-ink placeholder:text-ds-steel"
                    />
                  </div>
                  <label className="px-3.5 py-2 bg-ds-surface hover:bg-ds-hairline border border-ds-hairline text-ds-ink text-[12px] font-semibold rounded-[8px] cursor-pointer transition-colors flex items-center justify-center shrink-0">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) {
                          setIsUploading(true);
                          setUploadError("media", "");
                          try {
                            const data = await apiUpload(file, "exercises");
                            setValue("mediaUrl", data.url, { shouldValidate: true, shouldDirty: true });
                          } catch (err) {
                            console.error("Upload error:", err);
                            setUploadError("media", err?.data?.detail || "Upload failed. Please try again.");
                          } finally {
                            setIsUploading(false);
                          }
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                {isUploading && <p className="text-[11px] text-ds-primary font-semibold mb-2">Uploading asset…</p>}
                {uploadErrors.media && <p className="text-[11px] text-ds-danger mb-2">{uploadErrors.media}</p>}
                
                {mediaUrl && !mediaUrl.includes("youtube.com") && !mediaUrl.includes("youtu.be") && (
                  <div className="w-36 h-20 rounded-[8px] overflow-hidden border border-ds-hairline bg-ds-surface flex items-center justify-center">
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
                <label className="block text-[13px] font-medium text-ds-ink mb-1">
                  Instructional Video Link
                </label>
                <input
                  {...register("videoUrl")}
                  type="text"
                  placeholder="Paste YouTube video link…"
                  className="w-full text-[12.5px] px-3 py-2 bg-ds-canvas border border-ds-hairline-strong rounded-[8px] focus:outline-none focus:border-ds-line text-ds-ink placeholder:text-ds-steel mb-2.5"
                />

                {watch("videoUrl") && (watch("videoUrl").includes("youtube.com") || watch("videoUrl").includes("youtu.be")) && (
                  <div className="w-full max-w-md aspect-video rounded-[8px] overflow-hidden border border-ds-hairline bg-black">
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
            <h4 className="text-[11px] font-semibold text-ds-steel uppercase tracking-wider border-b border-ds-hairline pb-2 mb-3.5">
              Extra pictures
            </h4>
            <p className="text-[11px] text-ds-slate -mt-2 mb-3">Shown in the app's Pictures tab. Pictures for a single move go on that move below.</p>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {guideImageFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2.5 border border-ds-hairline rounded-[8px] p-2 bg-ds-surface/40">
                  <div className="w-10 h-10 rounded-[6px] bg-ds-canvas border border-ds-hairline overflow-hidden shrink-0 flex items-center justify-center relative">
                    {watch(`guideImages.${index}.url`) ? (
                      <img src={resolveMediaUrl(watch(`guideImages.${index}.url`))} alt="Guide Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[11px] text-ds-steel font-semibold">No img</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      {...register(`guideImages.${index}.url`)}
                      type="text"
                      placeholder="Paste guide image URL…"
                      className="w-full text-[12px] px-2.5 py-1.5 bg-ds-canvas border border-ds-hairline rounded-[6px] focus:outline-none focus:border-ds-ink text-ds-ink placeholder:text-ds-steel"
                    />
                    <div className="relative mt-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) {
                            setUploadError(`guide-${index}`, "");
                            try {
                              const data = await apiUpload(file, "exercises");
                              setValue(`guideImages.${index}.url`, data.url, { shouldValidate: true, shouldDirty: true });
                            } catch (err) {
                              console.error("Guide upload error:", err);
                              setUploadError(`guide-${index}`, err?.data?.detail || "Upload failed. Please try again.");
                            }
                          }
                        }}
                        className="w-full text-[11px] text-ds-slate file:mr-2 file:py-0.5 file:px-2 file:rounded file:border file:border-ds-hairline file:text-[11px] file:font-semibold file:bg-ds-canvas file:text-ds-ink hover:file:border-ds-line hover:file:text-ds-primary cursor-pointer"
                      />
                      {uploadErrors[`guide-${index}`] && <p className="text-[11px] text-ds-danger mt-1">{uploadErrors[`guide-${index}`]}</p>}
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
                      className="p-1 hover:bg-ds-surface text-ds-slate hover:text-ds-ink disabled:opacity-30 rounded transition-colors cursor-pointer"
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
                      className="p-1 hover:bg-ds-surface text-ds-slate hover:text-ds-ink disabled:opacity-30 rounded transition-colors cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeGuideImage(index)}
                      className="p-1 hover:bg-ds-rose text-ds-slate hover:text-ds-danger rounded transition-colors cursor-pointer"
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
              className="flex items-center gap-1.5 text-[12px] font-semibold text-ds-primary hover:text-ds-primary-pressed transition-colors py-1 mt-2 cursor-pointer"
            >
              <PlusCircle size={14} /> <span>Add guide image</span>
            </button>
            {guideImageFields.length > 0 && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={putPicturesOnSteps}
                  className="text-[12px] font-semibold text-ds-ink border border-ds-hairline hover:border-ds-line rounded-[6px] px-2.5 py-1.5 bg-ds-canvas transition-colors cursor-pointer"
                >
                  Put these pictures on the steps
                </button>
                <p className="text-[11px] text-ds-slate mt-1">
                  {picturesNote || "One picture per step, in order: Get into position first, then warm-up, main part and cool-down."}
                </p>
              </div>
            )}
          </div>

          {/* ── HOW IT'S DONE ── */}
          <div>
            <h4 className="text-[11px] font-semibold text-ds-steel uppercase tracking-wider border-b border-ds-hairline pb-2 mb-3.5">
              How it's done
            </h4>
            <div className="space-y-5">
              <SetupEditor {...editorProps} />

              {isBreathing ? (
                <PartsEditor
                  {...editorProps}
                  name="mainParts"
                  isBreathing
                  title="Breaths"
                  hint="One round of breathing, e.g. breathe in 4 s, hold 4 s, breathe out 6 s. It repeats until the time above is up. Pick what each step asks for so the app's circle can follow it."
                  addLabel="Add a breath"
                />
              ) : (
                <>
                  <PartsEditor {...editorProps} name="warmupParts" title="Warm-up" hint="Done once at the start, e.g. 2 minutes of slow walking." addLabel="Add a warm-up part" />

                  <div className="space-y-3">
                    <PartsEditor
                      {...editorProps}
                      name="mainParts"
                      title="Main part"
                      hint={'Use "A count" for moves done a number of times, e.g. lift each leg 10 times. Tick "Both sides" to repeat it on the other side.'}
                      addLabel="Add a main part"
                    />
                    <div className="grid grid-cols-2 gap-3.5 bg-ds-surface/60 p-3 rounded-[8px] border border-ds-hairline">
                      <div>
                        <InputField id="rounds" type="number" label="Rounds" min="1" max="20" error={errors.rounds} {...register("rounds")} />
                        <p className="text-[11px] text-ds-slate mt-1">How many times the main part repeats.</p>
                      </div>
                      <div>
                        <InputField id="restSeconds" type="number" label="Rest between rounds (sec)" min="0" max="600" error={errors.restSeconds} {...register("restSeconds")} />
                      </div>
                    </div>
                  </div>

                  <PartsEditor {...editorProps} name="cooldownParts" title="Cool-down" hint="Done once at the end, e.g. 3 minutes of slower walking." addLabel="Add a cool-down part" />

                  <p className="text-[12px] font-semibold text-ds-ink bg-ds-tint border border-ds-tint rounded-[8px] px-3 py-2">
                    Total: {totalSeconds > 0 ? formatSeconds(totalSeconds) : "add parts to see the total"}
                    {rounds > 1 ? ` (main part ${rounds} times)` : ""}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* ── EXPERT VALIDATION ── */}
          <div>
            <h4 className="text-[11px] font-semibold text-ds-steel uppercase tracking-wider border-b border-ds-hairline pb-2 mb-3">
              Expert validation
            </h4>
            <div
              onClick={() => setValue("expertValidated", !expertValidated, { shouldValidate: true, shouldDirty: true })}
              className={`p-3.5 rounded-[8px] border cursor-pointer transition-colors ${
                expertValidated
                  ? "bg-ds-mint border-ds-mint"
                  : "bg-ds-surface/60 border-ds-hairline hover:border-ds-steel"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4
                    className={`text-[12.5px] font-semibold ${
                      expertValidated ? "text-ds-charcoal" : "text-ds-ink"
                    } flex items-center gap-1.5 mb-0.5`}
                  >
                    {expertValidated ? (
                      <ShieldCheck size={14} className="text-ds-charcoal" />
                    ) : (
                      <ShieldAlert size={14} className="text-ds-warm-text" />
                    )}
                    {expertValidated ? "Expert reviewed" : "Pending review"}
                  </h4>
                  <p className="text-[11px] text-ds-slate leading-relaxed select-none">
                    Reviewed or developed with input from a qualified cardiology or sports medicine expert.
                  </p>
                  {exercise?.reviewedAt && expertValidated && (
                    <p className="text-[11px] text-ds-charcoal font-medium mt-1">
                      Last checked {new Date(exercise.reviewedAt).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                  )}
                </div>

                <div className="relative inline-flex items-center shrink-0 mt-0.5 pointer-events-none">
                  <div
                    className={`w-9 h-5 rounded-full transition-colors relative ${
                      expertValidated ? "bg-ds-line" : "bg-ds-hairline-strong"
                    }`}
                  >
                    <div
                      className={`absolute top-[2px] left-[2px] bg-ds-canvas rounded-full h-4 w-4 transition-transform ${
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
        <div className="px-6 py-3.5 border-t border-ds-hairline bg-ds-canvas flex justify-between items-center shrink-0">
          <div>
            {exercise && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDelete(exercise);
                }}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-ds-danger hover:text-ds-danger transition-colors cursor-pointer"
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
              className="px-4 py-2 text-[12px] font-semibold text-ds-ink bg-ds-surface hover:bg-ds-hairline border border-ds-hairline rounded-[8px] transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {status === "draft" && (
              <>
                <button
                  type="button"
                  onClick={() => handleSaveWithStatus("draft")}
                  className="px-3.5 py-2 text-[12px] font-semibold text-ds-ink bg-ds-surface hover:bg-ds-hairline border border-ds-hairline rounded-[8px] transition-colors cursor-pointer"
                >
                  Save draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveWithStatus("published")}
                  className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold text-white bg-ds-primary hover:bg-ds-primary rounded-[8px] transition-colors cursor-pointer"
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
                  className="flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-semibold text-ds-warm-text bg-ds-yellow hover:bg-ds-yellow-bold border border-ds-yellow-bold rounded-[8px] transition-colors cursor-pointer"
                >
                  <Archive size={14} />
                  <span>Archive</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveWithStatus("published")}
                  className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold text-white bg-ds-primary hover:bg-ds-primary-pressed rounded-[8px] transition-colors cursor-pointer"
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
                className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold text-white bg-ds-primary hover:bg-ds-primary rounded-[8px] transition-colors cursor-pointer"
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
