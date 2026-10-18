import React from "react";
import { useRouter } from "expo-router";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { useUser } from "../../contexts/UserContext";

// Set-up has to be finished before the rest of the app opens, so "Finish later" means
// "stop for now": answers are already saved on the phone and come back on next log-in.
export default function FinishLaterDialog({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const { logout } = useUser();

  return (
    <ConfirmDialog
      visible={visible}
      onCancel={onClose}
      onConfirm={async () => {
        onClose();
        await logout();
        router.replace("/(auth)/login");
      }}
      title="Finish later?"
      message="Your answers so far are saved on this phone. You can close the app now and pick up here next time you log in."
      confirmLabel="Log out for now"
      cancelLabel="Keep going"
      variant="info"
      icon="bookmark"
    />
  );
}
