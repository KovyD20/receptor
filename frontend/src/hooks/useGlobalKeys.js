import { useEffect, useRef } from "react";
import { isPlainKey, isTypingTarget } from "../lib/keyboard";

export function useGlobalKeys({
  tabIds,
  onSelectTab,
  onFocusSearch,
  onToggleHelp,
  onEscape,
  enabled = true,
}) {
  const handlers = useRef({});
  useEffect(() => {
    handlers.current = { tabIds, onSelectTab, onFocusSearch, onToggleHelp, onEscape };
  });

  useEffect(() => {
    if (!enabled) return undefined;

    const onKeyDown = (event) => {
      const {
        tabIds: ids,
        onSelectTab: selectTab,
        onFocusSearch: focusSearch,
        onToggleHelp: toggleHelp,
        onEscape: escape,
      } = handlers.current;

      if (event.defaultPrevented) return;

      if (event.key === "Escape") {
        if (!escape?.()) return;
        event.preventDefault();
        return;
      }

      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        const match = /^Digit([1-9])$/.exec(event.code || "");
        const index = match ? Number(match[1]) - 1 : -1;
        if (index >= 0 && index < (ids?.length || 0)) {
          event.preventDefault();
          selectTab?.(ids[index]);
        }
        return;
      }

      if (isTypingTarget(event)) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        focusSearch?.();
        return;
      }

      if (!isPlainKey(event)) return;

      if (event.key === "/") {
        event.preventDefault();
        focusSearch?.();
        return;
      }

      if (event.key === "?") {
        event.preventDefault();
        toggleHelp?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
