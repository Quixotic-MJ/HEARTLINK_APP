import { useState } from "react";
import { PlusCircle, Trash2, ArrowUp, ArrowDown, Image as ImageIcon } from "lucide-react";
import { useFieldArray } from "react-hook-form";
import { BASE_URL, apiUpload } from "../../api";
import { EQUIPMENT_PRESETS, NEW_PART, formatSeconds, partSeconds } from "./exerciseParts";

// Pieces of the exercise form: the timed parts (warm-up, main, cool-down), the set-up list,
// the equipment picker and short text lists (skip if / stop if).

const inputClass =
  "w-full px-3 py-1.5 text-[12px] bg-[#FFFFFF] border border-[#E2E8F0] focus:border-[#0F172A] rounded-[6px] focus:outline-none text-[#0F172A] placeholder:text-[#94A3B8] transition-colors";
const smallLabel = "block text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-0.5";
const addButton = "flex items-center gap-1.5 text-[12px] font-semibold text-[#2E9AE8] hover:text-[#1C7AC8] transition-colors mt-2 cursor-pointer";
const iconButton = "p-1 hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A] disabled:opacity-30 rounded transition-colors cursor-pointer";

/** Full address for an uploaded picture ("/uploads/…" lives on the server). */
function pictureUrl(url) {
  if (!url || /^(https?:|data:)/.test(url)) return url;
  return `${BASE_URL.replace(/\/$/, "")}${url.startsWith("/") ? url : `/${url}`}`;
}

/** This step's own picture: a preview, the link, and an Upload button. */
function ImageField({ value, onChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="flex items-center gap-2">
      <div className="w-12 h-9 rounded-[6px] border border-[#E2E8F0] bg-[#FFFFFF] overflow-hidden shrink-0 flex items-center justify-center" title="This step's picture">
        {value ? <img src={pictureUrl(value)} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={14} className="text-[#94A3B8]" />}
      </div>
      <input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="This step's picture (optional): paste a link or upload" className={inputClass} />
      <label className="px-2.5 py-1 bg-[#FFFFFF] hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] font-semibold rounded-[6px] cursor-pointer shrink-0">
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
              setError(err?.data?.detail || "Upload failed. Please try again.");
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {error && <span className="text-[10.5px] text-[#A93226]">{error}</span>}
    </div>
  );
}

/**
 * One section of timed parts (warm-up, main or cool-down). Each part is either a time
 * (minutes and seconds) or a count (repeats, about N seconds each), optionally on both sides.
 */
export function PartsEditor({ control, register, watch, setValue, errors, name, title, hint, isBreathing = false, addLabel = "Add part" }) {
  const { fields, append, remove, move } = useFieldArray({ control, name });
  const rows = watch(name) || [];

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-[12.5px] font-semibold text-[#0F172A]">{title}</p>
        {rows.length > 0 && <p className="text-[11px] text-[#64748B]">{formatSeconds(rows.reduce((t, p) => t + partSeconds(p), 0))}</p>}
      </div>
      {hint && <p className="text-[11px] text-[#64748B] mb-2 leading-relaxed">{hint}</p>}
      <div className="space-y-2.5">
        {fields.map((field, index) => {
          const row = rows[index] || {};
          const err = errors?.[name]?.[index];
          return (
            <div key={field.id} className="flex items-start gap-2.5 border border-[#E2E8F0] rounded-[8px] p-2.5 bg-[#F8FAFC]/40">
              <div className="mt-1 text-[10px] font-bold text-[#94A3B8] bg-[#FFFFFF] border border-[#E2E8F0] w-5 h-5 flex items-center justify-center rounded-full shrink-0">{index + 1}</div>
              <div className="flex-1 space-y-2 min-w-0">
                <div>
                  <input
                    {...register(`${name}.${index}.instruction`)}
                    className={`${inputClass} font-semibold text-[12.5px] ${err?.instruction ? "border-[#A93226]" : ""}`}
                    placeholder={isBreathing ? "e.g. Breathe in slowly through your nose" : "e.g. Walk at a comfortable pace"}
                  />
                  {err?.instruction && <span className="text-[10px] text-[#A93226] mt-0.5 block font-medium">{err.instruction.message}</span>}
                </div>
                <input {...register(`${name}.${index}.details`)} className={inputClass} placeholder="Extra detail (optional), e.g. Keep your back straight" />

                <div className="flex flex-wrap items-end gap-2">
                  {isBreathing ? (
                    <div className="w-36">
                      <label className={smallLabel}>Breath</label>
                      <select {...register(`${name}.${index}.breath`)} className={`${inputClass} cursor-pointer`} title="The app moves the breathing circle to match.">
                        <option value="">From the words</option>
                        <option value="in">Breathe in</option>
                        <option value="hold">Hold</option>
                        <option value="out">Breathe out</option>
                      </select>
                    </div>
                  ) : (
                    <div className="w-28">
                      <label className={smallLabel}>How long</label>
                      <select {...register(`${name}.${index}.mode`)} className={`${inputClass} cursor-pointer`}>
                        <option value="time">A time</option>
                        <option value="count">A count</option>
                      </select>
                    </div>
                  )}

                  {row.mode === "count" && !isBreathing ? (
                    <>
                      <div className="w-20">
                        <label className={smallLabel}>Times</label>
                        <input type="number" min="1" {...register(`${name}.${index}.reps`)} className={inputClass} />
                      </div>
                      <div className="w-24">
                        <label className={smallLabel}>Secs each</label>
                        <input type="number" min="1" {...register(`${name}.${index}.seconds_per_rep`)} className={inputClass} title="About how long one repeat takes" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-20">
                        <label className={smallLabel}>Min</label>
                        <input type="number" min="0" {...register(`${name}.${index}.minutes`)} className={inputClass} />
                      </div>
                      <div className="w-20">
                        <label className={smallLabel}>Sec</label>
                        <input type="number" min="0" max="59" {...register(`${name}.${index}.seconds`)} className={inputClass} />
                      </div>
                    </>
                  )}

                  {!isBreathing && (
                    <label className="flex items-center gap-1.5 text-[11.5px] text-[#0F172A] pb-1.5 cursor-pointer select-none">
                      <input type="checkbox" {...register(`${name}.${index}.both_sides`)} className="accent-[#2E9AE8]" />
                      Both sides
                    </label>
                  )}
                  <span className="text-[11px] text-[#64748B] pb-1.5 ml-auto">{formatSeconds(partSeconds(row))}</span>
                </div>
                {err?.seconds && <span className="text-[10px] text-[#A93226] block font-medium">{err.seconds.message}</span>}

                <ImageField value={row.image} onChange={(url) => setValue(`${name}.${index}.image`, url, { shouldDirty: true })} />
              </div>
              <div className="flex items-center gap-1 mt-1 shrink-0">
                <button type="button" onClick={() => move(index, index - 1)} disabled={index === 0} className={iconButton} title="Move up">
                  <ArrowUp size={13} />
                </button>
                <button type="button" onClick={() => move(index, index + 1)} disabled={index === fields.length - 1} className={iconButton} title="Move down">
                  <ArrowDown size={13} />
                </button>
                <button type="button" onClick={() => remove(index)} className="p-1 hover:bg-[#F7E4E1] text-[#64748B] hover:text-[#A93226] rounded transition-colors cursor-pointer" title="Delete">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <button type="button" onClick={() => append({ ...NEW_PART })} className={addButton}>
        <PlusCircle size={14} /> <span>{addLabel}</span>
      </button>
    </div>
  );
}

/** Get-into-position instructions: done once, before the timer starts. No time. */
export function SetupEditor({ control, register, watch, setValue, name = "setupSteps" }) {
  const { fields, append, remove } = useFieldArray({ control, name });
  const rows = watch(name) || [];
  return (
    <div>
      <p className="text-[12.5px] font-semibold text-[#0F172A] mb-1">Get into position</p>
      <p className="text-[11px] text-[#64748B] mb-2 leading-relaxed">Done once before the timer starts, e.g. "Sit near the front of a sturdy chair, feet flat on the floor". No time needed.</p>
      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-start gap-2 border border-[#E2E8F0] rounded-[8px] p-2.5 bg-[#F8FAFC]/40">
            <div className="flex-1 space-y-2 min-w-0">
              <input {...register(`${name}.${index}.instruction`)} className={`${inputClass} font-semibold text-[12.5px]`} placeholder="e.g. Sit with your feet flat on the floor" />
              <input {...register(`${name}.${index}.details`)} className={inputClass} placeholder="Extra detail (optional)" />
              <ImageField value={rows[index]?.image} onChange={(url) => setValue(`${name}.${index}.image`, url, { shouldDirty: true })} />
            </div>
            <button type="button" onClick={() => remove(index)} className="p-1 mt-1 hover:bg-[#F7E4E1] text-[#64748B] hover:text-[#A93226] rounded transition-colors cursor-pointer" title="Delete">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => append({ instruction: "", details: "", image: "" })} className={addButton}>
        <PlusCircle size={14} /> <span>Add a set-up instruction</span>
      </button>
    </div>
  );
}

export function EquipmentPicker({ value = [], onChange }) {
  const [other, setOther] = useState("");
  const custom = value.filter((v) => !EQUIPMENT_PRESETS.includes(v));
  const toggle = (item) => onChange(value.includes(item) ? value.filter((v) => v !== item) : [...value, item]);
  const addOther = () => {
    const text = other.trim();
    if (text && !value.includes(text)) onChange([...value, text]);
    setOther("");
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {EQUIPMENT_PRESETS.map((item) => {
          const on = value.includes(item);
          return (
            <button
              key={item}
              type="button"
              onClick={() => toggle(item)}
              aria-pressed={on}
              className={`px-2.5 py-1 text-[11.5px] font-medium rounded-full border transition-colors cursor-pointer ${
                on ? "bg-[#0F172A] text-white border-[#0F172A]" : "bg-[#FFFFFF] text-[#0F172A] border-[#E2E8F0] hover:border-[#94A3B8]"
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
            className="px-2.5 py-1 text-[11.5px] font-medium rounded-full border bg-[#0F172A] text-white border-[#0F172A] cursor-pointer"
          >
            {item} ✕
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
        <button type="button" onClick={addOther} className="px-3 py-1.5 text-[11.5px] font-semibold bg-[#F8FAFC] hover:bg-[#E2E8F0] border border-[#E2E8F0] rounded-[6px] cursor-pointer shrink-0">
          Add
        </button>
      </div>
    </div>
  );
}

/** A short list of one-line notes, e.g. "Skip this if…" reasons. */
export function TextListEditor({ control, register, name, placeholder, addLabel }) {
  const { fields, append, remove } = useFieldArray({ control, name });
  return (
    <div>
      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <input {...register(`${name}.${index}.value`)} className={inputClass} placeholder={placeholder} />
            <button type="button" onClick={() => remove(index)} className="p-1.5 text-[#64748B] hover:text-[#A93226] bg-[#F8FAFC] hover:bg-[#F7E4E1] border border-[#E2E8F0] rounded-[6px] transition-colors cursor-pointer" title="Remove">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => append({ value: "" })} className={addButton}>
        <PlusCircle size={14} /> <span>{addLabel}</span>
      </button>
    </div>
  );
}
