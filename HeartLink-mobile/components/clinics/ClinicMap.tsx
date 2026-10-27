import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { useDs } from "../onboarding/useDs";
import type { Clinic, Point } from "../../services/clinics";
import { clinicMapHtml } from "./clinicMapHtml";

// HL-078: the clinics map. OpenStreetMap through Leaflet in a WebView instead of Google's map SDK, which needs a
// key in a real Android build and crashed the app without one. If the map can't load, the list next to it still
// works; nothing here is needed to call or get directions.

// Sent as the page address so OpenStreetMap's tile servers can see which app is asking (their usage policy).
const MAP_BASE_URL = "https://heartlink-admin-six.vercel.app/";

export function ClinicMap({
  clinics,
  you,
  selectedId,
  onSelect,
  height = 220,
}: {
  clinics: Clinic[];
  you: Point | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  height?: number;
}) {
  const { c } = useDs();
  const webRef = useRef<WebView>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  // Rebuilt only when the clinics or the patient's position change; picking a clinic just moves the highlight.
  const html = useMemo(
    () => clinicMapHtml(clinics, you, { er: c.danger, other: c.primary, selected: c.navy, you: c.line }),
    [clinics, you, c.danger, c.primary, c.navy, c.line],
  );

  useEffect(() => {
    if (state === "ready" && selectedId) webRef.current?.injectJavaScript(`window.selectClinic(${JSON.stringify(selectedId)}); true;`);
  }, [selectedId, state, html]);

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as { type: string; id?: string };
      if (msg.type === "ready") setState("ready");
      else if (msg.type === "error") setState("failed");
      else if (msg.type === "select" && msg.id) onSelect(msg.id);
    } catch {
      // Not one of ours
    }
  };

  return (
    <View
      style={{ height, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: c.hairline, backgroundColor: c.surface }}
      accessibilityLabel="Map of nearby clinics"
    >
      {state === "failed" ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
          <Text style={{ fontSize: 14, color: c.slate, textAlign: "center" }}>
            {"The map couldn't load. The list below still works."}
          </Text>
        </View>
      ) : (
        <WebView
          ref={webRef}
          key={html}
          originWhitelist={["*"]}
          source={{ html, baseUrl: MAP_BASE_URL }}
          onMessage={onMessage}
          onError={() => setState("failed")}
          onHttpError={() => setState("failed")}
          javaScriptEnabled
          setSupportMultipleWindows={false}
          style={{ flex: 1, backgroundColor: c.surface }}
        />
      )}
      {state === "loading" ? (
        <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : null}
    </View>
  );
}
