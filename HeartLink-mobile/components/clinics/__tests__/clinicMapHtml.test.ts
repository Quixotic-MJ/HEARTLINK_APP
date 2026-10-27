import { clinicMapHtml, LEAFLET_VERSION } from "../clinicMapHtml";
import type { Clinic } from "../../../services/clinics";

// HL-078: the OpenStreetMap page inside ClinicMap.

const colors = { er: "#e03131", other: "#1478b8", selected: "#0a1530", you: "#2e9ae8" };
const clinic = (over: Partial<Clinic>): Clinic => ({
  id: "1", name: "Clinic", kind: "clinic", hasEr: null, address: null, latitude: 10.3, longitude: 123.9, phone: null, distanceKm: 1, ...over,
});

describe("clinicMapHtml", () => {
  it("uses OpenStreetMap and a pinned Leaflet, never Google", () => {
    const html = clinicMapHtml([clinic({})], null, colors);
    expect(html).toContain("https://tile.openstreetmap.org/{z}/{x}/{y}.png");
    expect(html).toContain(`leaflet@${LEAFLET_VERSION}`);
    expect(html).toContain("OpenStreetMap</a> contributors");
    expect(html).not.toMatch(/google/i);
  });

  it("can't be broken out of by a clinic's name", () => {
    const html = clinicMapHtml([clinic({ name: '</script><script>alert("x")</script>' })], null, colors);
    expect(html).not.toContain('</script><script>alert("x")');
    expect(html).toContain("\\u003c/script>");
  });

  it("marks emergency rooms and the patient's position", () => {
    const html = clinicMapHtml([clinic({ id: "er", hasEr: true })], { latitude: 10.31, longitude: 123.89 }, colors);
    expect(html).toContain('"id":"er"');
    expect(html).toContain('"er":true');
    expect(html).toContain('"latitude":10.31');
  });
});
