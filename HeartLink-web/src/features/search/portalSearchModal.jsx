import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, Search, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  portalNavigationFor,
  portalSearchTargetsFor,
} from "../../app/portalNavigation.js";
import { useDialogFocus } from "../../hooks/useDialogFocus.js";

export default function PortalSearchModal({ user, onClose }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const dialog = useRef(null);
  const list = useRef(null);
  const id = useId();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useDialogFocus(true, dialog, onClose);
  const trimmed = query.trim();
  const pages = portalNavigationFor(user).filter((page) =>
    `${page.label} ${page.section} ${page.path}`
      .toLowerCase()
      .includes(trimmed.toLowerCase()),
  );
  const targets = trimmed ? portalSearchTargetsFor(user, pathname) : [];
  const results = [
    ...pages.map((page) => ({ ...page, text: page.label, group: "Pages" })),
    ...targets.map((page) => ({
      ...page,
      path: `${page.path}?search=${encodeURIComponent(trimmed)}`,
      text: `Search ${page.searchLabel} for "${trimmed}"`,
      group: "Search in",
    })),
  ];
  const index = Math.min(selected, Math.max(results.length - 1, 0));
  useEffect(() => {
    list.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [index, query]);
  const choose = (item) => {
    if (item) {
      onClose();
      navigate(item.path);
    }
  };

  return createPortal(
    <div className="portal-search-overlay font-cal-sans">
      <div className="portal-search-backdrop" onClick={onClose} />
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Search portal"
        tabIndex={-1}
        className="portal-search-dialog"
      >
        <div className="portal-search-input">
          <Search size={19} aria-hidden="true" />
          <input
            role="combobox"
            aria-label="Search pages and permitted records"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls={id}
            aria-activedescendant={
              results.length ? `${id}-${index}` : undefined
            }
            placeholder="Find a page or search a library…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelected(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                choose(results[index]);
              }
              if (
                results.length &&
                (event.key === "ArrowDown" || event.key === "ArrowUp")
              ) {
                event.preventDefault();
                setSelected(
                  (index +
                    (event.key === "ArrowDown" ? 1 : -1) +
                    results.length) %
                    results.length,
                );
              }
            }}
          />
          <button type="button" aria-label="Close search" onClick={onClose}>
            <X size={17} aria-hidden="true" />
          </button>
        </div>
        <div
          ref={list}
          id={id}
          role="listbox"
          aria-label="Pages and record-search shortcuts"
          className="portal-search-results"
        >
          {results.map((item, itemIndex) => {
            const Icon = item.icon;
            return (
              <div key={item.path} role="presentation">
                {(itemIndex === 0 ||
                  results[itemIndex - 1].group !== item.group) && (
                  <p className="portal-search-group" aria-hidden="true">
                    {item.group}
                  </p>
                )}
                <button
                  id={`${id}-${itemIndex}`}
                  role="option"
                  aria-selected={index === itemIndex}
                  tabIndex={-1}
                  type="button"
                  onMouseMove={() => setSelected(itemIndex)}
                  onClick={() => choose(item)}
                >
                  <Icon size={17} aria-hidden="true" />
                  <span>{item.text}</span>
                  {item.group === "Pages" ? (
                    <small>{item.section}</small>
                  ) : (
                    <ArrowUpRight size={15} aria-hidden="true" />
                  )}
                </button>
              </div>
            );
          })}
          {!results.length && (
            <div className="portal-search-empty">
              No matching pages. Try Settings or Notifications.
            </div>
          )}
        </div>
        <p className="portal-search-help">
          Jump to a page, or choose a library to filter its records.
        </p>
      </div>
    </div>,
    document.body,
  );
}
