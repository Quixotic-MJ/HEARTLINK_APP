import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * HL-083: keyboard use of a dialog or slide-in menu while `active`:
 * - focus moves into `ref` (its first button or link) when it opens;
 * - Tab and Shift+Tab stay inside it;
 * - Escape calls `onClose` (pass null while closing isn't allowed, e.g. during sign-out);
 * - focus goes back to whatever opened it when it closes.
 */
export function useDialogFocus(active, ref, onClose) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!active) return undefined;
    const opener = document.activeElement;
    const box = ref.current;
    const items = () => (box ? [...box.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement) : []);
    (items()[0] || box)?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape" && onCloseRef.current) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !box) return;
      const list = items();
      if (!list.length) {
        event.preventDefault();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      if (event.shiftKey && (document.activeElement === first || !box.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !box.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (opener && typeof opener.focus === "function" && document.contains(opener)) opener.focus();
    };
  }, [active, ref]);
}
