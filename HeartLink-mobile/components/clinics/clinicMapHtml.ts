import type { Clinic, Point } from "../../services/clinics";

// HL-078: the page inside ClinicMap's WebView. Leaflet with OpenStreetMap tiles: free, no Google key, nothing to
// crash when a key is missing. Pinned Leaflet version; the clinic data is passed as JSON (never as HTML).

export const LEAFLET_VERSION = "1.9.4";

export interface MapColors {
  er: string;
  other: string;
  selected: string;
  you: string;
}

/** JSON that is safe to place inside a <script> tag. */
function scriptJson(value: unknown): string {
  // "<" can't close the script tag, and U+2028 / U+2029 (line breaks to JavaScript) can't end a line early
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .split(String.fromCharCode(0x2028)).join("\\u2028")
    .split(String.fromCharCode(0x2029)).join("\\u2029");
}

export function clinicMapHtml(clinics: Clinic[], you: Point | null, colors: MapColors): string {
  const data = clinics.map((c) => ({ id: c.id, name: c.name, lat: c.latitude, lng: c.longitude, er: c.hasEr === true }));
  return `<!doctype html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css">
<style>html,body,#map{height:100%;margin:0;padding:0;background:#e5e3df}
.leaflet-tooltip{font:13px -apple-system,Roboto,sans-serif}
.leaflet-touch .leaflet-bar a{width:40px;height:40px;line-height:40px;font-size:20px}
.leaflet-touch .leaflet-bar a.hl-all,.leaflet-bar a.hl-all{display:block;width:auto;padding:0 12px;height:40px;white-space:nowrap;font:600 13px -apple-system,Roboto,sans-serif;line-height:40px;color:#1a1a1a;background:#fff;text-decoration:none}</style>
</head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js"></script>
<script>
(function () {
  var clinics = ${scriptJson(data)};
  var you = ${scriptJson(you)};
  var colors = ${scriptJson(colors)};
  function send(msg) { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg)); }
  if (!window.L) { send({ type: "error" }); return; }
  var map = L.map("map", { zoomControl: false });
  L.control.zoom({ position: "bottomright" }).addTo(map);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  var markers = {};
  var points = [];
  clinics.forEach(function (c) {
    var m = L.circleMarker([c.lat, c.lng], {
      radius: c.er ? 10 : 8, weight: 3, color: "#ffffff", fillOpacity: 1,
      fillColor: c.er ? colors.er : colors.other
    }).addTo(map);
    m.bindTooltip(c.name);
    m.on("click", function () { send({ type: "select", id: c.id }); });
    markers[c.id] = { marker: m, clinic: c };
    points.push([c.lat, c.lng]);
  });
  if (you) {
    L.circleMarker([you.latitude, you.longitude], { radius: 9, weight: 4, color: "#ffffff", fillColor: colors.you, fillOpacity: 1 })
      .addTo(map).bindTooltip("You", { permanent: true, direction: "top", offset: [0, -8] });
    points.push([you.latitude, you.longitude]);
  }
  // Fit every pin (and you). The page can load before the app gives the map its real size, which zoomed it right
  // in on one empty spot, so fit again once the size is known, until the person moves the map themselves.
  var moved = false;
  function fitAll() {
    map.invalidateSize();
    if (points.length > 1) map.fitBounds(points, { padding: [28, 28], maxZoom: 15 });
    else if (points.length === 1) map.setView(points[0], 15);
    else map.setView([10.3157, 123.8854], 13);
  }
  fitAll();
  map.on("dragstart", function () { moved = true; });
  map.getContainer().addEventListener("touchstart", function (e) { if (e.touches && e.touches.length > 1) moved = true; });
  window.addEventListener("resize", function () { if (!moved) fitAll(); });
  window.addEventListener("load", function () { if (!moved) fitAll(); });
  setTimeout(function () { if (!moved) fitAll(); }, 300);
  var ShowAll = L.Control.extend({
    options: { position: "topright" },
    onAdd: function () {
      var box = L.DomUtil.create("div", "leaflet-bar");
      var a = L.DomUtil.create("a", "hl-all", box);
      a.href = "#"; a.textContent = "Show all"; a.setAttribute("role", "button"); a.setAttribute("aria-label", "Show all clinics");
      L.DomEvent.on(a, "click", function (e) { L.DomEvent.preventDefault(e); moved = false; fitAll(); });
      L.DomEvent.disableClickPropagation(box);
      return box;
    }
  });
  new ShowAll().addTo(map);
  window.selectClinic = function (id) {
    Object.keys(markers).forEach(function (key) {
      var item = markers[key], on = key === id;
      item.marker.setStyle({ fillColor: on ? colors.selected : (item.clinic.er ? colors.er : colors.other), radius: on ? 11 : (item.clinic.er ? 9 : 7) });
      if (on) { item.marker.bringToFront(); map.panTo([item.clinic.lat, item.clinic.lng]); }
    });
  };
  send({ type: "ready" });
})();
</script>
</body></html>`;
}
