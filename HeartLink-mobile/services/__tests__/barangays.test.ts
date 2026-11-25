import { MAX_KM, barangayTitle, distanceLine, nearestBarangay, toBarangays } from "../barangays";

// HL-171: the nearest barangay, picked on the phone from the list.

const list = toBarangays([
  { id: "lahug", name: "Lahug", latitude: 10.331, longitude: 123.9, location_kind: "hall", phones: ["032 231 1234"] },
  { id: "apas", name: "Apas", latitude: "10.34", longitude: "123.91", location_kind: "centre", phones: [] },
  { id: "bad", name: "No place", latitude: null, longitude: null },
  { name: "", latitude: 10, longitude: 123 },
]);

describe("barangay list", () => {
  it("keeps only barangays with a name and a location", () => {
    expect(list.map((b) => b.id)).toEqual(["lahug", "apas"]);
    expect(list[0].phones).toEqual(["032 231 1234"]);
    expect(list[1].locationKind).toBe("centre");
  });

  it("finds the nearest one within 5 km", () => {
    expect(nearestBarangay(list, { latitude: 10.332, longitude: 123.901 })?.barangay.id).toBe("lahug");
    expect(nearestBarangay(list, { latitude: 10.341, longitude: 123.912 })?.barangay.id).toBe("apas");
    // Manila: far from every barangay on the list
    expect(nearestBarangay(list, { latitude: 14.5995, longitude: 120.9842 })).toBeNull();
    expect(MAX_KM).toBe(5);
    expect(nearestBarangay([], { latitude: 10.3, longitude: 123.9 })).toBeNull();
  });

  it("writes the name and distance in plain words", () => {
    expect(barangayTitle({ name: "Lahug" })).toBe("Barangay Lahug");
    expect(barangayTitle({ name: "Barangay Luz" })).toBe("Barangay Luz");
    expect(distanceLine({ locationKind: "hall" }, 0.83)).toBe("Hall about 850 m away");
    expect(distanceLine({ locationKind: "centre" }, 3.24)).toBe("About 3.2 km away (approximate)");
  });
});
