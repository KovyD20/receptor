import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createCatalog } from "../constants/pantryCatalog";
import { apiUrl } from "../lib/api";

const CatalogContext = createContext(null);

const CACHE_KEY = "smartkitchen.pantryCatalog.v1";

function readCachedCatalog() {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.categories) ? parsed : null;
  } catch {
    return null;
  }
}

function writeCachedCatalog(json) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(json));
  } catch {
    // A full or blocked store only costs the next visit its head start.
  }
}

export function CatalogProvider({ children }) {
  const [cached] = useState(readCachedCatalog);
  const [data, setData] = useState(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  const hasCatalog = useRef(Boolean(cached));

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      if (!hasCatalog.current) setLoading(true);
      try {
        const res = await fetch(apiUrl("/api/pantry/catalog"));
        if (!res.ok) throw new Error(`Catalog fetch failed (${res.status})`);
        const json = await res.json();
        writeCachedCatalog(json);
        if (cancelled) return;
        hasCatalog.current = true;
        setData(json);
      } catch (err) {
        if (!cancelled && !hasCatalog.current) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const value = useMemo(() => {
    const catalog = createCatalog(data || { categories: [] });
    return { ...catalog, ready: Boolean(data), loading, error, reload };
  }, [data, loading, error, reload]);

  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  );
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) {
    throw new Error("useCatalog must be used within a CatalogProvider");
  }
  return ctx;
}
