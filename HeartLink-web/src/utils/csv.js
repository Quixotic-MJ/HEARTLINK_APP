/**
 * HL-080: rows → a CSV file the browser downloads (Excel and Google Sheets open it).
 * Cells that start with = + - @ get a leading ' so a spreadsheet shows them as text instead of running them as a
 * formula (a name like "=HYPERLINK(...)" typed into the app can't do anything when the file is opened).
 */

const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value) {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** columns: [{ label, value: (row) => any }] */
export function toCsv(rows, columns) {
  const lines = [columns.map((c) => csvCell(c.label)).join(",")];
  for (const row of rows) lines.push(columns.map((c) => csvCell(c.value(row))).join(","));
  // The byte-order mark lets Excel read accents (ñ, é) correctly
  return String.fromCharCode(0xfeff) + lines.join("\r\n") + "\r\n";
}

export function downloadCsv(filename, csv) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
