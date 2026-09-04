import { useCallback, useEffect } from "react";
import { isPlainKey, isTypingTarget } from "../lib/keyboard";
import { bestInDirection } from "../lib/spatialFocus";

const FOCUSABLE = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "[tabindex]",
  '[contenteditable="true"]',
].join(",");

const DIRECTIONS = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

function fieldArrowPolicy(element) {
  if (!isTypingTarget(element)) return "navigate";
  const tag = element.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return "native";
  if (tag === "INPUT") {
    const type = String(element.type || "text").toLowerCase();
    if (type === "number" || type === "range" || type === "date" || type === "time")
      return "native";
    return "vertical-only";
  }
  return "native";
}

function isVisible(element) {
  return element.checkVisibility ? element.checkVisibility() : true;
}

function isCandidate(element) {
  if (element.disabled) return false;
  if (element.tabIndex < 0) return false;
  if (element.hasAttribute("data-nav-skip")) return false;
  if (element.closest('[aria-hidden="true"]')) return false;
  if (element.closest("[hidden]")) return false;
  return isVisible(element);
}

function scopeElement() {
  const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
  return dialogs.length > 0 ? dialogs[dialogs.length - 1] : document.body;
}

export function useSpatialNav({ enabled = true, onFallback } = {}) {
  const candidates = useCallback(() => {
    const scope = scopeElement();
    return Array.from(scope.querySelectorAll(FOCUSABLE)).filter(isCandidate);
  }, []);

  const moveFocus = useCallback(
    (direction, fromElement) => {
      const list = candidates();
      if (list.length === 0) return false;

      const current =
        fromElement && list.includes(fromElement)
          ? fromElement
          : list.find((el) => el.contains(fromElement)) || null;

      if (!current) {
        const inside = fromElement && list.find((el) => fromElement.contains(el));
        const home = list.find((el) => el.hasAttribute("data-nav-home"));
        (inside || home || list[0]).focus();
        return true;
      }

      const next = bestInDirection(current, direction, list);
      if (!next) return false;
      next.focus();
      return true;
    },
    [candidates],
  );

  const exitField = useCallback(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || !isTypingTarget(active)) return false;
    if (!moveFocus("down", active)) {
      active.blur();
      onFallback?.();
    }
    return true;
  }, [moveFocus, onFallback]);

  useEffect(() => {
    if (!enabled) return undefined;

    const onKeyDown = (event) => {
      const direction = DIRECTIONS[event.key];
      if (!direction) return;
      if (event.defaultPrevented || !isPlainKey(event)) return;

      const active =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;

      if (active) {
        const policy = fieldArrowPolicy(active);
        if (policy === "native") return;
        if (policy === "vertical-only" && direction !== "up" && direction !== "down")
          return;
      }

      if (moveFocus(direction, active)) event.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, moveFocus]);

  return { moveFocus, exitField };
}
