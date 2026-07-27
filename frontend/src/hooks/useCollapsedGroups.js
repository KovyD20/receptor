import { useState } from "react";

export function useCollapsedGroups() {
  const [closed, setClosed] = useState(() => new Set());

  const toggle = (key) =>
    setClosed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return { isOpen: (key) => !closed.has(key), toggle };
}
