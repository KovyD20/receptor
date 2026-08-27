import { useCallback, useState } from "react";

export function useCollapsedGroups() {
  const [closed, setClosed] = useState(() => new Set());

  const toggle = useCallback(
    (key) =>
      setClosed((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      }),
    [],
  );

  const openAll = useCallback(() => setClosed(new Set()), []);

  const closeAll = useCallback((keys) => setClosed(new Set(keys)), []);

  const isOpen = useCallback((key) => !closed.has(key), [closed]);

  const anyClosed = useCallback(
    (keys) => (keys || []).some((key) => closed.has(key)),
    [closed],
  );

  return { isOpen, toggle, openAll, closeAll, anyClosed };
}
