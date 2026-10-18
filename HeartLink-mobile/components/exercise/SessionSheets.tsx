import React from "react";
import DsButton from "../onboarding/DsButton";
import { SheetModal, SheetOption } from "./ExerciseBits";
import { formatDuration } from "../../services/exerciseSession";

// The questions a guided exercise asks: why you're stopping, how you feel after, and
// whether to keep a very short session.

/** Opened by the X button (or the phone's back button) during an exercise. The timer is paused. */
export function StopSheet({
  visible,
  seconds,
  onUnwell,
  onTired,
  onKeepGoing,
}: {
  visible: boolean;
  seconds: number;
  onUnwell: () => void;
  onTired: () => void;
  onKeepGoing: () => void;
}) {
  return (
    <SheetModal visible={visible} onRequestClose={onKeepGoing} title="Stop this exercise?" body={`The timer is paused. You did ${formatDuration(seconds)}.`}>
      <SheetOption tone="rose" title="I don't feel well" hint="Saves what you did and opens the symptom log" onPress={onUnwell} />
      <SheetOption title="I'm tired, save what I did" hint={`Saved as ${formatDuration(seconds)} of exercise`} onPress={onTired} />
      <DsButton label="Keep going" variant="quiet" onPress={onKeepGoing} />
    </SheetModal>
  );
}

/** After Finish, before anything is saved. */
export function CheckInSheet({ visible, onFine, onUnwell, onBack }: { visible: boolean; onFine: () => void; onUnwell: () => void; onBack: () => void }) {
  return (
    <SheetModal visible={visible} onRequestClose={onBack} title="How do you feel now?" body="This helps HeartLink spot exercise that doesn't suit you.">
      <DsButton label="I feel fine" onPress={onFine} />
      <SheetOption tone="rose" title="I had chest pain, dizziness or trouble breathing" onPress={onUnwell} />
    </SheetModal>
  );
}

/** Finished in under 30 seconds: keep it or leave it out. */
export function ShortSessionSheet({
  visible,
  seconds,
  onSave,
  onDiscard,
  onKeepGoing,
}: {
  visible: boolean;
  seconds: number;
  onSave: () => void;
  onDiscard: () => void;
  onKeepGoing: () => void;
}) {
  return (
    <SheetModal visible={visible} onRequestClose={onKeepGoing} title="Save a short session?" body={`This session was only ${formatDuration(seconds)}.`}>
      <SheetOption title="Save it" hint="It shows in your activity history" onPress={onSave} />
      <SheetOption title="Don't save it" hint="Nothing is recorded" onPress={onDiscard} />
      <DsButton label="Keep going" variant="quiet" onPress={onKeepGoing} />
    </SheetModal>
  );
}
