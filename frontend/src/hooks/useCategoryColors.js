import { useCallback, useEffect, useState } from "react";
import { doc, onSnapshot, setDoc, deleteField } from "firebase/firestore";
import { db } from "../firebase";
import { categoryAccent } from "../constants/categoryColors";

const SETTINGS_DOC = ["settings", "preferences"];

export function useCategoryColors(uid) {
  const [remote, setRemote] = useState(null);
  const [pending, setPending] = useState({});

  useEffect(() => {
    if (!uid) return;

    const ref = doc(db, "users", uid, ...SETTINGS_DOC);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const next = snap.data()?.categoryColors || {};
        setRemote(next);
        setPending((prev) => {
          const unconfirmed = {};
          for (const [category, value] of Object.entries(prev)) {
            const settled =
              value === null
                ? next[category] === undefined
                : next[category] === value;
            if (!settled) unconfirmed[category] = value;
          }
          return unconfirmed;
        });
      },
      (err) => {
        console.error("Hiba a kategória-színek olvasásakor", err);
        setRemote({});
      },
    );

    return () => unsub();
  }, [uid]);

  const colorFor = useCallback(
    (category) => {
      const overridden = Object.prototype.hasOwnProperty.call(pending, category)
        ? pending[category]
        : remote?.[category];
      return overridden || categoryAccent(category);
    },
    [pending, remote],
  );

  const isCustom = useCallback(
    (category) => {
      const overridden = Object.prototype.hasOwnProperty.call(pending, category)
        ? pending[category]
        : remote?.[category];
      return Boolean(overridden);
    },
    [pending, remote],
  );

  const write = useCallback(
    (category, value) => {
      if (!uid || !category) return Promise.resolve();
      setPending((prev) => ({ ...prev, [category]: value }));
      return setDoc(
        doc(db, "users", uid, ...SETTINGS_DOC),
        { categoryColors: { [category]: value === null ? deleteField() : value } },
        { merge: true },
      );
    },
    [uid],
  );

  const setColor = useCallback(
    (category, color) => write(category, color),
    [write],
  );

  const resetColor = useCallback((category) => write(category, null), [write]);

  const resetAll = useCallback(() => {
    if (!uid) return Promise.resolve();
    const categories = Object.keys({ ...remote, ...pending });
    setPending(
      categories.reduce((acc, category) => ({ ...acc, [category]: null }), {}),
    );
    return setDoc(
      doc(db, "users", uid, ...SETTINGS_DOC),
      { categoryColors: deleteField() },
      { merge: true },
    );
  }, [uid, remote, pending]);

  return { colorFor, isCustom, setColor, resetColor, resetAll };
}
