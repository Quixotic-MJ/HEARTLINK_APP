import React, { useState } from "react";
import { Share, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useDs } from "../../../components/onboarding/useDs";
import DsButton from "../../../components/onboarding/DsButton";
import { DsScreen, IconBadge, InfoNote, Tag } from "../../../components/onboarding/QuestionLayout";
import { Skeleton } from "../../../components/ui/Skeleton";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { Card, PageHeader, PersonRow } from "../../../components/family/FamilyBits";
import { useToast } from "../../../contexts/ToastContext";
import { useCreateInvite, useRemoveFollower, useSharing } from "../../../hooks/useFamily";
import { Follower, agoLine, expiresLine, inviteMessage, showCode } from "../../../services/family";

// HL-087: the patient's side of family sharing (Premium). Make a one-time code to send, see who follows you, remove
// them. Followers see a read-only summary and are told about an emergency-level reading.

export default function FamilySharingScreen() {
  const { c } = useDs();
  const router = useRouter();
  const { showToast } = useToast();
  const sharing = useSharing();
  const createInvite = useCreateInvite();
  const removeFollower = useRemoveFollower();
  const [removing, setRemoving] = useState<Follower | null>(null);

  const status = sharing.data;
  const full = !!status && status.followers.length >= status.max_followers;

  const create = () => {
    Haptics.selectionAsync();
    createInvite.mutate(undefined, {
      onError: (e) => showToast({ title: "Couldn't make a code", message: e.message, type: "error" }),
    });
  };

  const share = async (code: string) => {
    try {
      await Share.share({ message: inviteMessage(code) });
    } catch {
      showToast({ title: "Couldn't open sharing", message: "Read the code out instead.", type: "error" });
    }
  };

  const confirmRemove = async () => {
    if (!removing) return;
    const who = removing;
    setRemoving(null);
    removeFollower.mutate(who.id, {
      onSuccess: () => showToast({ title: `${who.name} removed`, message: "They can't see your readings any more.", type: "success" }),
      onError: (e) => showToast({ title: "Couldn't remove them", message: e.message, type: "error" }),
    });
  };

  return (
    <DsScreen header={<PageHeader title="Family sharing" onBack={() => router.back()} />}>
      <Text style={{ fontSize: 15, lineHeight: 23, color: c.slate }}>
        Let someone you trust follow your readings in the HeartLink app. They see your latest blood pressure, pulse
        and score, and your 30-day charts, and get a notification if you log a reading at an emergency level. They
        can&apos;t change anything.
      </Text>

      {sharing.isPending ? (
        <View style={{ marginTop: 22, gap: 12 }}>
          <Skeleton style={{ height: 150, borderRadius: 12 }} />
          <Skeleton style={{ height: 120, borderRadius: 12 }} />
        </View>
      ) : sharing.isError || !status ? (
        <View style={{ marginTop: 22, gap: 12 }}>
          <InfoNote icon="wifi-off" title="Family sharing couldn't load" text="Check your connection, then try again." />
          <DsButton label="Try again" variant="secondary" onPress={() => sharing.refetch()} block />
        </View>
      ) : (
        <>
          {!status.is_premium ? (
            <View style={{ marginTop: 22, padding: 18, borderRadius: 12, backgroundColor: c.surface, gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <IconBadge icon="account-heart-outline" tint="peach" size={40} />
                <View style={{ flex: 1 }}>
                  <Tag label="Premium" tone="warm" />
                  <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink, marginTop: 6 }}>Family sharing</Text>
                </View>
              </View>
              <Text style={{ fontSize: 14, lineHeight: 21, color: c.slate }}>
                {status.followers.length
                  ? "Sharing is paused while you're not on Premium. Your followers are kept and see it again when you renew."
                  : "Sharing is part of HeartLink Premium. The people who follow you don't need Premium."}
              </Text>
              <DsButton label="See HeartLink Premium" onPress={() => router.push("/(home)/(settings)/premium")} />
            </View>
          ) : full ? (
            <View style={{ marginTop: 22 }}>
              <InfoNote
                icon="users"
                text={`You share with ${status.max_followers} people, the most allowed. Remove someone to invite another.`}
              />
            </View>
          ) : status.invite ? (
            <View style={{ marginTop: 22, padding: 18, borderRadius: 12, backgroundColor: c.sky, gap: 10, alignItems: "center" }}>
              <Text style={{ fontSize: 14, color: c.charcoal }}>Your invite code</Text>
              <Text
                accessibilityLabel={`Invite code ${status.invite.code.split("").join(" ")}`}
                selectable
                style={{ fontSize: 36, fontWeight: "700", letterSpacing: 4, color: c.ink, fontVariant: ["tabular-nums"] }}
              >
                {showCode(status.invite.code)}
              </Text>
              <Text style={{ fontSize: 13, color: c.charcoal, textAlign: "center" }}>
                {`${expiresLine(status.invite.expires_at)}. It works once.`}
              </Text>
              <View style={{ alignSelf: "stretch", gap: 4, marginTop: 4 }}>
                <DsButton label="Share code" onPress={() => share(status.invite!.code)} />
                <DsButton label="Make a new code" variant="link" onPress={create} loading={createInvite.isPending} />
              </View>
            </View>
          ) : (
            <View style={{ marginTop: 22, gap: 10 }}>
              <InfoNote
                icon="key"
                text="Make a code and send it to a family member. They enter it in their HeartLink app under Follow a family member. It works once, for 24 hours."
              />
              <DsButton label="Create an invite code" onPress={create} loading={createInvite.isPending} />
            </View>
          )}

          <Text accessibilityRole="header" style={{ marginTop: 28, marginBottom: 10, fontSize: 18, fontWeight: "600", color: c.ink }}>
            People who follow you
          </Text>
          {status.followers.length ? (
            <Card>
              {status.followers.map((f, i) => (
                <PersonRow
                  key={f.id}
                  name={f.name}
                  note={`Following since ${agoLine(f.since).toLowerCase()}`}
                  action="Remove"
                  onAction={() => setRemoving(f)}
                  last={i === status.followers.length - 1}
                />
              ))}
            </Card>
          ) : (
            <Text style={{ fontSize: 15, lineHeight: 22, color: c.slate }}>Nobody follows you yet.</Text>
          )}

          <View style={{ marginTop: 22 }}>
            <InfoNote
              text="If you log a reading at an emergency level, HeartLink shows you what to do first, as always. Your followers are told after your reading is saved."
            />
          </View>
        </>
      )}

      <ConfirmDialog
        visible={!!removing}
        onCancel={() => setRemoving(null)}
        onConfirm={confirmRemove}
        title={`Remove ${removing?.name ?? ""}?`}
        message="They stop seeing your readings straight away and won't get alerts. You can invite them again later."
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="destructive"
        mode="bottom-sheet"
        icon="user-x"
      />
    </DsScreen>
  );
}
