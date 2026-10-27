import React from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useDs } from "../../components/onboarding/useDs";
import DsButton from "../../components/onboarding/DsButton";
import { DsScreen, InfoNote } from "../../components/onboarding/QuestionLayout";
import { SquareIconButton } from "../../components/exercise/ExerciseBits";
import { Skeleton } from "../../components/ui/Skeleton";
import { Card, PageHeader, PersonRow } from "../../components/family/FamilyBits";
import { useUser } from "../../contexts/UserContext";
import { useToast } from "../../contexts/ToastContext";
import { useFollowing, useSetAccountKind } from "../../hooks/useFamily";
import { agoLine, isFamilyAccount } from "../../services/family";

// HL-087: the people you follow. For a family-only account this is the home screen, with Notifications and Settings
// in the header and a way to start tracking your own health too.

export default function FamilyHomeScreen() {
  const { c } = useDs();
  const router = useRouter();
  const { user } = useUser();
  const { showToast } = useToast();
  const following = useFollowing();
  const setKind = useSetAccountKind();
  const familyOnly = isFamilyAccount(user);

  const trackOwn = () =>
    setKind.mutate("patient", {
      onError: (e) => showToast({ title: "Couldn't switch", message: e.message, type: "error" }),
    });

  const header = (
    <PageHeader
      title={familyOnly ? "Family" : "People you follow"}
      onBack={familyOnly ? undefined : () => router.back()}
      right={
        familyOnly ? (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <SquareIconButton icon="bell" label="Notifications" onPress={() => router.push("/(home)/(profile)/notifications")} />
            <SquareIconButton icon="settings" label="Settings" onPress={() => router.push("/(home)/(settings)/settings")} />
          </View>
        ) : undefined
      }
    />
  );

  const footer = (
    <>
      <DsButton label="Follow someone" onPress={() => router.push("/(family)/follow")} />
      {familyOnly ? <DsButton label="Track my own health too" variant="link" onPress={trackOwn} loading={setKind.isPending} /> : null}
    </>
  );

  return (
    <DsScreen header={header} footer={footer}>
      {familyOnly ? (
        <Text style={{ fontSize: 15, lineHeight: 23, color: c.slate, marginBottom: 18 }}>
          See how the people you follow are doing. You&apos;ll get a notification if one of them logs a reading at an
          emergency level.
        </Text>
      ) : null}

      {following.isPending ? (
        <Skeleton style={{ height: 140, borderRadius: 12 }} />
      ) : following.isError || !following.data ? (
        <View style={{ gap: 12 }}>
          <InfoNote icon="wifi-off" title="This couldn't load" text="Check your connection, then try again." />
          <DsButton label="Try again" variant="secondary" onPress={() => following.refetch()} block />
        </View>
      ) : following.data.length ? (
        <Card>
          {following.data.map((p, i) => (
            <PersonRow
              key={p.id}
              name={p.name}
              note={p.paused ? "Sharing is paused" : `Following since ${agoLine(p.since).toLowerCase()}`}
              onPress={() => router.push({ pathname: "/(family)/[patientId]", params: { patientId: p.id } })}
              last={i === following.data.length - 1}
            />
          ))}
        </Card>
      ) : (
        <InfoNote
          icon="users"
          title="You don't follow anyone yet"
          text="Ask your family member to open HeartLink, go to Settings › Family sharing and send you a code. Then tap Follow someone."
        />
      )}
    </DsScreen>
  );
}
