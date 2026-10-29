import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useFieldArray, useWatch } from "react-hook-form";
import { BASE_URL, apiUpload } from "../../api";
import {
  EQUIPMENT_PRESETS,
  NEW_PART,
  formatSeconds,
  partSeconds,
} from "./exerciseParts";

// Pieces of the exercise form: the timed parts (warm-up, main, cool-down), the set-up list,
// the equipment picker and short text lists (skip if / stop if).

const inputClass =
  "h-9 w-full rounded-[8px] border border-cal-hairline bg-cal-canvas px-3 text-[13.5px] text-cal-ink placeholder:text-cal-muted-soft focus:border-cal-ink focus:outline-none transition-colors";
const monoInputClass = `${inputClass} font-cal-mono tabular-nums`;
const selectClass =
  "h-9 w-full appearance-none rounded-[8px] border border-cal-hairline bg-cal-canvas pl-3 pr-8 text-[13.5px] font-medium text-cal-ink focus:border-cal-ink focus:outline-none transition-colors cursor-pointer";
const smallLabel = "mb-1 block text-[12px] font-medium text-cal-muted";
const addButton =
  "mt-2.5 inline-flex items-center gap-1.5 rounded-[8px] border border-cal-hairline bg-cal-canvas px-3 py-1.5 text-[12.5px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer";
const iconButton =
  "flex h-8 w-8 items-center justify-center rounded-[6px] text-cal-muted hover:bg-cal-canvas hover:text-cal-ink disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer";

/** Full address for an uploaded picture ("/uploads/…" lives on the server). */
function pictureUrl(url) {
  if (!url || /^(https?:|data:)/.test(url)) return url;
  return `${BASE_URL.replace(/\/$/, "")}${url.startsWith("/") ? url : `/${url}`}`;
}

/** This step's own picture: a preview, the link, and an Upload button. */
function ImageField({ value, onChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [failedSrc, setFailedSrc] = useState(null);
  const resolved = pictureUrl(value);
  const showImg = !!resolved && failedSrc !== resolved;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div
          className="flex h-9 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-cal-hairline bg-cal-canvas"
          title="This step's picture"
        >
          {showImg ? (
            <img
              src={resolved}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setFailedSrc(resolved)}
            />
          ) : (
            <ImageIcon size={14} className="text-cal-muted" />
          )}
        </div>
        <input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Step picture (optional): paste link or upload"
          className={inputClass}
        />
        <label className="inline-flex h-9 shrink-0 items-center justify-center rounded-[8px] border border-cal-hairline bg-cal-canvas px-3 text-[12px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer">
          {busy ? "Uploading…" : "Upload"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setBusy(true);
              setError("");
              try {
                const data = await apiUpload(file, "exercises");
                onChange(data.url);
              } catch (err) {
                setError(
                  err?.data?.detail || "Upload failed. Please try again."
                );
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
      </div>
      {error && (
        <p className="text-[11.5px] font-medium text-cal-error">{error}</p>
      )}
    </div>
  );
}

/**
 * One section of timed parts (warm-up, main or cool-down). Each part is either a time
 * (minutes and seconds) or a count (repeats, about N seconds each), optionally on both sides.
 */
export function PartsEditor({
  control,
  register,
  setValue,
  errors,
  name,
  title,
  hint,
  isBreathing = false,
  addLabel = "Add part",
}) {
  const { fields, append, remove, move } = useFieldArray({ control, name });
  const rows = useWatch({ control, name }) || [];
  // One step open at a time; the rest show as a single line. A new, empty or invalid step stays open.
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <p className="text-[13.5px] font-semibold text-cal-ink">{title}</p>
        {rows.length > 0 && (
          <p className="font-cal-mono text-[12px] font-medium tabular-nums text-cal-muted">
            {formatSeconds(rows.reduce((t, p) => t + partSeconds(p), 0))}
          </p>
        )}
      </div>
      {hint && (
        <p className="mb-2.5 text-[12.5px] leading-relaxed text-cal-muted">
          {hint}
        </p>
      )}
      <div className="space-y-2">
        {fields.map((field, index) => {
          const row = rows[index] || {};
          const err = errors?.[name]?.[index];
          const isOpen =
            openIndex === index || !(row.instruction || "").trim() || !!err;

          if (!isOpen) {
            return (
              <button
                key={field.id}
                type="button"
                onClick={() => setOpenIndex(index)}
                aria-label={`Edit step ${index + 1}: ${row.instruction}`}
                className="flex w-full items-center gap-3 rounded-[10px] border border-cal-hairline bg-cal-canvas px-3.5 py-2.5 text-left hover:bg-cal-surface-soft transition-colors cursor-pointer"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] border border-cal-hairline bg-cal-surface-soft font-cal-mono text-[11.5px] font-semibold tabular-nums text-cal-ink">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-cal-ink">
                  {row.instruction}
                </span>
                <span className="shrink-0 font-cal-mono text-[12px] font-medium tabular-nums text-cal-muted">
                  {formatSeconds(partSeconds(row))}
                </span>
                <ChevronDown
                  size={15}
                  className="shrink-0 text-cal-muted"
                  aria-hidden="true"
                />
              </button>
            );
          }

          return (
            <div
              key={field.id}
              className="flex items-start gap-3 rounded-[10px] border border-cal-hairline bg-cal-surface-soft p-3.5"
            >
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] border border-cal-hairline bg-cal-canvas font-cal-mono text-[11.5px] font-semibold tabular-nums text-cal-ink">
                {index + 1}
              </div>

              <div className="min-w-0 flex-1 space-y-2.5">
                <div>
                  <input
                    {...register(`${name}.${index}.instruction`)}
                    className={`${inputClass} font-medium ${
                      err?.instruction
                        ? "border-cal-error focus:border-cal-error"
                        : ""
                    }`}
                    placeholder={
                      isBreathing
                        ? "e.g. Breathe in slowly through your nose"
                        : "e.g. Walk at a comfortable pace"
                    }
                  />
                  {err?.instruction && (
                    <span className="mt-1 block text-[11.5px] font-medium text-cal-error">
                      {err.instruction.message}
                    </span>
                  )}
                </div>

                <input
                  {...register(`${name}.${index}.details`)}
                  className={inputClass}
                  placeholder="Extra detail (optional), e.g. Keep your back straight"
                />

                <div className="flex flex-wrap items-end gap-2.5">
                  {isBreathing ? (
                    <div className="w-40">
                      <label className={smallLabel}>Breath</label>
                      <div className="relative">
                        <select
                          {...register(`${name}.${index}.breath`)}
                          className={selectClass}
                          title="The app moves the breathing circle to match."
                        >
                          <option value="">From the words</option>
                          <option value="in">Breathe in</option>
                          <option value="hold">Hold</option>
                          <option value="out">Breathe out</option>
                        </select>
                        <ChevronDown
                          size={14}
                          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-cal-muted"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="w-32">
                      <label className={smallLabel}>How long</label>
                      <div className="relative">
                        <select
                          {...register(`${name}.${index}.mode`)}
                          className={selectClass}
                        >
                          <option value="time">A time</option>
                          <option value="count">A count</option>
                        </select>
                        <ChevronDown
                          size={14}
                          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-cal-muted"
                        />
                      </div>
                    </div>
                  )}

                  {row.mode === "count" && !isBreathing ? (
                    <>
                      <div className="w-20">
                        <label className={smallLabel}>Times</label>
                        <input
                          type="number"
                          min="1"
                          {...register(`${name}.${index}.reps`)}
                          className={monoInputClass}
                        />
                      </div>
                      <div className="w-24">
                        <label className={smallLabel}>Secs each</label>
                        <input
                          type="number"
                          min="1"
                          {...register(`${name}.${index}.seconds_per_rep`)}
                          className={monoInputClass}
                          title="About how long one repeat takes"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-20">
                        <label className={smallLabel}>Min</label>
                        <input
                          type="number"
                          min="0"
                          {...register(`${name}.${index}.minutes`)}
                          className={monoInputClass}
                        />
                      </div>
                      <div className="w-20">
                        <label className={smallLabel}>Sec</label>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          {...register(`${name}.${index}.seconds`)}
                          className={monoInputClass}
                        />
                      </div>
                    </>
                  )}

                  {!isBreathing && (
                    <label className="flex h-9 items-center gap-2 text-[12.5px] font-medium text-cal-ink cursor-pointer select-none">
                      <input
                        type="checkbox"
                        {...register(`${name}.${index}.both_sides`)}
                        className="h-4 w-4 rounded border-cal-hairline accent-cal-primary cursor-pointer"
                      />
                      <span>Both sides</span>
                    </label>
                  )}

                  <span className="ml-auto flex h-9 items-center font-cal-mono text-[12px] font-semibold tabular-nums text-cal-muted">
                    {formatSeconds(partSeconds(row))}
                  </span>
                </div>

                {err?.seconds && (
                  <span className="block text-[11.5px] font-medium text-cal-error">
                    {err.seconds.message}
                  </span>
                )}

                <ImageField
                  value={row.image}
                  onChange={(url) =>
                    setValue(`${name}.${index}.image`, url, {
                      shouldDirty: true,
                    })
                  }
                />
              </div>

              <div className="flex shrink-0 items-center gap-0.5">
                {(row.instruction || "").trim() && !err && (
                  <button
                    type="button"
                    onClick={() => setOpenIndex(null)}
                    className={iconButton}
                    title="Close this step"
                    aria-label="Close this step"
                  >
                    <ChevronUp size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => move(index, index - 1)}
                  disabled={index === 0}
                  className={iconButton}
                  title="Move up"
                  aria-label="Move up"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, index + 1)}
                  disabled={index === fields.length - 1}
                  className={iconButton}
                  title="Move down"
                  aria-label="Move down"
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="flex h-8 w-8 items-center justify-center rounded-[6px] text-cal-muted hover:bg-cal-error/10 hover:text-cal-error transition-colors cursor-pointer"
                  title="Delete"
                  aria-label="Delete"
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
        onClick={() => {
          append({ ...NEW_PART });
          setOpenIndex(fields.length);
        }}
        className={addButton}
      >
        <Plus size={14} />
        <span>{addLabel}</span>
      </button>
    </div>
  );
}

/** Get-into-position instructions: done once, before the timer starts. No time. */
export function SetupEditor({
  control,
  register,
  setValue,
  name = "setupSteps",
}) {
  const { fields, append, remove } = useFieldArray({ control, name });
  const rows = useWatch({ control, name }) || [];

  return (
    <div>
      <p className="mb-1 text-[13.5px] font-semibold text-cal-ink">
        Get into position
      </p>
      <p className="mb-2.5 text-[12.5px] leading-relaxed text-cal-muted">
        Done once before the timer starts, e.g. &ldquo;Sit near the front of a
        sturdy chair, feet flat on the floor&rdquo;. No time needed.
      </p>
      <div className="space-y-2">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="flex items-start gap-3 rounded-[10px] border border-cal-hairline bg-cal-surface-soft p-3.5"
          >
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] border border-cal-hairline bg-cal-canvas font-cal-mono text-[11.5px] font-semibold tabular-nums text-cal-ink">
              {index + 1}
            </div>
            <div className="min-w-0 flex-1 space-y-2.5">
              <input
                {...register(`${name}.${index}.instruction`)}
                className={`${inputClass} font-medium`}
                placeholder="e.g. Sit with your feet flat on the floor"
              />
              <input
                {...register(`${name}.${index}.details`)}
                className={inputClass}
                placeholder="Extra detail (optional)"
              />
              <ImageField
                value={rows[index]?.image}
                onChange={(url) =>
                  setValue(`${name}.${index}.image`, url, { shouldDirty: true })
                }
              />
            </div>
            <button
              type="button"
              onClick={() => remove(index)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-cal-muted hover:bg-cal-error/10 hover:text-cal-error transition-colors cursor-pointer"
              title="Delete"
              aria-label="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => append({ instruction: "", details: "", image: "" })}
        className={addButton}
      >
        <Plus size={14} />
        <span>Add a set-up instruction</span>
      </button>
    </div>
  );
}

export function EquipmentPicker({ value = [], onChange }) {
  const [other, setOther] = useState("");
  const custom = value.filter((v) => !EQUIPMENT_PRESETS.includes(v));
  const toggle = (item) =>
    onChange(
      value.includes(item) ? value.filter((v) => v !== item) : [...value, item]
    );
  const addOther = () => {
    const text = other.trim();
    if (text && !value.includes(text)) onChange([...value, text]);
    setOther("");
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-1.5">
        {EQUIPMENT_PRESETS.map((item) => {
          const on = value.includes(item);
          return (
            <button
              key={item}
              type="button"
              onClick={() => toggle(item)}
              aria-pressed={on}
              className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-colors cursor-pointer ${
                on
                  ? "border-cal-primary bg-cal-primary text-cal-on-primary"
                  : "border-cal-hairline bg-cal-canvas text-cal-ink hover:bg-cal-surface-soft"
              }`}
            >
              {item}
            </button>
          );
        })}
        {custom.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => toggle(item)}
            title="Remove"
            className="inline-flex items-center gap-1 rounded-full border border-cal-primary bg-cal-primary px-3 py-1 text-[12px] font-medium text-cal-on-primary cursor-pointer"
          >
            <span>{item}</span>
            <X size={12} />
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={other}
          onChange={(e) => setOther(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addOther();
            }
          }}
          placeholder='Something else, e.g. "Light weights, 1 kg each"'
          className={inputClass}
        />
        <button
          type="button"
          onClick={addOther}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-[8px] border border-cal-hairline bg-cal-canvas px-3.5 text-[12.5px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer"
        >
          Add
        </button>
      </div>
    </div>
  );
}

/** A short list of one-line notes, e.g. "Skip this if…" reasons. */
export function TextListEditor({
  control,
  register,
  name,
  placeholder,
  addLabel,
}) {
  const { fields, append, remove } = useFieldArray({ control, name });
  return (
    <div>
      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-center gap-2">
            <input
              {...register(`${name}.${index}.value`)}
              className={inputClass}
              placeholder={placeholder}
            />
            <button
              type="button"
              onClick={() => remove(index)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-cal-hairline bg-cal-canvas text-cal-muted hover:border-cal-error/30 hover:bg-cal-error/10 hover:text-cal-error transition-colors cursor-pointer"
              title="Remove"
              aria-label="Remove"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => append({ value: "" })}
        className={addButton}
      >
        <Plus size={14} />
        <span>{addLabel}</span>
      </button>
    </div>
  );
}
