// HL-171 (panel revision): the "Barangay contacts" form. The same checks as the server (backend/app/services/barangays.py),
// so mistakes show next to the field before saving. A changed number has to be checked again.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const EMPTY_FORM = {
  name: "",
  city: "Cebu City",
  hall_address: "",
  latitude: "",
  longitude: "",
  location_kind: "hall",
  hotline_1: "",
  hotline_2: "",
  numbers_checked: false,
  note: "",
};

const str = (v) => (v === null || v === undefined ? "" : String(v));

export function toForm(row) {
  if (!row) return { ...EMPTY_FORM };
  return {
    name: str(row.name),
    city: str(row.city) || "Cebu City",
    hall_address: str(row.hall_address),
    latitude: str(row.latitude),
    longitude: str(row.longitude),
    location_kind: row.location_kind || "hall",
    hotline_1: str(row.hotline_1),
    hotline_2: str(row.hotline_2),
    numbers_checked: Boolean(row.numbers_checked),
    note: str(row.note),
  };
}

export function validPhone(value) {
  return /^\+?[0-9 ()-]+$/.test(value) && value.replace(/\D/g, "").length >= 3 && value.replace(/\D/g, "").length <= 13;
}

/** Whether a number was changed from the saved one (the tick then has to be given again). */
export function numbersChanged(form, row) {
  return ["hotline_1", "hotline_2"].some((k) => form[k].trim() !== str(row?.[k]).trim());
}

/** Field errors in plain words; empty when the form can be saved. */
export function formErrors(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Enter the barangay's name.";
  const lat = form.latitude.trim();
  const lng = form.longitude.trim();
  if (lat || lng) {
    const a = Number(lat);
    const b = Number(lng);
    if (!lat || !lng || !Number.isFinite(a) || !Number.isFinite(b) || a < -90 || a > 90 || b < -180 || b > 180) {
      errors.location = "Enter the map location as two numbers, for example 10.3157 and 123.8854.";
    }
  }
  for (const k of ["hotline_1", "hotline_2"]) {
    if (form[k].trim() && !validPhone(form[k].trim())) {
      errors[k] = "Use digits only, for example 032 255 1234 or 0917 123 4567.";
    }
  }
  if (form.numbers_checked && !form.hotline_1.trim() && !form.hotline_2.trim()) {
    errors.numbers_checked = "Add a hotline number first.";
  }
  return errors;
}

/** What to send. On an edit, only what changed. */
export function toPayload(form, row) {
  const payload = {
    name: form.name.trim(),
    city: form.city.trim() || "Cebu City",
    hall_address: form.hall_address.trim(),
    latitude: form.latitude.trim() === "" ? null : Number(form.latitude),
    longitude: form.longitude.trim() === "" ? null : Number(form.longitude),
    location_kind: form.latitude.trim() ? form.location_kind : null,
    hotline_1: form.hotline_1.trim(),
    hotline_2: form.hotline_2.trim(),
    note: form.note.trim(),
    numbers_checked: form.numbers_checked,
  };
  if (!row) return payload;
  const changed = {};
  for (const [k, v] of Object.entries(payload)) {
    const before = row[k] === undefined ? null : row[k];
    if (k === "numbers_checked") {
      if (v !== Boolean(row.numbers_checked) || (v && numbersChanged(form, row))) changed[k] = v;
    } else if ((v === "" ? null : v) !== (before === "" ? null : before)) {
      changed[k] = v;
    }
  }
  return changed;
}

function shortDate(iso) {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? `${MONTHS[d.getMonth()]} ${d.getDate()}` : null;
}

/** The status column: "Checked Nov 25", "Not checked" or "No number". */
export function statusOf(row) {
  if (!row.hotline_1 && !row.hotline_2) return { key: "none", label: "No number" };
  if (row.numbers_checked) {
    const day = shortDate(row.checked_at);
    return { key: "checked", label: day ? `Checked ${day}` : "Checked" };
  }
  return { key: "unchecked", label: "Not checked" };
}

export function mapLink(lat, lng) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
