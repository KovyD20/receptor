import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { isTypingTarget } from "../lib/keyboard";
import { bestInDirection } from "../lib/spatialFocus";

const ITEM_ATTR = "data-kbd-item";
const ITEM_SELECTOR = `[${ITEM_ATTR}]`;
const FALLBACK_SELECTOR = "[data-kbd-fallback]";

const DIRECTIONS = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

export function useListKeyboardNav({ layout = "list" } = {}) {
  const containerRef = useRef(null);
  const [activeKey, setActiveKey] = useState(null);
  const pendingRemovalRef = useRef(null);

  const listItems = useCallback(
    () => Array.from(containerRef.current?.querySelectorAll(ITEM_SELECTOR) || []),
    [],
  );

  const focusAt = useCallback((items, index, { clamp = false } = {}) => {
    if (items.length === 0) {
      const container = containerRef.current;
      const target = container?.querySelector(FALLBACK_SELECTOR) || container;
      target?.focus();
      return Boolean(target);
    }
    const bounded = clamp ? Math.max(0, Math.min(index, items.length - 1)) : index;
    const target = items[bounded];
    if (!target) return false;
    target.focus();
    return true;
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const items = listItems();
    const keys = items.map((el) => el.getAttribute(ITEM_ATTR));

    const pending = pendingRemovalRef.current;
    if (pending && !keys.includes(pending.key)) {
      pendingRemovalRef.current = null;
      focusAt(items, pending.index, { clamp: true });
      return;
    }

    if (activeKey !== null && !keys.includes(activeKey)) setActiveKey(null);
  });

  const onKeyDown = useCallback(
    (event) => {
      const direction = DIRECTIONS[event.key];
      if (!direction) return;
      if (layout === "list" && direction !== "up" && direction !== "down") return;
      if (event.defaultPrevented || isTypingTarget(event)) return;
      const current = event.target.closest?.(ITEM_SELECTOR);
      if (!current || !containerRef.current?.contains(current)) return;

      const items = listItems();
      const index = items.indexOf(current);
      if (index === -1) return;

      if (layout === "grid") {
        const next = bestInDirection(current, direction, items);
        if (!next) return;
        event.preventDefault();
        next.focus();
        return;
      }

      const moved = focusAt(items, index + (direction === "down" ? 1 : -1));
      if (moved) event.preventDefault();
    },
    [layout, listItems, focusAt],
  );

  const itemProps = (key, { first = false } = {}) => ({
    [ITEM_ATTR]: key,
    tabIndex: (activeKey === null ? first : activeKey === key) ? 0 : -1,
    onFocus: () => setActiveKey(key),
  });

  const markRemoval = useCallback(
    (key) => {
      const index = listItems().findIndex(
        (el) => el.getAttribute(ITEM_ATTR) === key,
      );
      pendingRemovalRef.current = index === -1 ? null : { key, index };
    },
    [listItems],
  );

  const clearRemoval = useCallback(() => {
    const pending = pendingRemovalRef.current;
    if (!pending) return;
    const stillThere = listItems().some(
      (el) => el.getAttribute(ITEM_ATTR) === pending.key,
    );
    if (stillThere) pendingRemovalRef.current = null;
  }, [listItems]);

  return { containerRef, onKeyDown, itemProps, markRemoval, clearRemoval };
}
