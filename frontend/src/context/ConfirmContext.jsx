import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import "./ConfirmModal.css";

const ConfirmContext = createContext(null);

const DEFAULTS = {
  confirmLabel: "Rendben",
  cancelLabel: "Mégse",
  danger: false,
};

export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null);
  const resolverRef = useRef(null);
  const openerRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const cancelButtonRef = useRef(null);

  const confirm = useCallback(
    (message, options) =>
      new Promise((resolve) => {
        resolverRef.current = resolve;
        openerRef.current =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        setRequest({ ...DEFAULTS, ...options, message });
      }),
    [],
  );

  useEffect(() => {
    if (request) confirmButtonRef.current?.focus();
  }, [request]);

  const settle = (result) => {
    setRequest(null);
    const resolve = resolverRef.current;
    resolverRef.current = null;
    const opener = openerRef.current;
    openerRef.current = null;
    resolve?.(result);
    opener?.focus();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      settle(false);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      settle(event.target !== cancelButtonRef.current);
      return;
    }

    if (event.key !== "Tab") return;

    const first = cancelButtonRef.current;
    const last = confirmButtonRef.current;
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request !== null && (
        <div className="confirm-overlay" onClick={() => settle(false)}>
          <div
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-message"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
          >
            <p className="confirm-message" id="confirm-message">
              {request.message}
            </p>
            <div className="confirm-actions">
              <button
                ref={cancelButtonRef}
                type="button"
                className="btn-pill btn-outline"
                onClick={() => settle(false)}
              >
                {request.cancelLabel}
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                className={`btn-pill btn-solid confirm-accept${
                  request.danger ? " is-danger" : ""
                }`}
                onClick={() => settle(true)}
              >
                {request.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return ctx;
}
