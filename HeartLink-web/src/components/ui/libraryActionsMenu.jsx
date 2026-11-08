import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";

export function LibraryActionsMenu({ name, actions, disabled = false }) {
  const [position, setPosition] = useState(null);
  const trigger = useRef(null);
  const menu = useRef(null);
  const anchor = useRef(null);
  const id = useId();
  const focusLast = useRef(false);

  useEffect(() => {
    if (!position) return;
    menu.current
      ?.querySelector(focusLast.current ? "button:last-child" : "button")
      ?.focus();
    const outside = (event) => {
      if (
        !menu.current?.contains(event.target) &&
        !trigger.current?.contains(event.target)
      )
        setPosition(null);
    };
    const close = () => {
      const bounds = trigger.current?.getBoundingClientRect();
      const previous = anchor.current;
      if (
        !bounds ||
        bounds.top !== previous.top ||
        bounds.left !== previous.left ||
        window.innerWidth !== previous.width ||
        window.innerHeight !== previous.height
      )
        setPosition(null);
    };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [position]);

  const open = () => {
    if (position) return setPosition(null);
    const bounds = trigger.current.getBoundingClientRect();
    anchor.current = {
      top: bounds.top,
      left: bounds.left,
      width: window.innerWidth,
      height: window.innerHeight,
    };
    const height = actions.length * 42 + 12;
    setPosition({
      left: Math.max(8, Math.min(bounds.right - 200, window.innerWidth - 208)),
      top:
        bounds.bottom + height + 6 > window.innerHeight
          ? Math.max(8, bounds.top - height - 6)
          : bounds.bottom + 6,
    });
  };

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="library-actions-trigger"
        disabled={disabled}
        aria-label={`Actions for ${name}`}
        aria-haspopup="menu"
        aria-controls={position ? id : undefined}
        aria-expanded={!!position}
        aria-busy={disabled}
        onClick={() => {
          focusLast.current = false;
          open();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            focusLast.current = event.key === "ArrowUp";
            open();
          }
        }}
      >
        <MoreVertical size={18} aria-hidden="true" />
      </button>
      {position &&
        createPortal(
          <div
            ref={menu}
            id={id}
            role="menu"
            aria-label={`Actions for ${name}`}
            className="library-actions-menu font-cal-sans"
            style={position}
            onKeyDown={(event) => {
              const items = [
                ...menu.current.querySelectorAll("button:not(:disabled)"),
              ];
              const index = items.indexOf(document.activeElement);
              const next = {
                ArrowDown: (index + 1) % items.length,
                ArrowUp: (index - 1 + items.length) % items.length,
                Home: 0,
                End: items.length - 1,
              }[event.key];
              if (next !== undefined) {
                event.preventDefault();
                items[next]?.focus();
              }
              if (event.key === "Escape" || event.key === "Tab") {
                if (event.key === "Escape") event.preventDefault();
                trigger.current?.focus();
                setPosition(null);
              }
            }}
          >
            {actions.map(({ label, icon: Icon, onSelect }) => (
              <button
                key={label}
                role="menuitem"
                type="button"
                tabIndex={-1}
                disabled={disabled}
                onClick={() => {
                  trigger.current?.focus();
                  setPosition(null);
                  onSelect();
                }}
              >
                <Icon size={15} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
