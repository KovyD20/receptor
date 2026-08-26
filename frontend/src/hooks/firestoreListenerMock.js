import { vi } from "vitest";

export const listeners = [];

export function resetListeners() {
  listeners.length = 0;
}

export const firestoreMock = {
  collection: (_db, ...segments) => ({ path: segments.join("/") }),
  query: (ref) => ref,
  orderBy: (field) => ({ orderBy: field }),
  onSnapshot: (ref, onNext, onError) => {
    const entry = { path: ref.path, onNext, onError, active: true };
    listeners.push(entry);
    return () => {
      entry.active = false;
    };
  },
  doc: (_db, ...segments) => ({ path: segments.join("/") }),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  writeBatch: vi.fn(() => ({ update: vi.fn(), commit: vi.fn() })),
};

function find(path) {
  const entry = [...listeners].reverse().find((l) => l.active && l.path === path);
  if (!entry) {
    throw new Error(
      `No active listener for "${path}". Registered: ${listeners
        .map((l) => `${l.path}${l.active ? "" : " (torn down)"}`)
        .join(", ") || "(none)"}`,
    );
  }
  return entry;
}

export function emitSnapshot(path, docs = []) {
  find(path).onNext({
    docs: docs.map(({ id, ...data }) => ({ id, data: () => data })),
  });
}

export function emitError(path, err = new Error("permission-denied")) {
  find(path).onError(err);
}
