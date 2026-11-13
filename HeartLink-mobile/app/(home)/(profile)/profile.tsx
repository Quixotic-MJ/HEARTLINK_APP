import React, { useCallback, useMemo, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../../lib/api";
import { ScreenWrapper } from "../../../components/ui/ScreenWrapper";
import { Skeleton } from "../../../components/ui/Skeleton";
import AnimatedButton from "../../../components/ui/AnimatedButton";
import { Header } from "../../../components/Header";
import { useDs } from "../../../components/onboarding/useDs";
import DsButton from "../../../components/onboarding/DsButton";
import { BadgeTint, IconBadge, InfoNote, McIcon } from "../../../components/onboarding/QuestionLayout";
import { SquareIconButton } from "../../../components/exercise/ExerciseBits";
import { useUser } from "../../../contexts/UserContext";
import { useToast } from "../../../contexts/ToastContext";
import { useProfileDetails, type ProfileDetails } from "../../../hooks/useProfileDetails";
import { useRefetchOnFocus } from "../../../hooks/useRefetchOnFocus";
import { sharePdf } from "../../../services/sharePdf";
import { ds } from "../../../constants/theme";

// The patient's profile: their details, latest readings and a few shortcuts. Built on the design system (DESIGN.md
// with HEARTLINK.md). The data comes from useProfileDetails (saved on the phone, retried, refreshed on every visit), so
// it no longer stays blank when the server is slow to answer. "Long-term analytics" was removed here (it's on Trends).

const P = ds.light;

/** "June 15, 1985" from "1985-06-15" (kept as written if it isn't a date). */
function longDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return iso && !Number.isNaN(d.getTime()) ? d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : iso;
}

/** "Nov 13" for a reading's date. */
function shortDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function bmiOf(p: Pick<ProfileDetails, "heightCm" | "weightKg">): string {
  if (!p.heightCm || !p.weightKg) return "--";
  return (p.weightKg / Math.pow(p.heightCm / 100, 2)).toFixed(1);
}

const capitalise = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] ?? ch);

function SectionTitle({ children }: { children: string }) {
  const { c } = useDs();
  return (
    <Text accessibilityRole="header" style={{ fontSize: 20, lineHeight: 26, fontWeight: "600", color: c.ink, marginTop: 28, marginBottom: 12 }}>
      {children}
    </Text>
  );
}

function ReadingTile({ icon, tint, value, unit, label, note }: { icon: McIcon; tint: BadgeTint; value: string; unit?: string; label: string; note?: string }) {
  const { c } = useDs();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value === "--" ? "not logged yet" : `${value}${unit ? ` ${unit}` : ""}`}${note ? `, ${note}` : ""}`}
      style={{ flex: 1, minWidth: 0, padding: 14, gap: 10, borderRadius: 12, borderWidth: 1, borderColor: c.hairline, backgroundColor: c.canvas }}
    >
      <IconBadge icon={icon} tint={tint} size={36} />
      <View style={{ gap: 2 }}>
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 20, fontWeight: "600", color: c.ink, fontVariant: ["tabular-nums"] }}>
          {value}
          {unit && value !== "--" ? <Text style={{ fontSize: 13, fontWeight: "400", color: c.slate }}>{` ${unit}`}</Text> : null}
        </Text>
        <Text numberOfLines={2} style={{ fontSize: 13, lineHeight: 17, color: c.slate }}>{label}</Text>
        {note ? <Text numberOfLines={1} style={{ fontSize: 12, color: c.steel }}>{note}</Text> : null}
      </View>
    </View>
  );
}

function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const { c } = useDs();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16, minHeight: 52, paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.hairlineSoft }}
    >
      <Text style={{ fontSize: 15, color: c.slate }}>{label}</Text>
      <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 15, fontWeight: "500", color: c.ink, textAlign: "right" }}>{value}</Text>
    </View>
  );
}

function LinkRow({ icon, tint, label, sub, onPress, last }: { icon: McIcon; tint: BadgeTint; label: string; sub: string; onPress: () => void; last?: boolean }) {
  const { c } = useDs();
  return (
    <AnimatedButton
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${sub}`}
      style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 64, paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.hairlineSoft }}
    >
      <IconBadge icon={icon} tint={tint} size={40} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>{label}</Text>
        <Text style={{ fontSize: 13, color: c.slate }}>{sub}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={c.steel} />
    </AnimatedButton>
  );
}

// ─── Edit profile ─────────────────────────────────────────────────────────────

type EditData = { name: string; email: string; phone: string; birthdate: string; gender: string; height: string; weight: string };

function EditField({
  label,
  value,
  onChangeText,
  editable = true,
  keyboardType = "default",
  hint,
}: {
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  editable?: boolean;
  keyboardType?: "default" | "numeric" | "phone-pad";
  hint?: string;
}) {
  const { c } = useDs();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 14, fontWeight: "500", color: c.ink }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        keyboardType={keyboardType}
        accessibilityLabel={label}
        placeholderTextColor={c.steel}
        style={{
          height: 48,
          paddingHorizontal: 14,
          borderWidth: 1,
          borderColor: c.hairlineStrong,
          borderRadius: 8,
          fontSize: 16,
          color: editable ? c.ink : c.slate,
          backgroundColor: editable ? c.canvas : c.surface,
        }}
      />
      {hint ? <Text style={{ fontSize: 13, color: c.steel }}>{hint}</Text> : null}
    </View>
  );
}

function EditProfileModal({
  visible,
  onClose,
  currentData,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  currentData: EditData;
  onSave: (data: EditData) => Promise<void> | void;
}) {
  const { c } = useDs();
  const [form, setForm] = useState<EditData>(currentData);
  const [isSaving, setIsSaving] = useState(false);

  // Each time it opens, start from the saved details
  const openWith = visible ? currentData : null;
  const [filledFrom, setFilledFrom] = useState<typeof openWith>(null);
  if (openWith !== filledFrom) {
    setFilledFrom(openWith);
    if (visible) {
      setForm(currentData);
      setIsSaving(false);
    }
  }
  const set = (key: keyof EditData) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(form);
    setIsSaving(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: c.canvas }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 20,
            paddingTop: Platform.OS === "ios" ? 56 : 24,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: c.hairline,
          }}
        >
          <SquareIconButton icon="x" label="Cancel" onPress={onClose} />
          <Text accessibilityRole="header" style={{ flex: 1, fontSize: 22, fontWeight: "600", color: c.ink }}>
            Edit profile
          </Text>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}>
          <EditField label="Full name" value={form.name} onChangeText={set("name")} />
          <EditField label="Email" value={form.email} editable={false} hint="Your email signs you in, so it can't be changed here." />
          <EditField label="Phone" value={form.phone} onChangeText={set("phone")} keyboardType="phone-pad" />
          <EditField label="Date of birth" value={form.birthdate} onChangeText={set("birthdate")} hint="Year-month-day, for example 1985-06-15" />
          <EditField label="Sex" value={form.gender} onChangeText={set("gender")} hint="Male or female" />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <EditField label="Height (cm)" value={form.height} onChangeText={set("height")} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <EditField label="Weight (kg)" value={form.weight} onChangeText={set("weight")} keyboardType="numeric" />
            </View>
          </View>
          <InfoNote icon="info" text="Your BMI updates from your height and weight. Blood pressure and pulse come from your check-ins." />
          <DsButton label="Save changes" onPress={handleSave} loading={isSaving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Profile Screen ───────────────────────────────────────────────────────────

export default function ProfileScreen({ isTab = false }: { isTab?: boolean } = {}) {
  const { c, isDark } = useDs();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { userId, refreshUser } = useUser();
  const { showToast } = useToast();
  const query = useProfileDetails();
  useRefetchOnFocus(query.refetch);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const p = query.data;
  const name = p ? `${p.firstName} ${p.lastName}`.trim() : "";
  const bp = p?.bp ? `${p.bp.systolic}/${p.bp.diastolic}` : "--";
  const bmi = p ? bmiOf(p) : "--";
  // One object per loaded profile: the edit form refills from it each time it opens
  const editData: EditData = useMemo(
    () => ({
      name,
      email: p?.email ?? "",
      phone: p?.phone ?? "",
      birthdate: p?.birthdate ?? "",
      gender: p?.sex ?? "",
      height: p?.heightCm ? String(p.heightCm) : "",
      weight: p?.weightKg ? String(p.weightKg) : "",
    }),
    [name, p?.email, p?.phone, p?.birthdate, p?.sex, p?.heightCm, p?.weightKg]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query]);

  const handleUpdateData = async (newData: EditData) => {
    try {
      const names = newData.name.trim().split(/\s+/);
      const height = Number.parseFloat(newData.height);
      const weight = Number.parseFloat(newData.weight);
      const response = await apiFetch(`/api/users/${userId}/profile`, {
        method: "PUT",
        body: JSON.stringify({
          first_name: names[0] || "",
          last_name: names.slice(1).join(" "),
          email: newData.email || null,
          phone: newData.phone || null,
          date_of_birth: newData.birthdate || null,
          sex: newData.gender || null,
          height_cm: Number.isFinite(height) ? height : null,
          weight_kg: Number.isFinite(weight) ? weight : null,
        }),
      });
      const resData = await response.json().catch(() => ({}));
      if (!response.ok) {
        showToast({ title: "Couldn't save", message: resData.detail || "Your changes weren't saved. Try again.", type: "error" });
        return;
      }
      showToast({ title: "Profile updated", message: "Your details are saved.", type: "success" });
      setShowUpdateModal(false);
      queryClient.invalidateQueries({ queryKey: ["profileDetails"] });
      await refreshUser();
    } catch {
      showToast({ title: "Couldn't save", message: "Check your connection, then try again.", type: "error" });
    }
  };

  const exportPDF = async () => {
    if (!p) return;
    const row = (label: string, value: string) => `<tr><td>${escapeHtml(label)}</td><td class="v">${escapeHtml(value || "Not provided")}</td></tr>`;
    const html = `
      <html><head><style>
        body { font-family: Helvetica, sans-serif; padding: 40px; color: ${P.ink}; line-height: 1.5; }
        h1 { font-size: 26px; margin: 0 0 4px; } p { margin: 0 0 28px; color: ${P.slate}; }
        h2 { font-size: 18px; margin: 24px 0 8px; }
        table { width: 100%; border-collapse: collapse; }
        td { text-align: left; padding: 12px 14px; border-bottom: 1px solid ${P.hairline}; font-size: 15px; color: ${P.charcoal}; }
        td.v { font-weight: bold; color: ${P.ink}; }
      </style></head><body>
        <h1>${escapeHtml(name || "My profile")}</h1>
        <p>HeartLink profile, ${escapeHtml(new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }))}</p>
        <h2>Personal details</h2>
        <table>${row("Email", p.email)}${row("Phone", p.phone)}${row("Date of birth", longDate(p.birthdate))}${row("Sex", capitalise(p.sex))}</table>
        <h2>Body and readings</h2>
        <table>${row("Height", p.heightCm ? `${p.heightCm} cm` : "")}${row("Weight", p.weightKg ? `${p.weightKg} kg` : "")}${row("BMI", bmi === "--" ? "" : bmi)}${row("Latest blood pressure", p.bp ? `${bp} mmHg (${shortDate(p.bp.loggedAt)})` : "")}${row("Resting heart rate", p.restingHr ? `${p.restingHr} bpm` : "")}</table>
      </body></html>`;
    try {
      if ((await sharePdf(html, "HeartLink_profile", "Share your profile")) === "unavailable") {
        showToast({ title: "Can't share", message: "Sharing isn't available on this phone.", type: "error" });
      }
    } catch {
      showToast({ title: "Couldn't make the PDF", message: "Try again in a moment.", type: "error" });
    }
  };

  const initials = name ? name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() : "";
  const firstLoad = !p && query.isPending;

  return (
    <ScreenWrapper edges={["top"]} withScrollView={false} safeAreaClassName="flex-1 bg-ds-canvas">
      <StatusBar style={isDark ? "light" : "dark"} />
      {isTab ? <Header /> : null}

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: isTab ? 4 : 12, paddingBottom: 140 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.line} />}
      >
        {/* Title */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {!isTab ? <SquareIconButton icon="arrow-left" label="Go back" onPress={() => router.back()} /> : null}
          <View style={{ flex: 1, gap: 4 }}>
            <Text accessibilityRole="header" style={{ fontSize: 28, lineHeight: 35, fontWeight: "600", color: c.ink }}>
              Profile
            </Text>
            <Text style={{ fontSize: 15, lineHeight: 22, color: c.slate }}>Your details and latest readings.</Text>
          </View>
        </View>

        {query.isError && !p ? (
          <View style={{ marginTop: 20, gap: 12 }}>
            <InfoNote icon="wifi-off" title="Your profile couldn't load" text="The server may be waking up. Check your connection, then try again." />
            <DsButton label="Try again" variant="secondary" block onPress={() => query.refetch()} />
          </View>
        ) : firstLoad ? (
          <View style={{ marginTop: 20, gap: 12 }} accessibilityLabel="Loading your profile">
            <Skeleton style={{ height: 88, borderRadius: 12 }} />
            <Skeleton style={{ height: 120, borderRadius: 12 }} />
            <Skeleton style={{ height: 260, borderRadius: 12 }} />
          </View>
        ) : (
          <>
            {/* Who */}
            <View style={{ marginTop: 20, flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: c.hairline, backgroundColor: c.canvas }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: c.tint }}>
                {initials ? (
                  <Text style={{ fontSize: 18, fontWeight: "600", color: c.onTint }}>{initials}</Text>
                ) : (
                  <Feather name="user" size={22} color={c.onTint} />
                )}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text numberOfLines={1} style={{ fontSize: 18, fontWeight: "600", color: c.ink }}>{name || "Your name"}</Text>
                <Text numberOfLines={1} style={{ fontSize: 14, color: c.slate }}>{p?.email || "No email"}</Text>
              </View>
              <SquareIconButton icon="edit-2" label="Edit profile" onPress={() => setShowUpdateModal(true)} />
            </View>
            {query.isError ? (
              <Text style={{ marginTop: 8, fontSize: 13, color: c.steel }}>{"Showing your saved details. Pull down to try again."}</Text>
            ) : null}

            {/* Readings */}
            <SectionTitle>Latest readings</SectionTitle>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <ReadingTile icon="heart-pulse" tint="sky" value={bp} unit="mmHg" label="Blood pressure" note={p?.bp ? shortDate(p.bp.loggedAt) : undefined} />
              <ReadingTile icon="pulse" tint="mint" value={p?.restingHr ? String(p.restingHr) : "--"} unit="bpm" label="Resting pulse" />
              <ReadingTile icon="scale-bathroom" tint="lavender" value={bmi} label="BMI" />
            </View>
            {!p?.bp ? (
              <Text style={{ marginTop: 10, fontSize: 13, lineHeight: 18, color: c.steel }}>
                Log a check-in from Today to see your blood pressure here.
              </Text>
            ) : null}

            {/* Details */}
            <SectionTitle>Personal details</SectionTitle>
            <View style={{ paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: c.hairline, backgroundColor: c.canvas }}>
              <DetailRow label="Phone" value={p?.phone || "Not provided"} />
              <DetailRow label="Date of birth" value={p?.birthdate ? longDate(p.birthdate) : "Not provided"} />
              <DetailRow label="Sex" value={p?.sex ? capitalise(p.sex) : "Not provided"} />
              <DetailRow label="Height" value={p?.heightCm ? `${p.heightCm} cm` : "Not provided"} />
              <DetailRow label="Weight" value={p?.weightKg ? `${p.weightKg} kg` : "Not provided"} last />
            </View>

            {/* More */}
            <SectionTitle>More</SectionTitle>
            <View style={{ paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: c.hairline, backgroundColor: c.canvas }}>
              <LinkRow icon="account-group-outline" tint="sky" label="My care team" sub="Your doctors and emergency contacts" onPress={() => router.push("/(home)/(profile)/care-team")} />
              <LinkRow icon="file-document-outline" tint="peach" label="Visit summary" sub="Your last 7 days for a checkup" onPress={() => router.push("/(home)/(profile)/health-report")} />
              <LinkRow icon="file-download-outline" tint="lavender" label="Download my profile" sub="Your details and readings as a PDF" onPress={exportPDF} last />
            </View>
          </>
        )}
      </ScrollView>

      <EditProfileModal visible={showUpdateModal} onClose={() => setShowUpdateModal(false)} currentData={editData} onSave={handleUpdateData} />
    </ScreenWrapper>
  );
}
