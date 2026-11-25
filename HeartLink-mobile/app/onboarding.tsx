import React, { useEffect, useRef, useState } from "react";
import { Image, NativeScrollEvent, NativeSyntheticEvent, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import "../global.css";
import HeartLogo from "../components/ui/HeartLogo";
import AnimatedButton from "../components/ui/AnimatedButton";
import DsButton from "../components/onboarding/DsButton";
import { useDs } from "../components/onboarding/useDs";
import { ds } from "../constants/theme";
import { INTRO_SLIDES, IntroSlide, introButtons, slideAt } from "../components/onboarding/introSlides";

// ─── Starting screen ──────────────────────────────────────────────────────────
// 2026-11-25 (UI/UX redesign): a swipe-through intro. A picture at the top, a white panel with one short message,
// dots, and the buttons: Continue, then Skip and Next, then Get started. "Log in" stays at the top on every slide.
// The pictures are the team's flat illustrations (assets/images/intro/); a slide without one shows icon art.

// Below this height the pictures are smaller so nothing needs scrolling.
const COMPACT_HEIGHT = 700;
// The logo and "Log in" bar floats over the pictures, so its colour slides with them (no colour jump)
const TOP_BAR = 52;

// ─── The logo, beating slowly ─────────────────────────────────────────────────

function BeatingHeart({ size, delay }: { size: number; delay: number }) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    // "Lub-dub", then rest, repeated: a slow resting heartbeat.
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.12, { duration: 140, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 160 }),
          withTiming(1.06, { duration: 120, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 220 }),
          withTiming(1, { duration: 1300 })
        ),
        -1
      )
    );
  }, [delay, reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <HeartLogo size={size} />
    </Animated.View>
  );
}

// ─── One slide's picture: a big circle with the logo or an icon, and two floating labels ──────────────────────

function SlideArt({ slide, compact, topPad }: { slide: IntroSlide; compact: boolean; topPad: number }) {
  const { c } = useDs();
  // The team's illustration fills the picture area (its own background matches the slide's tint)
  if (slide.image) {
    return (
      <View style={{ flex: 1, backgroundColor: slide.imageBg ?? c[slide.tint], overflow: "hidden", paddingTop: topPad }}>
        <Image
          source={slide.image}
          resizeMode={slide.fit ?? "cover"}
          accessibilityIgnoresInvertColors
          style={{ width: "100%", height: "100%" }}
        />
      </View>
    );
  }
  const circle = compact ? 150 : 190;
  const chip = (text: string, pos: object) => (
    <View
      style={{
        position: "absolute",
        ...pos,
        backgroundColor: c.canvas,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: c.hairline,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: "600", color: c.ink }}>{text}</Text>
    </View>
  );
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c[slide.tint], paddingTop: topPad }}>
      <View style={{ width: circle + 120, height: circle + 90, alignItems: "center", justifyContent: "center" }}>
        <View
          style={{
            width: circle,
            height: circle,
            borderRadius: circle / 2,
            backgroundColor: c.canvas,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {slide.icon ? (
            <MaterialCommunityIcons
              // The icon names in introSlides.ts are MaterialCommunityIcons names
              name={slide.icon as keyof typeof MaterialCommunityIcons.glyphMap}
              size={circle * 0.45}
              color={c.primary}
            />
          ) : (
            <BeatingHeart size={circle * 0.5} delay={600} />
          )}
        </View>
        {chip(slide.chips[0], { top: 6, left: 0 })}
        {chip(slide.chips[1], { bottom: 6, right: 0 })}
      </View>
    </View>
  );
}

// ─── Starting screen ──────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const compact = height < COMPACT_HEIGHT;
  const { c, isDark } = useDs();
  const insets = useSafeAreaInsets();
  const pager = useRef<ScrollView>(null);
  // While a button slides the pages over, the scroll positions on the way are ignored, so the dots and buttons
  // don't flick back and forth (the glitch); the target slide is shown straight away.
  const target = useRef<number | null>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [index, setIndex] = useState(0);
  const last = INTRO_SLIDES.length - 1;
  const mode = introButtons(index);
  const slide = INTRO_SLIDES[index];
  // On the illustrations (always light), the top bar keeps dark text, also in dark mode
  const barInk = slide.image ? ds.light.ink : c.ink;

  useEffect(() => () => {
    if (settle.current) clearTimeout(settle.current);
  }, []);

  const goTo = (i: number) => {
    if (i === index && target.current === null) return;
    target.current = i;
    setIndex(i);
    pager.current?.scrollTo({ x: i * width, animated: true });
    if (settle.current) clearTimeout(settle.current);
    // In case the last scroll event never lands exactly on the page
    settle.current = setTimeout(() => {
      target.current = null;
    }, 900);
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    if (target.current !== null) {
      if (Math.abs(x - target.current * width) < 2) target.current = null;
      return;
    }
    const i = slideAt(x, width);
    if (i !== index) setIndex(i);
  };
  // After a finger swipe only; while a button moves the pages, the web can report "scroll ended" halfway
  const onSwipeEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (target.current !== null) return;
    const i = slideAt(e.nativeEvent.contentOffset.x, width);
    if (i !== index) setIndex(i);
  };

  // No server pre-check here: registration reports connection errors on submit,
  // so a slow or sleeping server never blocks a new user at the first tap.
  // 2026-11-25 (panel revision): "Is HeartLink for you?" comes before the sign-up form
  const handleGetStarted = () => {
    router.push("/who-its-for");
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <StatusBar style={slide.image || !isDark ? "dark" : "light"} />

      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        onMomentumScrollEnd={onSwipeEnd}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {INTRO_SLIDES.map((s, i) => (
          <View
            key={s.key}
            style={{ width, flex: 1 }}
            accessible
            accessibilityLabel={`${s.title}. ${s.text} Slide ${i + 1} of ${INTRO_SLIDES.length}.`}
          >
            <SlideArt slide={s} compact={compact} topPad={insets.top + TOP_BAR} />
            <View
              style={{
                backgroundColor: c.canvas,
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                marginTop: -28,
                paddingTop: compact ? 22 : 28,
                paddingHorizontal: 28,
                alignItems: "center",
              }}
            >
              <Text
                accessibilityRole="header"
                style={{
                  fontSize: compact ? 24 : 27,
                  lineHeight: compact ? 30 : 34,
                  fontWeight: "700",
                  letterSpacing: -0.6,
                  color: c.ink,
                  textAlign: "center",
                }}
              >
                {s.title}
              </Text>
              <Text
                style={{
                  fontSize: 15.5,
                  lineHeight: 23,
                  color: c.slate,
                  textAlign: "center",
                  marginTop: 8,
                  maxWidth: 320,
                  minHeight: 46,
                }}
              >
                {s.text}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Log in, on every slide. It floats over the pictures, so its background slides with them */}
      <View
        className="flex-row items-center justify-between px-5"
        style={{ position: "absolute", top: insets.top, left: 0, right: 0, height: TOP_BAR }}
      >
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <HeartLogo size={24} />
          <Text style={{ fontSize: 17, fontWeight: "700", letterSpacing: -0.3, color: barInk }}>HeartLink</Text>
        </View>
        <AnimatedButton
          onPress={() => router.push("/login")}
          accessibilityRole="button"
          accessibilityLabel="Log in"
          accessibilityHint="Opens the login screen"
          style={{ minHeight: 44, minWidth: 64, justifyContent: "center", alignItems: "flex-end" }}
        >
          <Text style={{ fontSize: 15, fontWeight: "600", color: barInk }}>Log in</Text>
        </AnimatedButton>
      </View>

      {/* ── Dots and buttons ── */}
      <SafeAreaView edges={["bottom"]} style={{ backgroundColor: c.canvas }}>
        <View style={{ paddingHorizontal: 24, paddingTop: compact ? 14 : 18, paddingBottom: compact ? 10 : 16, gap: 12 }}>
          <View
            className="flex-row justify-center"
            style={{ gap: 6 }}
            accessibilityLabel={`Slide ${index + 1} of ${INTRO_SLIDES.length}`}
          >
            {INTRO_SLIDES.map((s, i) => (
              <AnimatedButton
                key={s.key}
                onPress={() => goTo(i)}
                accessibilityRole="button"
                accessibilityLabel={`Go to slide ${i + 1}`}
                style={{ paddingVertical: 8 }}
              >
                <View
                  style={{
                    width: i === index ? 22 : 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: i === index ? c.primary : c.hairline,
                  }}
                />
              </AnimatedButton>
            ))}
          </View>

          {mode === "continue" ? (
            <DsButton label="Continue" onPress={() => goTo(1)} icon={<Feather name="arrow-right" size={16} color="#FFFFFF" />} />
          ) : mode === "skip-next" ? (
            <View className="flex-row" style={{ gap: 10 }}>
              <View style={{ flex: 1 }}>
                <DsButton label="Skip" variant="secondary" block onPress={() => goTo(last)} accessibilityHint="Goes to the last slide" />
              </View>
              <View style={{ flex: 1 }}>
                <DsButton label="Next" block onPress={() => goTo(index + 1)} />
              </View>
            </View>
          ) : (
            <>
              <DsButton
                label="Get started"
                onPress={handleGetStarted}
                icon={<Feather name="arrow-right" size={16} color="#FFFFFF" />}
                accessibilityHint="Shows who HeartLink is for, then the sign-up form"
              />
              <DsButton
                label="Who is HeartLink for?"
                variant="link"
                onPress={() => router.push("/who-its-for?from=welcome")}
                accessibilityHint="Shows who HeartLink is for and the conditions it isn't made for"
              />
            </>
          )}

          <Text style={{ fontSize: 12, lineHeight: 17, color: c.steel, textAlign: "center" }}>
            For tracking and prevention. Not a diagnosis.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
