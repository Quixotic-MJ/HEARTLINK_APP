import { useEffect, useState } from "react";
import {
  X,
  Activity,
  PlusCircle,
  Trash2,
  Archive,
  Clock,
  ArrowUp,
  ArrowDown,
  Ellipsis,
  Maximize2,
  Minimize2,
  AlertCircle,
  Play,
} from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { InputField } from "../ui/InputField";
import { BASE_URL, apiUpload } from "../../api";
import { EquipmentPicker, PartsEditor, SetupEditor, TextListEditor } from "./ExercisePartsEditor";
import CardiologistGuidance from "../care/CardiologistGuidance";
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

// The edit view's tabs, and which fields live on each, so a save that fails opens the right tab.
const TABS = [
  ["basics", "Basics"],
  ["steps", "Steps"],
  ["safety", "Safety"],
  ["media", "Media"],
];
const TAB_FIELDS = {
  basics: ["name", "description", "duration", "type", "intensity", "goal", "hssTarget", "calories"],
  steps: ["setupSteps", "warmupParts", "mainParts", "cooldownParts", "rounds", "restSeconds"],
  safety: ["position", "setting", "effortHint", "frequency", "easierVersion", "skipIf", "stopIf", "requirements"],
  media: ["mediaUrl", "videoUrl", "guideImages"],
};

const toValues = (list) => (Array.isArray(list) ? list.filter(Boolean).map((v) => ({ value: typeof v === "string" ? v : v.value || "" })) : []);
const fromValues = (list) => (list || []).map((v) => (v.value || "").trim()).filter(Boolean);

const ExerciseFormModal = ({ isOpen, onClose, exercise, isPT = false, onSave, onDelete }) => {
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
  // An existing exercise opens in the review view; a new one goes straight to editing.
  const [mode, setMode] = useState("review");
  const [tab, setTab] = useState("basics");
  const [menuOpen, setMenuOpen] = useState(false);
  // HL-038: a PT's note when sending an exercise back for changes.
  const [reviewNote, setReviewNote] = useState("");
  // Normal or expanded size; remembered on this browser only.
  const [expanded, setExpanded] = useState(() => {
    try {
      return localStorage.getItem("hl-exercise-panel-expanded") === "1";
    } catch {
      return false;
    }
  });
  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    try {
      localStorage.setItem("hl-exercise-panel-expanded", next ? "1" : "0");
    } catch {
      // Storage blocked: the size just isn't remembered.
    }
  };
  const openKey = isOpen ? exercise || "new" : null;
  const [shownFor, setShownFor] = useState(null);
  if (openKey !== shownFor) {
    setShownFor(openKey);
    setMode(exercise ? "review" : "edit");
    setTab(exercise ? "steps" : "basics");
    setMenuOpen(false);
    setReviewNote("");
  }

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
    setPicturesNote(`Done: ${urls.length} pictures put on the steps in order. Check them in the Steps tab, then save.`);
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

  // A save that fails checks opens the edit view on the first tab with a problem.
  const onInvalid = (errs) => {
    setMode("edit");
    setTab(TABS.map(([id]) => id).find((id) => TAB_FIELDS[id].some((f) => errs[f])) || "basics");
  };

  const handleSaveWithStatus = (newStatus) => {
    setValue("status", newStatus);
    handleSubmit((data) => {
      onSubmit({ ...data, status: newStatus });
    }, onInvalid)();
  };

  // HL-026: a PT approves (or removes approval) straight from the review view. HL-038: or sends it
  // back with a note, which stays unapproved so patients don't see it.
  const saveApproval = (value) => {
    setValue("expertValidated", value);
    handleSubmit((data) => onSubmit({ ...data, expertValidated: value, reviewNote: value ? "" : reviewNote.trim() }), onInvalid)();
  };

  if (!isOpen) return null;

  // The review view reads the form, so it always shows what would be saved.
  const v = watch();
  const approved = !!exercise?.expertValidated;
  const sentBack = !approved && !!exercise?.reviewNote;
  const approvedOn = exercise?.reviewedAt
    ? new Date(exercise.reviewedAt).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })
    : "";
  const keepParts = (parts) => (parts || []).filter((p) => (p.instruction || "").trim());
  const setup = (v.setupSteps || []).filter((s) => (s.instruction || "").trim());
  const reviewSections = [
    ...(setup.length ? [{ key: "setup", label: "Get into position", parts: setup, untimed: true }] : []),
    ...(isBreathing
      ? [{ key: "main", label: "Breaths, repeated until the time is up", parts: keepParts(v.mainParts) }]
      : [
          { key: "warmup", label: "Warm-up", parts: keepParts(v.warmupParts) },
          { key: "main", label: rounds > 1 ? `Main part, ${rounds} times` : "Main part", parts: keepParts(v.mainParts) },
          { key: "cooldown", label: "Cool-down", parts: keepParts(v.cooldownParts) },
        ]),
  ];
  // A warm-up or cool-down written into the main part plays as main exercise in the app.
  const misplaced = !isBreathing && keepParts(v.mainParts).some((p) => /warm.?up|cool.?down/i.test(p.instruction));
  const notSet = (text = "Not set") => <span className="font-medium text-ds-warm-text">{text}</span>;
  const skipList = fromValues(v.skipIf);
  const stopList = fromValues(v.stopIf);
  const pictureCount = (v.guideImages || []).filter((g) => (g.url || "").trim()).length;
  const tabsWithErrors = new Set(TABS.map(([id]) => id).filter((id) => TAB_FIELDS[id].some((f) => errors[f])));
  const statusChip = {
    published: "bg-ds-mint text-ds-charcoal",
    draft: "bg-ds-yellow text-ds-warm-text border border-ds-yellow-bold",
    archived: "bg-ds-surface-alt text-ds-charcoal",
  }[status] || "bg-ds-surface-alt text-ds-charcoal";
  const secondaryBtn = "h-11 px-4 rounded-[8px] border border-ds-hairline-strong bg-ds-canvas hover:bg-ds-surface text-[14px] font-medium text-ds-ink transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-line";
  const primaryBtn = "h-11 px-[18px] rounded-[8px] bg-ds-primary hover:bg-ds-primary-pressed text-[14px] font-medium text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-line";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-panel-title"
        className={`relative w-full ${expanded ? "max-w-[1280px] h-full" : "max-w-[920px] h-[min(900px,100%)]"} bg-ds-canvas border border-ds-hairline rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden text-ds-ink`}
      >
        {/* Header: name, status chips, more actions, and the tabs while editing */}
        <div className={`px-6 pt-5 border-b border-ds-hairline shrink-0 ${mode === "edit" ? "" : "pb-4"}`}>
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-ds-slate">{!exercise ? "New exercise" : mode === "review" ? "Exercise" : "Editing exercise"}</p>
              <h3 id="exercise-panel-title" className="mt-0.5 text-[21px] leading-[1.3] font-semibold tracking-[-0.01em] truncate">
                {v.name || "Untitled exercise"}
              </h3>
              {exercise && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <span className={`px-2 py-0.5 rounded-[6px] text-[12px] font-semibold capitalize ${statusChip}`}>{status}</span>
                  <span className="px-2 py-0.5 rounded-[6px] text-[12px] font-semibold bg-ds-tint text-ds-on-tint">For {v.hssTarget}</span>
                  <span
                    className={`px-2 py-0.5 rounded-[6px] text-[12px] font-semibold ${
                      approved ? "bg-ds-mint text-ds-charcoal" : "bg-ds-yellow text-ds-warm-text border border-ds-yellow-bold"
                    }`}
                  >
                    {approved ? "PT approved" : sentBack ? "Sent back by PT" : "Waiting for PT approval"}
                  </span>
                </div>
              )}
            </div>

            {exercise && (onDelete || status === "published") && (
              <div className="relative">
                <button
                  type="button"
                  aria-label="More actions"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((open) => !open)}
                  className="w-9 h-9 flex items-center justify-center rounded-[8px] border border-ds-hairline text-ds-slate hover:text-ds-ink hover:bg-ds-surface transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-line"
                >
                  <Ellipsis size={18} />
                </button>
                {menuOpen && (
                  <div role="menu" className="absolute right-0 top-11 z-10 w-48 py-1 rounded-[8px] border border-ds-hairline bg-ds-canvas shadow-[0_16px_48px_-8px_rgba(15,15,15,0.16)]">
                    {status === "published" && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);
                          handleSaveWithStatus("archived");
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-[14px] text-ds-ink hover:bg-ds-surface cursor-pointer"
                      >
                        <Archive size={15} className="text-ds-slate" /> Archive
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);
                          onClose();
                          onDelete(exercise);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-[14px] text-ds-danger hover:bg-ds-rose cursor-pointer"
                      >
                        <Trash2 size={15} /> Delete exercise
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={toggleExpanded}
              aria-label={expanded ? "Make the panel smaller" : "Make the panel bigger"}
              title={expanded ? "Smaller" : "Bigger"}
              className="hidden md:flex w-9 h-9 items-center justify-center rounded-[8px] text-ds-slate hover:text-ds-ink hover:bg-ds-surface transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-line"
            >
              {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-9 h-9 flex items-center justify-center rounded-[8px] text-ds-slate hover:text-ds-ink hover:bg-ds-surface transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-line"
            >
              <X size={18} />
            </button>
          </div>

          {mode === "edit" && (
            <div role="tablist" aria-label="Exercise sections" className="mt-4 flex gap-1 overflow-x-auto">
              {TABS.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`h-11 px-3.5 text-[14px] border-b-2 whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ds-line ${
                    tab === id ? "border-ds-ink font-semibold text-ds-ink" : "border-transparent font-medium text-ds-slate hover:text-ds-ink"
                  }`}
                >
                  {label}
                  {tabsWithErrors.has(id) && (
                    <>
                      <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-ds-danger align-middle" aria-hidden="true" />
                      <span className="sr-only"> (needs fixing)</span>
                    </>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {mode === "review" ? (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {sentBack && (
              <div className="flex gap-2.5 px-3.5 py-3 rounded-xl bg-ds-yellow">
                <AlertCircle size={18} className="shrink-0 mt-px text-ds-warm-text" aria-hidden="true" />
                <p className="text-[14px] leading-normal text-ds-charcoal">
                  <span className="font-semibold">Physical therapist's note:</span> {exercise.reviewNote}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-ds-hairline-soft border border-ds-hairline rounded-xl overflow-hidden">
              {[
                ["Total time", isBreathing ? `${v.duration} min` : totalSeconds > 0 ? formatSeconds(totalSeconds) : "No steps yet"],
                ["Type", v.type],
                ["Intensity", v.intensity],
                ["Calories", Number(v.calories) > 0 ? `About ${v.calories}` : "Not set"],
              ].map(([label, value]) => (
                <div key={label} className="bg-ds-canvas px-3.5 py-3">
                  <p className="text-[12px] text-ds-slate">{label}</p>
                  <p className="mt-0.5 text-[16px] font-semibold">{value}</p>
                </div>
              ))}
            </div>

            {(v.description || v.goal) && (
              <p className="text-[15px] leading-[1.55] text-ds-charcoal">
                {v.description} {v.goal && <span className="text-ds-slate">Goal: {v.goal}</span>}
              </p>
            )}

            <section>
              <h4 className="text-[16px] font-semibold mb-2.5">What patients will do</h4>
              {misplaced && (
                <div className="flex gap-2.5 mb-3 px-3.5 py-3 rounded-xl bg-ds-yellow">
                  <AlertCircle size={18} className="shrink-0 mt-px text-ds-warm-text" aria-hidden="true" />
                  <p className="text-[14px] leading-normal text-ds-charcoal">
                    <span className="font-semibold">Check before approving:</span> a warm-up or cool-down step is in the main part, so the app guides it as
                    main exercise. Move it to Warm-up or Cool-down in the Steps tab.
                  </p>
                </div>
              )}
              <div className="border border-ds-hairline rounded-xl overflow-hidden">
                {reviewSections.map((section, s) => (
                  <div key={section.key} className={s > 0 ? "border-t border-ds-hairline-soft" : ""}>
                    <div className="flex justify-between gap-3 px-3.5 py-2.5 bg-ds-surface text-[13px] font-semibold text-ds-charcoal">
                      <span>{section.label}</span>
                      <span className="font-medium text-ds-slate">
                        {section.untimed
                          ? "Before the timer"
                          : section.parts.length
                            ? formatSeconds(section.parts.reduce((t, p) => t + partSeconds(p), 0))
                            : "None"}
                      </span>
                    </div>
                    {section.parts.map((p, i) => (
                      <div key={i} className="flex gap-3 px-3.5 py-3 border-t border-ds-hairline-soft">
                        <span className="w-6 h-6 shrink-0 rounded-[6px] bg-ds-surface-alt text-[13px] font-semibold flex items-center justify-center">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-medium">{p.instruction}</p>
                          {p.details && <p className="mt-0.5 text-[13px] text-ds-slate">{p.details}</p>}
                        </div>
                        {!section.untimed && (
                          <span className="text-[13px] text-ds-slate shrink-0">
                            {formatSeconds(partSeconds(p))}
                            {p.both_sides ? ", both sides" : ""}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <section className="border border-ds-hairline rounded-xl px-4 py-3.5">
                <h4 className="text-[16px] font-semibold mb-2.5">Safety</h4>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-[14px]">
                  <dt className="text-ds-slate">Skip if</dt>
                  <dd>{skipList.length ? skipList.join("; ") : notSet("Nothing added")}</dd>
                  <dt className="text-ds-slate">Stop if</dt>
                  <dd>{stopList.length ? stopList.join("; ") : "Standard warning signs only"}</dd>
                  <dt className="text-ds-slate">Position</dt>
                  <dd>{v.position || notSet()}</dd>
                  <dt className="text-ds-slate">Where</dt>
                  <dd>{v.setting === "Either" ? "Indoors or outdoors" : v.setting || notSet()}</dd>
                  <dt className="text-ds-slate">Should feel</dt>
                  <dd>{v.effortHint || notSet()}</dd>
                  <dt className="text-ds-slate">How often</dt>
                  <dd>{v.frequency || notSet()}</dd>
                  <dt className="text-ds-slate">Easier version</dt>
                  <dd>{v.easierVersion || "None"}</dd>
                </dl>
              </section>
              <section className="border border-ds-hairline rounded-xl px-4 py-3.5">
                <h4 className="text-[16px] font-semibold mb-1">Before you start</h4>
                <p className="text-[13px] text-ds-slate mb-2.5">Patients tick these off in the app.</p>
                {(v.requirements || []).length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {v.requirements.map((item) => (
                      <span key={item} className="px-2.5 py-1 rounded-full bg-ds-surface-alt text-[13px] text-ds-charcoal">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[14px] text-ds-charcoal">Nothing needed</p>
                )}
                <div className="mt-4 flex items-center gap-2.5">
                  <div className="w-16 h-11 shrink-0 rounded-[6px] overflow-hidden bg-ds-tint flex items-center justify-center text-ds-primary-pressed">
                    {mediaUrl && !mediaUrl.includes("youtu") ? (
                      <img src={resolveMediaUrl(mediaUrl)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Play size={16} aria-hidden="true" />
                    )}
                  </div>
                  <span className="text-[13px] text-ds-slate">
                    {[v.videoUrl ? "Video" : "No video", `${pictureCount} ${pictureCount === 1 ? "picture" : "pictures"}`].join(", ")}
                  </span>
                </div>
              </section>
            </div>

            {exercise && <CardiologistGuidance />}

            {isPT && exercise && (
              <section className="border border-ds-hairline rounded-xl px-4 py-3.5 space-y-2.5">
                <label htmlFor="exercise-review-note" className="block text-[14px] font-semibold text-ds-ink">
                  Send it back for changes <span className="font-normal text-ds-slate">(optional)</span>
                </label>
                <textarea
                  id="exercise-review-note"
                  rows="2"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="e.g. Too intense for patients in the Critical band; add a seated version."
                  className="w-full px-3 py-2 text-[14px] bg-ds-canvas border border-ds-hairline-strong focus:border-ds-line rounded-[8px] focus:outline-none text-ds-ink placeholder:text-ds-steel resize-none"
                />
                <div className="flex justify-end">
                  <button type="button" disabled={!reviewNote.trim()} onClick={() => saveApproval(false)} className={secondaryBtn}>
                    Send back with note
                  </button>
                </div>
              </section>
            )}
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit, onInvalid)}
            className="flex-1 overflow-y-auto px-6 py-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {tab === "basics" && (
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
                      {totalSeconds > 0 ? formatSeconds(totalSeconds) : "Add steps in the Steps tab"}
                    </div>
                    <p className="text-[11px] text-ds-slate mt-1">Worked out from the steps in the Steps tab.</p>
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
            )}
            {tab === "steps" && (
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
            )}
            {tab === "safety" && (
              <div className="space-y-4">
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
                <div>
                  <label className="block text-[13px] font-medium text-ds-ink mb-1">Before you start</label>
                <p className="text-[11px] text-ds-slate mb-2">Patients tick these off on the app's "Before you start" check.</p>
                <EquipmentPicker
                  value={watch("requirements") || []}
                  onChange={(list) => setValue("requirements", list, { shouldDirty: true })}
                />
                </div>
              </div>
            )}
            {tab === "media" && (
              <div className="space-y-5">
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
                <div>
                  <label className="block text-[13px] font-medium text-ds-ink mb-1">Extra pictures</label>
            <p className="text-[11px] text-ds-slate -mt-2 mb-3">Shown in the app's Pictures tab. Pictures for a single step go on that step in the Steps tab.</p>
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
              </div>
            )}
          </form>
        )}

        {/* Footer: one blue button per view */}
        <div className="px-6 py-3.5 border-t border-ds-hairline bg-ds-canvas flex flex-wrap items-center justify-end gap-2.5 shrink-0">
          {mode === "review" ? (
            <>
              <p className="flex-1 min-w-[200px] text-[13px] leading-snug text-ds-slate">
                {approved
                  ? `Approved by a physical therapist${approvedOn ? ` on ${approvedOn}` : ""}.`
                  : isPT
                    ? "Patients only see this exercise after you approve it."
                    : "Patients can't see this until a physical therapist approves it."}
              </p>
              {isPT && approved && (
                <button type="button" onClick={() => saveApproval(false)} className={secondaryBtn}>
                  Remove approval
                </button>
              )}
              {isPT && !approved ? (
                <>
                  <button type="button" onClick={() => setMode("edit")} className={secondaryBtn}>
                    Edit details
                  </button>
                  <button type="button" onClick={() => saveApproval(true)} className={primaryBtn}>
                    Approve for patients
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setMode("edit")} className={primaryBtn}>
                  Edit details
                </button>
              )}
            </>
          ) : (
            <>
              <p className="flex-1 min-w-[200px] text-[13px] leading-snug text-ds-slate">
                {isPT ? "" : exercise ? "Saving sends it back to a physical therapist for approval." : "A physical therapist approves it before patients see it."}
              </p>
              <button type="button" onClick={onClose} className={secondaryBtn}>
                Cancel
              </button>
              {status === "draft" && (
                <>
                  <button type="button" onClick={() => handleSaveWithStatus("draft")} className={secondaryBtn}>
                    Save draft
                  </button>
                  <button type="button" onClick={() => handleSaveWithStatus("published")} className={primaryBtn}>
                    Publish
                  </button>
                </>
              )}
              {status === "published" && (
                <button type="button" onClick={() => handleSaveWithStatus("published")} className={primaryBtn}>
                  Save changes
                </button>
              )}
              {status === "archived" && (
                <button type="button" onClick={() => handleSaveWithStatus("draft")} className={primaryBtn}>
                  Restore to draft
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExerciseFormModal;
