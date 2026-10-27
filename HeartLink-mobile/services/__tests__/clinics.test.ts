import { CEBU_CITY, clinicLabel, distanceLabel, matchesSearch, toClinics } from "../clinics";

// HL-078 / HL-088: the clinic directory, from real fields only.

const ROWS = [
  { id: "hc", name: "Pardo Health Center", kind: "health_center", has_er: null, latitude: 10.279, longitude: 123.856 },
  { id: "far-er", name: "North General Hospital", kind: "er_hospital", has_er: true, latitude: 10.3732, longitude: 123.9146, phone: "+63 32 343 7777" },
  { id: "near-er", name: "Vicente Sotto Memorial Medical Center", kind: "er_hospital", has_er: true, latitude: 10.3078, longitude: 123.8917, address: "B. Rodriguez Street, Cebu City" },
  { id: "clinic", name: "Uy Medical Clinic", kind: "clinic", has_er: null, latitude: "10.297", longitude: "123.886", phone: "  " },
  { id: "hosp", name: "Cebu City Medical Center", kind: "hospital", has_er: null, latitude: 10.2974, longitude: 123.8915 },
  // Dropped: old hand-made rows without a kind, rows without a location
  { id: "old", name: "Chong Hua Hospital Heart Institute", doctor: "Dr. Maria Santos", latitude: 10.31, longitude: 123.89, phone: "1234567890" },
  { id: "nowhere", name: "Somewhere", kind: "clinic", latitude: null, longitude: 123.9 },
];

describe("toClinics", () => {
  const clinics = toClinics(ROWS, CEBU_CITY);

  it("puts emergency rooms first, each group nearest first", () => {
    expect(clinics.map((c) => c.id)).toEqual(["near-er", "far-er", "clinic", "hosp", "hc"]);
  });

  it("drops rows that aren't from the checked directory or have no location", () => {
    expect(clinics.find((c) => c.id === "old" || c.id === "nowhere")).toBeUndefined();
  });

  it("offers a phone number only when one was sent, and keeps the address", () => {
    expect(clinics.find((c) => c.id === "far-er")?.phone).toBe("+63 32 343 7777");
    expect(clinics.find((c) => c.id === "clinic")?.phone).toBeNull();
    expect(clinics.find((c) => c.id === "near-er")?.address).toBe("B. Rodriguez Street, Cebu City");
  });

  it("gives an empty list for anything that isn't a list", () => {
    expect(toClinics({ detail: "error" }, CEBU_CITY)).toEqual([]);
    expect(toClinics(undefined, CEBU_CITY)).toEqual([]);
  });
});

describe("labels", () => {
  it("says Emergency room only when the place really has one", () => {
    expect(clinicLabel({ kind: "er_hospital", hasEr: true })).toBe("Emergency room");
    expect(clinicLabel({ kind: "hospital", hasEr: null })).toBe("Hospital");
    expect(clinicLabel({ kind: "hospital", hasEr: false })).toBe("Hospital");
    expect(clinicLabel({ kind: "health_center", hasEr: null })).toBe("Health centre");
    expect(clinicLabel({ kind: "clinic", hasEr: null })).toBe("Clinic");
  });

  it("shows short distances in metres", () => {
    expect(distanceLabel(0.42)).toBe("420 m");
    expect(distanceLabel(3.456)).toBe("3.5 km");
  });

  it("searches by name, address and type", () => {
    const [vsmmc] = toClinics([ROWS[2]], CEBU_CITY);
    expect(matchesSearch(vsmmc, "sotto")).toBe(true);
    expect(matchesSearch(vsmmc, "rodriguez")).toBe(true);
    expect(matchesSearch(vsmmc, "emergency")).toBe(true);
    expect(matchesSearch(vsmmc, "dental")).toBe(false);
  });
});
