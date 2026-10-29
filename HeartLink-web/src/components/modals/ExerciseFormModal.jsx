import { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  Archive,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Clock,
  Ellipsis,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  Play,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { InputField } from "../ui/InputField";
import { BASE_URL, apiUpload } from "../../api";
import {
  EquipmentPicker,
  PartsEditor,
  SetupEditor,
  TextListEditor,
} from "./ExercisePartsEditor";
import CardiologistGuidance from "../care/CardiologistGuidance";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import {
  NEW_PART,
  formatSeconds,
  partFromStep,
  partSeconds,
  stepFromPart,
} from "./exerciseParts";

const resolveMediaUrl = (url) => {
  if (!url) return "";
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:")
  ) {
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
    seconds: z.coerce
      .number()
      .min(0)
      .max(59, "Use 0 to 59 seconds")
      .default(30),
    reps: z.coerce.number().min(1).default(10),
    seconds_per_rep: z.coerce.number().min(1).default(3),
    both_sides: z.boolean().default(false),
    // Breathing exercises only: what this step asks for. Empty = the app reads it from the words.
    breath: z.enum(["", "in", "hold", "out"]).optional(),
    image: z.string().optional(),
  })
  .refine((p) => p.mode === "count" || p.minutes * 60 + p.seconds > 0, {
    message: "Give it a time",
    path: ["seconds"],
  });

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
  setupSteps: z
    .array(
      z.object({
        instruction: z.string(),
        details: z.string().optional(),
        image: z.string().optional(),
      })
    )
    .optional(),
  warmupParts: z.array(partSchema).optional(),
  mainParts: z.array(partSchema).optional(),
  cooldownParts: z.array(partSchema).optional(),
  rounds: z.coerce
    .number()
    .min(1, "At least 1")
    .max(20, "20 at most")
    .default(1),
  restSeconds: z.coerce
    .number()
    .min(0)
    .max(600, "10 minutes at most")
    .default(0),
  guideImages: z
    .array(z.object({ url: z.string().min(1, "URL cannot be empty") }))
    .optional(),
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
  basics: [
    "name",
    "description",
    "duration",
    "type",
    "intensity",
    "goal",
    "hssTarget",
    "calories",
  ],
  steps: [
    "setupSteps",
    "warmupParts",
    "mainParts",
    "cooldownParts",
    "rounds",
    "restSeconds",
  ],
  safety: [
    "position",
    "setting",
    "effortHint",
    "frequency",
    "easierVersion",
    "skipIf",
    "stopIf",
    "requirements",
  ],
  media: ["mediaUrl", "videoUrl", "guideImages"],
};

const PILL =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold leading-none whitespace-nowrap";

const toValues = (list) =>
  Array.isArray(list)
    ? list
        .filter(Boolean)
        .map((v) => ({ value: typeof v === "string" ? v : v.value || "" }))
    : [];
const fromValues = (list) =>
  (list || []).map((v) => (v.value || "").trim()).filter(Boolean);

const ExerciseFormModal = ({
  isOpen,
  onClose,
  exercise,
  isPT = false,
  onSave,
  onDelete,
}) => {
  const dialogRef = useRef(null);
  useDialogFocus(isOpen, dialogRef, onClose);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(exerciseSchema),
    defaultValues: EMPTY_FORM,
    mode: "onTouched",
  });

  const {
    fields: guideImageFields,
    append: appendGuideImage,
    remove: removeGuideImage,
  } = useFieldArray({
    control,
    name: "guideImages",
  });

  const watchedValues = useWatch({ control });
  const v = { ...EMPTY_FORM, ...watchedValues };

  const mediaUrl = v.mediaUrl || "";
  const videoUrl = v.videoUrl || "";
  const status = v.status || "draft";
  const isBreathing = v.type === "Breathing";
  const editorProps = { control, register, setValue, errors };

  // Total time, worked out from the parts: warm-up once, the main part each round with rest between, cool-down once.
  const sumParts = (name) =>
    (v[name] || []).reduce((t, p) => t + partSeconds(p), 0);
  const rounds = Math.max(1, Number(v.rounds) || 1);
  const totalSeconds =
    sumParts("warmupParts") +
    sumParts("mainParts") * rounds +
    (Number(v.restSeconds) || 0) * (rounds - 1) +
    sumParts("cooldownParts");

  const [isUploading, setIsUploading] = useState(false);
  // HL-048: upload errors per field ("media" or "guide-<index>"); a rejected file is never saved some other way
  const [uploadErrors, setUploadErrors] = useState({});
  const [picturesNote, setPicturesNote] = useState("");
  const [failedMediaUrl, setFailedMediaUrl] = useState(null);
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
    setUploadErrors({});
    setPicturesNote("");
  }

  // Gives the extra pictures to the steps in order: set-up, warm-up, main, cool-down. Only when
  // the counts match, so a picture never lands on the wrong move.
  const putPicturesOnSteps = () => {
    const urls = (v.guideImages || [])
      .map((g) => (g.url || "").trim())
      .filter(Boolean);
    const slots = [
      "setupSteps",
      "warmupParts",
      "mainParts",
      "cooldownParts",
    ].flatMap((name) =>
      (v[name] || [])
        .map((row, i) => ({ name, i, row }))
        .filter(({ row }) => (row.instruction || "").trim())
    );
    if (urls.length === 0 || urls.length !== slots.length) {
      setPicturesNote(
        `There are ${urls.length} pictures and ${slots.length} steps. Add or remove pictures or steps so they match, then try again.`
      );
      return;
    }
    slots.forEach(({ name, i }, n) =>
      setValue(`${name}.${i}.image`, urls[n], { shouldDirty: true })
    );
    setPicturesNote(
      `Done: ${urls.length} pictures put on the steps in order. Check them in the Steps tab, then save.`
    );
  };

  const setUploadError = (key, message) =>
    setUploadErrors((prev) => ({ ...prev, [key]: message }));

  useEffect(() => {
    if (!exercise) {
      reset(EMPTY_FORM);
      return;
    }
    const steps = Array.isArray(exercise.steps) ? exercise.steps : [];
    // Old steps have no section: they all count as the main part.
    const inSection = (section) =>
      steps
        .filter(
          (s) =>
            (typeof s === "object" && s?.section ? s.section : "main") ===
            section
        )
        .map(partFromStep);
    const main = inSection("main");
    reset({
      ...EMPTY_FORM,
      ...exercise,
      description: exercise.description || "",
      mediaUrl: exercise.mediaUrl || "",
      videoUrl: exercise.videoUrl || "",
      // "Stretching" was an older type; it plays the same as Stationary.
      type:
        exercise.type === "Stretching"
          ? "Stationary"
          : exercise.type || "General",
      intensity:
        exercise.intensity === "Medium"
          ? "Moderate"
          : exercise.intensity || "Low",
      goal: exercise.goal || "",
      calories: exercise.calories || 0,
      requirements: (exercise.requirements || [])
        .map((r) => (typeof r === "string" ? r : r?.name || r?.value || ""))
        .filter(Boolean),
      position: exercise.position || "",
      setting: exercise.setting || "",
      effortHint: exercise.effortHint || "",
      frequency: exercise.frequency || "",
      easierVersion: exercise.easierVersion || "",
      skipIf: toValues(exercise.skipIf),
      stopIf: toValues(exercise.stopIf),
      setupSteps: (exercise.setupSteps || []).map((s) => ({
        instruction: s.instruction || "",
        details: s.details || "",
        image: s.image || "",
      })),
      warmupParts: inSection("warmup"),
      mainParts: main.length ? main : [{ ...NEW_PART }],
      cooldownParts: inSection("cooldown"),
      rounds: exercise.rounds || 1,
      restSeconds: exercise.restSeconds || 0,
      guideImages: (exercise.guideImages || []).map((img) => ({
        url: typeof img === "string" ? img : img?.url || "",
      })),
    });
  }, [exercise, isOpen, reset]);

  const onSubmit = (data) => {
    if (onSave) {
      const breathing = data.type === "Breathing";
      const keep = (parts) =>
        (parts || []).filter((p) => (p.instruction || "").trim());
      const steps = breathing
        ? keep(data.mainParts).map((p) => stepFromPart(p, "main", true))
        : [
            ...keep(data.warmupParts).map((p) =>
              stepFromPart(p, "warmup", false)
            ),
            ...keep(data.mainParts).map((p) => stepFromPart(p, "main", false)),
            ...keep(data.cooldownParts).map((p) =>
              stepFromPart(p, "cooldown", false)
            ),
          ];
      // The three part lists are only for the form; they're saved together as `steps`.
      const rest = { ...data };
      delete rest.warmupParts;
      delete rest.mainParts;
      delete rest.cooldownParts;

      onSave({
        ...rest,
        calories: parseInt(data.calories || 0, 10),
        requirements: (data.requirements || [])
          .map((r) => r.trim())
          .filter(Boolean),
        skipIf: fromValues(data.skipIf),
        stopIf: fromValues(data.stopIf),
        setupSteps: (data.setupSteps || [])
          .filter((s) => (s.instruction || "").trim())
          .map((s) => ({
            instruction: s.instruction.trim(),
            details: (s.details || "").trim(),
            ...(s.image ? { image: s.image.trim() } : {}),
          })),
        steps,
        // Breathing repeats its breaths until its time is up; everything else adds up its parts.
        rounds: breathing ? 1 : data.rounds,
        restSeconds: breathing ? 0 : data.restSeconds,
        duration: breathing
          ? data.duration
          : Math.max(1, Math.ceil(totalSeconds / 60)),
        position: data.position || null,
        setting: data.setting || null,
        guideImages: (data.guideImages || [])
          .map((g) => (g.url || "").trim())
          .filter(Boolean),
      });
    }
    onClose();
  };

  // A save that fails checks opens the edit view on the first tab with a problem.
  const onInvalid = (errs) => {
    setMode("edit");
    setTab(
      TABS.map(([id]) => id).find((id) =>
        TAB_FIELDS[id].some((f) => errs[f])
      ) || "basics"
    );
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
    handleSubmit(
      (data) =>
        onSubmit({
          ...data,
          expertValidated: value,
          reviewNote: value ? "" : reviewNote.trim(),
        }),
      onInvalid
    )();
  };

  if (!isOpen) return null;

  const approved = !!exercise?.expertValidated;
  const sentBack = !approved && !!exercise?.reviewNote;
  const approvedOn = exercise?.reviewedAt
    ? new Date(exercise.reviewedAt).toLocaleDateString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  const keepParts = (parts) =>
    (parts || []).filter((p) => (p.instruction || "").trim());
  const setup = (v.setupSteps || []).filter((s) =>
    (s.instruction || "").trim()
  );
  const reviewSections = [
    ...(setup.length
      ? [
          {
            key: "setup",
            label: "Get into position",
            parts: setup,
            untimed: true,
          },
        ]
      : []),
    ...(isBreathing
      ? [
          {
            key: "main",
            label: "Breaths, repeated until the time is up",
            parts: keepParts(v.mainParts),
          },
        ]
      : [
          {
            key: "warmup",
            label: "Warm-up",
            parts: keepParts(v.warmupParts),
          },
          {
            key: "main",
            label: rounds > 1 ? `Main part, ${rounds} times` : "Main part",
            parts: keepParts(v.mainParts),
          },
          {
            key: "cooldown",
            label: "Cool-down",
            parts: keepParts(v.cooldownParts),
          },
        ]),
  ];

  // A warm-up or cool-down written into the main part plays as main exercise in the app.
  const misplaced =
    !isBreathing &&
    keepParts(v.mainParts).some((p) =>
      /warm.?up|cool.?down/i.test(p.instruction)
    );

  const notSet = (text = "Not set") => (
    <span className="font-medium text-cal-muted">{text}</span>
  );
  const skipList = fromValues(v.skipIf);
  const stopList = fromValues(v.stopIf);
  const pictureCount = (v.guideImages || []).filter((g) =>
    (g.url || "").trim()
  ).length;
  const tabsWithErrors = new Set(
    TABS.map(([id]) => id).filter((id) =>
      TAB_FIELDS[id].some((f) => errors[f])
    )
  );

  const statusChip =
    {
      published: "border-cal-success/25 bg-cal-success/10 text-cal-ink",
      draft: "border-cal-warning/35 bg-cal-warning/15 text-cal-ink",
      archived: "border-cal-hairline bg-cal-surface-card text-cal-muted",
    }[status] || "border-cal-hairline bg-cal-surface-card text-cal-muted";

  const secondaryBtn =
    "inline-flex h-10 items-center justify-center rounded-[8px] border border-cal-hairline bg-cal-canvas px-4 text-[13.5px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
  const primaryBtn =
    "inline-flex h-10 items-center justify-center gap-1.5 rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-5 text-[13.5px] font-semibold text-cal-on-primary transition-colors cursor-pointer disabled:bg-cal-primary-disabled disabled:text-cal-muted";
  const iconBtn =
    "flex h-9 w-9 items-center justify-center rounded-full border border-cal-hairline bg-cal-canvas text-cal-muted hover:text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer";
  const selectFieldClass = (hasErr = false) =>
    `h-10 w-full appearance-none rounded-[8px] border bg-cal-canvas pl-3.5 pr-9 text-[14px] font-medium text-cal-ink outline-none transition-colors cursor-pointer ${
      hasErr
        ? "border-cal-error focus:border-cal-error"
        : "border-cal-hairline focus:border-cal-ink"
    }`;

  const resolvedMedia = resolveMediaUrl(mediaUrl);
  const mediaPreviewError = !!resolvedMedia && failedMediaUrl === resolvedMedia;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 font-cal-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-cal-ink/40 transition-opacity"
        onClick={onClose}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-panel-title"
        tabIndex={-1}
        className={`relative z-10 flex w-full flex-col overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas text-cal-ink shadow-[0_12px_36px_rgba(0,0,0,0.12)] ${
          expanded
            ? "h-full max-w-[1280px]"
            : "h-[min(880px,100%)] max-w-[920px]"
        }`}
      >
        {/* Header: name, status chips, more actions, size, and the tabs while editing */}
        <div className="shrink-0 border-b border-cal-hairline bg-cal-canvas px-6 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-cal-muted">
                {!exercise
                  ? "New exercise routine"
                  : mode === "review"
                    ? "Exercise overview"
                    : "Editing exercise"}
              </p>
              <h3
                id="exercise-panel-title"
                className="mt-0.5 truncate font-cal-display text-[22px] sm:text-[24px] font-semibold tracking-[-0.5px] leading-[1.2] text-cal-ink"
              >
                {v.name || "Untitled exercise"}
              </h3>
              {exercise && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <span className={`${PILL} capitalize ${statusChip}`}>
                    {status}
                  </span>
                  <span
                    className={`${PILL} border-cal-hairline bg-cal-surface-soft text-cal-ink`}
                  >
                    For {v.hssTarget}
                  </span>
                  <span
                    className={`${PILL} ${
                      approved
                        ? "border-cal-success/25 bg-cal-success/10 text-cal-ink"
                        : "border-cal-warning/35 bg-cal-warning/15 text-cal-ink"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        approved ? "bg-cal-success" : "bg-cal-warning"
                      }`}
                    />
                    <span>
                      {approved
                        ? "PT approved"
                        : sentBack
                          ? "Sent back by PT"
                          : "Waiting for PT approval"}
                    </span>
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {exercise && (onDelete || status !== "archived") && (
                <div className="relative">
                  <button
                    type="button"
                    aria-label="More actions"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((open) => !open)}
                    className={iconBtn}
                  >
                    <Ellipsis size={17} />
                  </button>
                  {menuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 top-11 z-20 w-48 rounded-[10px] border border-cal-hairline bg-cal-canvas p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
                    >
                      {status !== "archived" && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setMenuOpen(false);
                            handleSaveWithStatus("archived");
                          }}
                          className="flex w-full items-center gap-2 rounded-[6px] px-3 py-2 text-left text-[13px] font-medium text-cal-ink hover:bg-cal-surface-soft cursor-pointer"
                        >
                          <Archive size={14.5} className="text-cal-muted" />
                          <span>Archive</span>
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
                          className="flex w-full items-center gap-2 rounded-[6px] px-3 py-2 text-left text-[13px] font-medium text-cal-error hover:bg-cal-error/10 cursor-pointer"
                        >
                          <Trash2 size={14.5} />
                          <span>Delete exercise</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={toggleExpanded}
                aria-label={
                  expanded ? "Make the panel smaller" : "Make the panel bigger"
                }
                title={expanded ? "Smaller" : "Bigger"}
                className={`hidden md:flex ${iconBtn}`}
              >
                {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className={iconBtn}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {mode === "edit" && (
            <div
              role="tablist"
              aria-label="Exercise sections"
              className="mt-4 inline-flex flex-wrap items-center gap-1 rounded-[16px] sm:rounded-full border border-cal-hairline/80 bg-cal-surface-soft p-1"
            >
              {TABS.map(([id, label]) => {
                const active = tab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(id)}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition-all cursor-pointer ${
                      active
                        ? "bg-cal-canvas text-cal-ink font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                        : "text-cal-muted hover:text-cal-ink"
                    }`}
                  >
                    <span>{label}</span>
                    {tabsWithErrors.has(id) && (
                      <>
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-cal-error"
                          aria-hidden="true"
                        />
                        <span className="sr-only"> (needs fixing)</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Body */}
        {mode === "review" ? (
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
            {sentBack && (
              <div className="flex items-start gap-2.5 rounded-[10px] border border-cal-warning/35 bg-cal-warning/15 px-4 py-3 text-[13.5px] text-cal-ink">
                <AlertCircle
                  size={17}
                  className="mt-0.5 shrink-0 text-cal-warning"
                  aria-hidden="true"
                />
                <p className="leading-relaxed">
                  <span className="font-semibold">
                    Physical therapist&apos;s note:
                  </span>{" "}
                  {exercise.reviewNote}
                </p>
              </div>
            )}

            {/* Hairline 4-Cell Routine Snapshot */}
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-cal-hairline bg-cal-hairline sm:grid-cols-4">
              {[
                [
                  "Total time",
                  isBreathing
                    ? `${v.duration} min`
                    : totalSeconds > 0
                      ? formatSeconds(totalSeconds)
                      : "No steps yet",
                  true,
                ],
                ["Type", v.type, false],
                ["Intensity", v.intensity, false],
                [
                  "Calories",
                  Number(v.calories) > 0 ? `~${v.calories} kcal` : "Not set",
                  Number(v.calories) > 0,
                ],
              ].map(([label, value, isMono]) => (
                <div key={label} className="bg-cal-canvas px-4 py-3">
                  <p className="text-[12px] font-medium text-cal-muted">
                    {label}
                  </p>
                  <p
                    className={`mt-1 text-[15px] font-semibold text-cal-ink ${
                      isMono ? "font-cal-mono tabular-nums" : ""
                    }`}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {(v.description || v.goal) && (
              <div className="rounded-[10px] border border-cal-hairline bg-cal-surface-soft px-4 py-3.5 text-[14px] leading-[1.6] text-cal-ink">
                <p>{v.description}</p>
                {v.goal && (
                  <p className="mt-1 text-[13px] font-medium text-cal-muted">
                    Goal: <span className="text-cal-ink">{v.goal}</span>
                  </p>
                )}
              </div>
            )}

            {/* Guided Routine Sections */}
            <section>
              <h4 className="mb-2.5 text-[14px] font-semibold text-cal-ink">
                What patients will do
              </h4>
              {misplaced && (
                <div className="mb-3 flex items-start gap-2.5 rounded-[10px] border border-cal-warning/35 bg-cal-warning/15 px-4 py-3 text-[13.5px] text-cal-ink">
                  <AlertCircle
                    size={17}
                    className="mt-0.5 shrink-0 text-cal-warning"
                    aria-hidden="true"
                  />
                  <p className="leading-relaxed">
                    <span className="font-semibold">
                      Check before approving:
                    </span>{" "}
                    a warm-up or cool-down step is in the main part, so the app
                    guides it as main exercise. Move it to Warm-up or Cool-down
                    in the Steps tab.
                  </p>
                </div>
              )}

              <div className="overflow-hidden rounded-[10px] border border-cal-hairline bg-cal-canvas">
                {reviewSections.map((section, s) => (
                  <div
                    key={section.key}
                    className={s > 0 ? "border-t border-cal-hairline" : ""}
                  >
                    <div className="flex items-center justify-between gap-3 bg-cal-surface-soft px-4 py-2.5 text-[12.5px] font-semibold text-cal-ink">
                      <span>{section.label}</span>
                      <span className="font-cal-mono text-[12px] font-medium tabular-nums text-cal-muted">
                        {section.untimed
                          ? "Before timer"
                          : section.parts.length
                            ? formatSeconds(
                                section.parts.reduce(
                                  (t, p) => t + partSeconds(p),
                                  0
                                )
                              )
                            : "None"}
                      </span>
                    </div>

                    {section.parts.length === 0 ? (
                      <div className="border-t border-cal-hairline px-4 py-2.5 text-[13px] text-cal-muted">
                        No steps in this section.
                      </div>
                    ) : (
                      section.parts.map((p, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 border-t border-cal-hairline px-4 py-3"
                        >
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] border border-cal-hairline bg-cal-surface-soft font-cal-mono text-[11.5px] font-semibold tabular-nums text-cal-ink">
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13.5px] font-medium text-cal-ink">
                              {p.instruction}
                            </p>
                            {p.details && (
                              <p className="mt-0.5 text-[12.5px] text-cal-muted">
                                {p.details}
                              </p>
                            )}
                          </div>
                          {!section.untimed && (
                            <span className="shrink-0 font-cal-mono text-[12px] font-medium tabular-nums text-cal-muted">
                              {formatSeconds(partSeconds(p))}
                              {p.both_sides ? " · both sides" : ""}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Safety & Equipment Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <section className="rounded-[10px] border border-cal-hairline bg-cal-canvas p-4">
                <h4 className="mb-3 text-[14px] font-semibold text-cal-ink">
                  Safety parameters
                </h4>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13.5px]">
                  <dt className="text-cal-muted">Skip if</dt>
                  <dd className="text-cal-ink">
                    {skipList.length
                      ? skipList.join("; ")
                      : notSet("Nothing added")}
                  </dd>
                  <dt className="text-cal-muted">Stop if</dt>
                  <dd className="text-cal-ink">
                    {stopList.length
                      ? stopList.join("; ")
                      : "Standard warning signs only"}
                  </dd>
                  <dt className="text-cal-muted">Position</dt>
                  <dd className="text-cal-ink">{v.position || notSet()}</dd>
                  <dt className="text-cal-muted">Where</dt>
                  <dd className="text-cal-ink">
                    {v.setting === "Either"
                      ? "Indoors or outdoors"
                      : v.setting || notSet()}
                  </dd>
                  <dt className="text-cal-muted">Should feel</dt>
                  <dd className="text-cal-ink">{v.effortHint || notSet()}</dd>
                  <dt className="text-cal-muted">How often</dt>
                  <dd className="text-cal-ink">{v.frequency || notSet()}</dd>
                  <dt className="text-cal-muted">Easier version</dt>
                  <dd className="text-cal-ink">{v.easierVersion || "None"}</dd>
                </dl>
              </section>

              <section className="flex flex-col justify-between rounded-[10px] border border-cal-hairline bg-cal-canvas p-4">
                <div>
                  <h4 className="mb-0.5 text-[14px] font-semibold text-cal-ink">
                    Before you start
                  </h4>
                  <p className="mb-3 text-[12.5px] text-cal-muted">
                    Patients tick these off in the mobile app.
                  </p>
                  {(v.requirements || []).length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {v.requirements.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-cal-hairline bg-cal-surface-soft px-3 py-1 text-[12px] font-medium text-cal-ink"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[13.5px] text-cal-muted">
                      No equipment needed
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-3 border-t border-cal-hairline pt-3.5">
                  <div className="flex h-11 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-cal-hairline bg-cal-surface-soft text-cal-muted">
                    {mediaUrl &&
                    !mediaUrl.includes("youtu") &&
                    !mediaPreviewError ? (
                      <img
                        src={resolvedMedia}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={() => setFailedMediaUrl(resolvedMedia)}
                      />
                    ) : (
                      <Play size={15} aria-hidden="true" />
                    )}
                  </div>
                  <div className="text-[13px]">
                    <p className="font-medium text-cal-ink">Media attached</p>
                    <p className="font-cal-mono text-[12px] tabular-nums text-cal-muted">
                      {[
                        videoUrl ? "1 video" : "No video",
                        `${pictureCount} ${
                          pictureCount === 1 ? "picture" : "pictures"
                        }`,
                      ].join(" · ")}
                    </p>
                  </div>
                </div>
              </section>
            </div>

            {exercise && <CardiologistGuidance />}

            {isPT && exercise && (
              <section className="space-y-3 rounded-[10px] border border-cal-hairline bg-cal-surface-soft p-4">
                <label
                  htmlFor="exercise-review-note"
                  className="block text-[13.5px] font-semibold text-cal-ink"
                >
                  Send it back for changes{" "}
                  <span className="font-normal text-cal-muted">(optional)</span>
                </label>
                <textarea
                  id="exercise-review-note"
                  rows="2"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="e.g. Too intense for patients in the Critical band; add a seated version."
                  className="w-full resize-none rounded-[8px] border border-cal-hairline bg-cal-canvas px-3.5 py-2.5 text-[14px] text-cal-ink placeholder:text-cal-muted-soft focus:border-cal-ink focus:outline-none transition-colors"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={!reviewNote.trim()}
                    onClick={() => saveApproval(false)}
                    className={secondaryBtn}
                  >
                    Send back with note
                  </button>
                </div>
              </section>
            )}
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit, onInvalid)}
            className="flex-1 overflow-y-auto px-6 py-5"
          >
            {tab === "basics" && (
              <div className="space-y-4">
                <InputField
                  id="name"
                  label="Routine name"
                  placeholder="e.g. 15-Minute Chair Yoga"
                  error={errors.name}
                  {...register("name")}
                />

                <div>
                  <label
                    htmlFor="exercise-description"
                    className="mb-1.5 block text-[13px] font-medium text-cal-ink"
                  >
                    Description
                  </label>
                  <textarea
                    id="exercise-description"
                    rows="2"
                    {...register("description")}
                    className={`w-full resize-none rounded-[8px] border bg-cal-canvas px-3.5 py-2.5 text-[14px] text-cal-ink placeholder:text-cal-muted-soft outline-none transition-colors ${
                      errors.description
                        ? "border-cal-error focus:border-cal-error"
                        : "border-cal-hairline focus:border-cal-ink"
                    }`}
                    placeholder="Short text summary of physical benefits…"
                  />
                  {errors.description && (
                    <p className="mt-1 text-[12px] font-medium text-cal-error">
                      {errors.description.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="exercise-type"
                      className="mb-1.5 block text-[13px] font-medium text-cal-ink"
                    >
                      Exercise type
                    </label>
                    <div className="relative">
                      <select
                        id="exercise-type"
                        {...register("type")}
                        className={selectFieldClass()}
                      >
                        <option value="Breathing">Breathing</option>
                        <option value="Light Cardio">Light Cardio</option>
                        <option value="Stationary">Stationary</option>
                        <option value="General">General</option>
                      </select>
                      <ChevronDown
                        size={15}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-cal-muted"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="exercise-intensity"
                      className="mb-1.5 block text-[13px] font-medium text-cal-ink"
                    >
                      Intensity
                    </label>
                    <div className="relative">
                      <select
                        id="exercise-intensity"
                        {...register("intensity")}
                        className={selectFieldClass()}
                      >
                        <option value="None">None</option>
                        <option value="Low">Low</option>
                        <option value="Moderate">Moderate</option>
                        <option value="High">High</option>
                      </select>
                      <ChevronDown
                        size={15}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-cal-muted"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {isBreathing ? (
                    <div>
                      <InputField
                        id="duration"
                        type="number"
                        label="Duration (minutes)"
                        left={<Clock size={14} />}
                        error={errors.duration}
                        className="font-cal-mono tabular-nums"
                        {...register("duration")}
                        min="1"
                      />
                      <p className="mt-1 text-[12px] text-cal-muted">
                        The breaths repeat until this time is up.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="mb-1.5 block text-[13px] font-medium text-cal-ink">
                        Total time
                      </label>
                      <div className="flex h-10 items-center gap-2 rounded-[8px] border border-cal-hairline bg-cal-surface-soft px-3.5 font-cal-mono text-[13.5px] font-semibold tabular-nums text-cal-ink">
                        <Clock size={14} className="text-cal-muted" />
                        <span>
                          {totalSeconds > 0
                            ? formatSeconds(totalSeconds)
                            : "Add steps in Steps tab"}
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] text-cal-muted">
                        Worked out automatically from the Steps tab.
                      </p>
                    </div>
                  )}

                  <InputField
                    id="goal"
                    label="Routine goal"
                    placeholder="e.g. Builds gentle aerobic endurance…"
                    {...register("goal")}
                  />
                </div>

                <InputField
                  id="calories"
                  type="number"
                  label="Estimated calories burned"
                  left={<Activity size={14} />}
                  error={errors.calories}
                  className="font-cal-mono tabular-nums"
                  {...register("calories")}
                  min="0"
                  placeholder="e.g. 150"
                />

                <div className="rounded-[10px] border border-cal-hairline bg-cal-surface-soft p-4">
                  <label
                    htmlFor="exercise-hss"
                    className="block text-[13px] font-semibold text-cal-ink"
                  >
                    HSS suitability
                  </label>
                  <p className="mt-0.5 mb-2.5 text-[12px] text-cal-muted">
                    Determines which patients receive this exercise routine
                    based on clinical HSS status.
                  </p>
                  <div className="relative">
                    <select
                      id="exercise-hss"
                      {...register("hssTarget")}
                      className={selectFieldClass(!!errors.hssTarget)}
                    >
                      <option value="Stable (80-100)">Stable (80-100)</option>
                      <option value="Moderate (60-79)">Moderate (60-79)</option>
                      <option value="Elevated Risk (50-59)">
                        Elevated Risk (50-59)
                      </option>
                      <option value="Critical (<50)">Critical (&lt;50)</option>
                    </select>
                    <ChevronDown
                      size={15}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-cal-muted"
                    />
                  </div>
                </div>
              </div>
            )}

            {tab === "steps" && (
              <div className="space-y-6">
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
                    <PartsEditor
                      {...editorProps}
                      name="warmupParts"
                      title="Warm-up"
                      hint="Done once at the start, e.g. 2 minutes of slow walking."
                      addLabel="Add a warm-up part"
                    />

                    <div className="space-y-3">
                      <PartsEditor
                        {...editorProps}
                        name="mainParts"
                        title="Main part"
                        hint={
                          'Use "A count" for moves done a number of times, e.g. lift each leg 10 times. Tick "Both sides" to repeat it on the other side.'
                        }
                        addLabel="Add a main part"
                      />
                      <div className="grid grid-cols-1 gap-4 rounded-[10px] border border-cal-hairline bg-cal-surface-soft p-4 sm:grid-cols-2">
                        <div>
                          <InputField
                            id="rounds"
                            type="number"
                            label="Rounds"
                            min="1"
                            max="20"
                            className="font-cal-mono tabular-nums"
                            error={errors.rounds}
                            {...register("rounds")}
                          />
                          <p className="mt-1 text-[12px] text-cal-muted">
                            How many times the main part repeats.
                          </p>
                        </div>
                        <InputField
                          id="restSeconds"
                          type="number"
                          label="Rest between rounds (sec)"
                          min="0"
                          max="600"
                          className="font-cal-mono tabular-nums"
                          error={errors.restSeconds}
                          {...register("restSeconds")}
                        />
                      </div>
                    </div>

                    <PartsEditor
                      {...editorProps}
                      name="cooldownParts"
                      title="Cool-down"
                      hint="Done once at the end, e.g. 3 minutes of slower walking."
                      addLabel="Add a cool-down part"
                    />

                    <div className="flex items-center justify-between rounded-[10px] border border-cal-hairline bg-cal-surface-soft px-4 py-3 text-[13px]">
                      <span className="font-medium text-cal-muted">
                        Calculated workout duration
                      </span>
                      <span className="font-cal-mono font-semibold tabular-nums text-cal-ink">
                        {totalSeconds > 0
                          ? formatSeconds(totalSeconds)
                          : "Add parts to see total"}
                        {rounds > 1 ? ` · main × ${rounds}` : ""}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

            {tab === "safety" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="exercise-position"
                      className="mb-1.5 block text-[13px] font-medium text-cal-ink"
                    >
                      Position
                    </label>
                    <div className="relative">
                      <select
                        id="exercise-position"
                        {...register("position")}
                        className={selectFieldClass()}
                      >
                        <option value="">Not set</option>
                        <option value="Seated">Seated</option>
                        <option value="Standing">Standing</option>
                        <option value="Lying down">Lying down</option>
                        <option value="Walking">Walking</option>
                      </select>
                      <ChevronDown
                        size={15}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-cal-muted"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="exercise-setting"
                      className="mb-1.5 block text-[13px] font-medium text-cal-ink"
                    >
                      Where
                    </label>
                    <div className="relative">
                      <select
                        id="exercise-setting"
                        {...register("setting")}
                        className={selectFieldClass()}
                      >
                        <option value="">Not set</option>
                        <option value="Indoors">Indoors</option>
                        <option value="Outdoors">Outdoors</option>
                        <option value="Either">Indoors or outdoors</option>
                      </select>
                      <ChevronDown
                        size={15}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-cal-muted"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <InputField
                    id="effortHint"
                    label="How it should feel"
                    placeholder="e.g. You can still talk while doing it"
                    {...register("effortHint")}
                  />
                  <InputField
                    id="frequency"
                    label="How often"
                    placeholder="e.g. 3 times a week"
                    {...register("frequency")}
                  />
                </div>

                <InputField
                  id="easierVersion"
                  label="Easier version"
                  placeholder="e.g. Do it sitting down, with smaller movements"
                  {...register("easierVersion")}
                />

                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-cal-ink">
                    Skip this exercise if…
                  </label>
                  <TextListEditor
                    control={control}
                    register={register}
                    name="skipIf"
                    placeholder="e.g. You have knee pain today"
                    addLabel="Add a reason to skip"
                  />
                </div>

                <div>
                  <label className="mb-0.5 block text-[13px] font-medium text-cal-ink">
                    Stop right away if…
                  </label>
                  <p className="mb-2 text-[12px] text-cal-muted">
                    Shown with the app&apos;s standard warning signs (chest
                    pain, dizziness, short of breath).
                  </p>
                  <TextListEditor
                    control={control}
                    register={register}
                    name="stopIf"
                    placeholder="e.g. Your knee starts to hurt"
                    addLabel="Add a reason to stop"
                  />
                </div>

                <div>
                  <label className="mb-0.5 block text-[13px] font-medium text-cal-ink">
                    Before you start
                  </label>
                  <p className="mb-2 text-[12px] text-cal-muted">
                    Patients tick these off on the app&apos;s &ldquo;Before you
                    start&rdquo; check.
                  </p>
                  <EquipmentPicker
                    value={v.requirements || []}
                    onChange={(list) =>
                      setValue("requirements", list, { shouldDirty: true })
                    }
                  />
                </div>
              </div>
            )}

            {tab === "media" && (
              <div className="space-y-6">
                {/* Thumbnail Image */}
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-cal-ink">
                    Thumbnail image
                  </label>
                  <div className="flex gap-2">
                    <input
                      {...register("mediaUrl")}
                      type="text"
                      placeholder="Paste image URL…"
                      className="h-10 flex-1 rounded-[8px] border border-cal-hairline bg-cal-canvas px-3.5 text-[14px] text-cal-ink placeholder:text-cal-muted-soft focus:border-cal-ink focus:outline-none transition-colors"
                    />
                    <label className="inline-flex h-10 shrink-0 items-center justify-center rounded-[8px] border border-cal-hairline bg-cal-canvas px-4 text-[13px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer">
                      {isUploading ? "Uploading…" : "Upload"}
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
                              setValue("mediaUrl", data.url, {
                                shouldValidate: true,
                                shouldDirty: true,
                              });
                            } catch (err) {
                              console.error("Upload error:", err);
                              setUploadError(
                                "media",
                                err?.data?.detail ||
                                  "Upload failed. Please try again."
                              );
                            } finally {
                              setIsUploading(false);
                            }
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {uploadErrors.media && (
                    <p className="mt-1.5 text-[12px] font-medium text-cal-error">
                      {uploadErrors.media}
                    </p>
                  )}

                  {mediaUrl &&
                    !mediaUrl.includes("youtube.com") &&
                    !mediaUrl.includes("youtu.be") && (
                      <div className="mt-3 flex h-28 w-48 items-center justify-center overflow-hidden rounded-[10px] border border-cal-hairline bg-cal-surface-soft">
                        {mediaUrl.startsWith("data:video") ||
                        mediaUrl.endsWith(".mp4") ? (
                          <video
                            src={resolvedMedia}
                            className="h-full w-full object-cover"
                            muted
                          />
                        ) : !mediaPreviewError ? (
                          <img
                            src={resolvedMedia}
                            alt="Thumbnail preview"
                            className="h-full w-full object-cover"
                            onError={() => setFailedMediaUrl(resolvedMedia)}
                          />
                        ) : (
                          <span className="text-[12px] text-cal-muted">
                            Could not load image
                          </span>
                        )}
                      </div>
                    )}
                </div>

                {/* Instructional Video Link */}
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-cal-ink">
                    Instructional video link
                  </label>
                  <input
                    {...register("videoUrl")}
                    type="text"
                    placeholder="Paste YouTube video link…"
                    className="h-10 w-full rounded-[8px] border border-cal-hairline bg-cal-canvas px-3.5 text-[14px] text-cal-ink placeholder:text-cal-muted-soft focus:border-cal-ink focus:outline-none transition-colors"
                  />

                  {videoUrl &&
                    (videoUrl.includes("youtube.com") ||
                      videoUrl.includes("youtu.be")) && (
                      <div className="mt-3 aspect-video w-full max-w-md overflow-hidden rounded-[10px] border border-cal-hairline bg-cal-surface-dark">
                        <iframe
                          width="100%"
                          height="100%"
                          src={videoUrl
                            .replace("watch?v=", "embed/")
                            .replace("youtu.be/", "youtube.com/embed/")}
                          title="YouTube video player"
                          frameBorder="0"
                          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}
                </div>

                {/* Extra Pictures */}
                <div>
                  <label className="mb-0.5 block text-[13px] font-medium text-cal-ink">
                    Extra pictures
                  </label>
                  <p className="mb-3 text-[12px] text-cal-muted">
                    Shown in the app&apos;s Pictures tab. Pictures for a single
                    step go on that step in the Steps tab.
                  </p>

                  <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                    {guideImageFields.map((field, index) => {
                      const guideUrl = v.guideImages?.[index]?.url || "";
                      return (
                        <div
                          key={field.id}
                          className="flex items-center gap-3 rounded-[10px] border border-cal-hairline bg-cal-surface-soft p-3"
                        >
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-cal-hairline bg-cal-canvas">
                            {guideUrl ? (
                              <img
                                src={resolveMediaUrl(guideUrl)}
                                alt="Guide preview"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <ImageIcon
                                size={15}
                                className="text-cal-muted"
                              />
                            )}
                          </div>

                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex gap-2">
                              <input
                                {...register(`guideImages.${index}.url`)}
                                type="text"
                                placeholder="Paste guide image URL…"
                                className="h-9 flex-1 rounded-[8px] border border-cal-hairline bg-cal-canvas px-3 text-[13px] text-cal-ink placeholder:text-cal-muted-soft focus:border-cal-ink focus:outline-none transition-colors"
                              />
                              <label className="inline-flex h-9 shrink-0 items-center justify-center rounded-[8px] border border-cal-hairline bg-cal-canvas px-3 text-[12px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer">
                                Upload
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    e.target.value = "";
                                    if (file) {
                                      setUploadError(`guide-${index}`, "");
                                      try {
                                        const data = await apiUpload(
                                          file,
                                          "exercises"
                                        );
                                        setValue(
                                          `guideImages.${index}.url`,
                                          data.url,
                                          {
                                            shouldValidate: true,
                                            shouldDirty: true,
                                          }
                                        );
                                      } catch (err) {
                                        console.error(
                                          "Guide upload error:",
                                          err
                                        );
                                        setUploadError(
                                          `guide-${index}`,
                                          err?.data?.detail ||
                                            "Upload failed. Please try again."
                                        );
                                      }
                                    }
                                  }}
                                />
                              </label>
                            </div>
                            {uploadErrors[`guide-${index}`] && (
                              <p className="text-[11.5px] font-medium text-cal-error">
                                {uploadErrors[`guide-${index}`]}
                              </p>
                            )}
                          </div>

                          <div className="flex shrink-0 items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (index > 0) {
                                  const currentVal =
                                    v.guideImages?.[index]?.url || "";
                                  const prevVal =
                                    v.guideImages?.[index - 1]?.url || "";
                                  setValue(
                                    `guideImages.${index}.url`,
                                    prevVal,
                                    { shouldDirty: true }
                                  );
                                  setValue(
                                    `guideImages.${index - 1}.url`,
                                    currentVal,
                                    { shouldDirty: true }
                                  );
                                }
                              }}
                              disabled={index === 0}
                              className="flex h-8 w-8 items-center justify-center rounded-[6px] text-cal-muted hover:bg-cal-canvas hover:text-cal-ink disabled:opacity-30 transition-colors cursor-pointer"
                              title="Move up"
                              aria-label="Move up"
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (index < guideImageFields.length - 1) {
                                  const currentVal =
                                    v.guideImages?.[index]?.url || "";
                                  const nextVal =
                                    v.guideImages?.[index + 1]?.url || "";
                                  setValue(
                                    `guideImages.${index}.url`,
                                    nextVal,
                                    { shouldDirty: true }
                                  );
                                  setValue(
                                    `guideImages.${index + 1}.url`,
                                    currentVal,
                                    { shouldDirty: true }
                                  );
                                }
                              }}
                              disabled={index === guideImageFields.length - 1}
                              className="flex h-8 w-8 items-center justify-center rounded-[6px] text-cal-muted hover:bg-cal-canvas hover:text-cal-ink disabled:opacity-30 transition-colors cursor-pointer"
                              title="Move down"
                              aria-label="Move down"
                            >
                              <ArrowDown size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeGuideImage(index)}
                              className="flex h-8 w-8 items-center justify-center rounded-[6px] text-cal-muted hover:bg-cal-error/10 hover:text-cal-error transition-colors cursor-pointer"
                              title="Remove"
                              aria-label="Remove"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => appendGuideImage({ url: "" })}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-[8px] border border-cal-hairline bg-cal-canvas px-3 py-1.5 text-[12.5px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add guide image</span>
                  </button>

                  {guideImageFields.length > 0 && (
                    <div className="mt-3 rounded-[10px] border border-cal-hairline bg-cal-surface-soft p-3">
                      <button
                        type="button"
                        onClick={putPicturesOnSteps}
                        className="inline-flex h-8 items-center rounded-[6px] border border-cal-hairline bg-cal-canvas px-3 text-[12px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer"
                      >
                        Put these pictures on the steps
                      </button>
                      <p className="mt-1.5 text-[12px] text-cal-muted">
                        {picturesNote ||
                          "One picture per step, in order: Get into position first, then warm-up, main part and cool-down."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </form>
        )}

        {/* Footer */}
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2.5 border-t border-cal-hairline bg-cal-canvas px-6 py-4">
          {mode === "review" ? (
            <>
              <p className="min-w-[200px] flex-1 text-[13px] leading-snug text-cal-muted">
                {approved
                  ? `Approved by a physical therapist${
                      approvedOn ? ` on ${approvedOn}` : ""
                    }.`
                  : isPT
                    ? "Patients only see this exercise after you approve it."
                    : "Patients can't see this until a physical therapist approves it."}
              </p>
              {isPT && approved && (
                <button
                  type="button"
                  onClick={() => saveApproval(false)}
                  className={secondaryBtn}
                >
                  Remove approval
                </button>
              )}
              {isPT && !approved ? (
                <>
                  <button
                    type="button"
                    onClick={() => setMode("edit")}
                    className={secondaryBtn}
                  >
                    Edit details
                  </button>
                  <button
                    type="button"
                    onClick={() => saveApproval(true)}
                    className={primaryBtn}
                  >
                    <ShieldCheck size={15} />
                    <span>Approve for patients</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setMode("edit")}
                  className={primaryBtn}
                >
                  Edit details
                </button>
              )}
            </>
          ) : (
            <>
              <p className="min-w-[200px] flex-1 text-[13px] leading-snug text-cal-muted">
                {isPT
                  ? ""
                  : exercise
                    ? "Saving sends it back to a physical therapist for approval."
                    : "A physical therapist approves it before patients see it."}
              </p>
              <button type="button" onClick={onClose} className={secondaryBtn}>
                Cancel
              </button>
              {status === "draft" && (
                <>
                  <button
                    type="button"
                    onClick={() => handleSaveWithStatus("draft")}
                    className={secondaryBtn}
                  >
                    Save draft
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveWithStatus("published")}
                    className={primaryBtn}
                  >
                    Publish
                  </button>
                </>
              )}
              {status === "published" && (
                <button
                  type="button"
                  onClick={() => handleSaveWithStatus("published")}
                  className={primaryBtn}
                >
                  Save changes
                </button>
              )}
              {status === "archived" && (
                <button
                  type="button"
                  onClick={() => handleSaveWithStatus("draft")}
                  className={primaryBtn}
                >
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
