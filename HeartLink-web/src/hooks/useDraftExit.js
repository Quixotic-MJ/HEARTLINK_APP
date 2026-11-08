import { useEffect, useRef, useState } from "react";
import { useBlocker } from "react-router-dom";

// shortcut: drafts stay in memory; crash recovery needs an approved draft-storage contract.
export function useDraftExit(isOpen, dirty, onClose, dialogRef, busy) {
  const [closeRequested, setCloseRequested] = useState(false);
  const [shownOpen, setShownOpen] = useState(isOpen);
  const returnFocus = useRef(null);
  const blocker = useBlocker(() => {
    if (!isOpen || (!dirty && !busy)) return false;
    returnFocus.current = { id: document.activeElement?.id || "" };
    return true;
  });
  const discarding = closeRequested || (!busy && blocker.state === "blocked");
  if (shownOpen !== isOpen) {
    setShownOpen(isOpen);
    setCloseRequested(false);
  }

  useEffect(() => {
    if (!discarding && returnFocus.current) {
      const field = document.getElementById(returnFocus.current.id);
      (
        field || dialogRef.current?.querySelector('[aria-label="Close"]')
      )?.focus();
      returnFocus.current = null;
    }
  }, [discarding, dialogRef]);

  useEffect(() => {
    if (busy && blocker.state === "blocked") blocker.reset();
  }, [busy, blocker]);

  useEffect(() => {
    if (!isOpen || (!dirty && !busy)) return;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isOpen, dirty, busy]);

  const keepEditing = () => {
    setCloseRequested(false);
    if (blocker.state === "blocked") blocker.reset();
  };

  return {
    discarding,
    keepEditing,
    confirmDiscard: () => {
      if (busy) return;
      onClose();
      if (blocker.state === "blocked") blocker.proceed();
    },
    requestClose: () => {
      if (busy) return;
      if (discarding) keepEditing();
      else if (dirty) {
        returnFocus.current = { id: document.activeElement?.id || "" };
        setCloseRequested(true);
      } else onClose();
    },
  };
}
