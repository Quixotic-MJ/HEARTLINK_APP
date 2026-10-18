import React, { useState } from "react";
import { Linking, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import YoutubePlayer from "react-native-youtube-iframe";
import AnimatedButton from "../ui/AnimatedButton";
import DsButton from "../onboarding/DsButton";
import { useDs } from "../onboarding/useDs";
import { WORKOUT } from "./ExerciseBits";
import { Routine, SECTION_NAME, describePart } from "../../services/exerciseSession";

// The expert's video and pictures for an exercise: a video player that fits its space, a
// full-screen picture viewer, and pop-ups (the video, and all the steps) for use during an exercise.

/** The YouTube video id in a link, or null for other links. */
export function youtubeId(url: string) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|shorts\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{6,})/);
  return match ? match[1] : null;
}

/**
 * The exercise video, 16:9, filling the width it's given. YouTube links play here; any other link
 * opens in the phone's browser. Nothing plays until the patient taps play.
 */
export function ExerciseVideo({ url, dark = false }: { url: string; dark?: boolean }) {
  const { c } = useDs();
  const [width, setWidth] = useState(0);
  const [failed, setFailed] = useState(false);
  const id = youtubeId(url);
  const soft = dark ? WORKOUT.soft : c.slate;

  if (!id || failed) {
    return (
      <View style={{ gap: 8 }}>
        {failed ? <Text style={{ fontSize: 14, color: soft }}>{"The video couldn't play here."}</Text> : null}
        <DsButton label="Open the video" variant="secondary" block={false} onPress={() => Linking.openURL(url).catch(() => {})} style={{ alignSelf: "flex-start" }} />
      </View>
    );
  }
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ aspectRatio: 16 / 9, borderRadius: 12, overflow: "hidden", backgroundColor: dark ? WORKOUT.raised : c.surface }}
    >
      {width > 0 ? (
        <YoutubePlayer
          width={width}
          height={(width * 9) / 16}
          videoId={id}
          play={false}
          onError={() => setFailed(true)}
          initialPlayerParams={{ modestbranding: true, rel: false }}
        />
      ) : null}
    </View>
  );
}

/** A picture shown full screen on black, with a large close button. */
export function PictureViewer({ uri, onClose }: { uri: string | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "#000000" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close the picture">
          {uri ? <Image source={{ uri }} style={{ flex: 1 }} contentFit="contain" accessibilityIgnoresInvertColors /> : null}
        </Pressable>
        <AnimatedButton
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close the picture"
          style={{
            position: "absolute",
            top: insets.top + 12,
            right: 16,
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: "rgba(255,255,255,0.9)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name="x" size={22} color="#1a1a1a" />
        </AnimatedButton>
      </View>
    </Modal>
  );
}

/** A small picture that opens full screen when tapped. */
export function PictureThumb({ uri, label, size = 56 }: { uri: string; label: string; size?: number }) {
  const { c } = useDs();
  const [open, setOpen] = useState(false);
  return (
    <>
      <AnimatedButton
        onPress={() => setOpen(true)}
        accessibilityRole="imagebutton"
        accessibilityLabel={`Picture: ${label}. Opens full screen`}
        style={{ width: size, height: size, borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: c.hairline, backgroundColor: c.surface }}
      >
        <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" />
      </AnimatedButton>
      <PictureViewer uri={open ? uri : null} onClose={() => setOpen(false)} />
    </>
  );
}

/** The video in a pop-up during an exercise, on the workout view's navy. */
export function VideoSheet({ url, visible, onClose }: { url: string; visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close the video" />
        <View
          accessibilityViewIsModal
          style={{ backgroundColor: WORKOUT.bg, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: 20, paddingTop: 16, paddingBottom: Math.max(insets.bottom, 16) + 12, gap: 14 }}
        >
          <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: "600", color: WORKOUT.ink }}>
            {"How it's done"}
          </Text>
          <Text style={{ fontSize: 14, color: WORKOUT.soft }}>The exercise is paused while you watch.</Text>
          {visible ? <ExerciseVideo url={url} dark /> : null}
          <AnimatedButton
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close and carry on"
            style={{ height: 52, borderRadius: 8, backgroundColor: WORKOUT.ink, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ fontSize: 16, fontWeight: "600", color: WORKOUT.bg }}>Close and carry on</Text>
          </AnimatedButton>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Every step of the exercise with its picture, in a pop-up during the exercise (which is paused
 * while it's open), so patients can look ahead or back without skipping. Tap a picture to enlarge.
 */
export function StepsSheet({ routine, current, visible, onClose }: { routine: Routine; current: number; visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState<string | null>(null);
  const groups: { title: string; items: { key: string; text: string; details: string; amount?: string; image?: string; index?: number }[] }[] = [];
  if (routine.setup.length) groups.push({ title: "Get into position", items: routine.setup.map((s, i) => ({ key: `s${i}`, text: s.text, details: s.details, image: s.image })) });
  (["warmup", "main", "cooldown"] as const).forEach((section) => {
    const items = routine.steps
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.section === section)
      .map(({ s, i }) => ({ key: `p${i}`, text: s.text, details: s.details, amount: describePart(s), image: s.image, index: i }));
    if (items.length === 0) return;
    const title = section === "main" && routine.rounds > 1 ? `${SECTION_NAME.main}, ${routine.rounds} rounds` : SECTION_NAME[section];
    groups.push({ title, items });
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" }}>
        <Pressable style={{ flex: 1, minHeight: 60 }} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close the steps" />
        <View
          accessibilityViewIsModal
          style={{ maxHeight: "88%", backgroundColor: WORKOUT.bg, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 16, paddingBottom: Math.max(insets.bottom, 16) + 12 }}
        >
          <View style={{ paddingHorizontal: 20, gap: 4, marginBottom: 8 }}>
            <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: "600", color: WORKOUT.ink }}>
              All steps
            </Text>
            <Text style={{ fontSize: 14, color: WORKOUT.soft }}>The exercise is paused while you look.</Text>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 18 }}>
            {groups.map((g) => (
              <View key={g.title} style={{ gap: 10 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: WORKOUT.line }}>{g.title}</Text>
                {g.items.map((item) => {
                  const now = item.index === current;
                  return (
                    <View
                      key={item.key}
                      className="flex-row"
                      style={{ gap: 12, padding: 10, borderRadius: 12, borderWidth: now ? 2 : 1, borderColor: now ? WORKOUT.line : WORKOUT.track, backgroundColor: now ? "rgba(79,182,230,0.14)" : "transparent" }}
                    >
                      {item.image ? (
                        <AnimatedButton
                          onPress={() => setOpen(item.image ?? null)}
                          accessibilityRole="imagebutton"
                          accessibilityLabel={`Picture: ${item.text}. Opens full screen`}
                          style={{ width: 96, height: 72, borderRadius: 8, overflow: "hidden", backgroundColor: WORKOUT.raised }}
                        >
                          <Image source={{ uri: item.image }} style={{ width: 96, height: 72 }} contentFit="cover" />
                        </AnimatedButton>
                      ) : null}
                      <View style={{ flex: 1, gap: 3 }}>
                        {now ? <Text style={{ fontSize: 12, fontWeight: "600", color: WORKOUT.line }}>Doing now</Text> : null}
                        <Text style={{ fontSize: 16, lineHeight: 22, fontWeight: "500", color: WORKOUT.ink }}>{item.text}</Text>
                        {item.details ? <Text style={{ fontSize: 14, lineHeight: 20, color: WORKOUT.soft }}>{item.details}</Text> : null}
                        {item.amount ? <Text style={{ fontSize: 13, color: WORKOUT.muted }}>{item.amount}</Text> : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </ScrollView>
          <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
            <AnimatedButton
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close and carry on"
              style={{ height: 52, borderRadius: 8, backgroundColor: WORKOUT.ink, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontSize: 16, fontWeight: "600", color: WORKOUT.bg }}>Close and carry on</Text>
            </AnimatedButton>
          </View>
        </View>
      </View>
      <PictureViewer uri={open} onClose={() => setOpen(null)} />
    </Modal>
  );
}
