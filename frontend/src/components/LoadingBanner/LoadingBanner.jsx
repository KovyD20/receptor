import { useEffect, useState } from "react";
import Icon from "../Icon/Icon";
import "./LoadingBanner.css";

const SLOW_AFTER_MS = 5000;

function LoadingRow() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="loading-banner" role="status" aria-live="polite">
      <span className="loading-banner-spinner" aria-hidden="true" />
      <span className="loading-banner-text">
        {slow
          ? "A szerver épp felébred, ez akár egy percig is tarthat…"
          : "Adatok betöltése…"}
      </span>
    </div>
  );
}

export default function LoadingBanner({ loading, error, onRetry }) {
  if (error) {
    return (
      <div className="loading-banner is-error" role="alert">
        <Icon name="xmark" size={13} />
        <span className="loading-banner-text">
          Nem sikerült még betölteni az adatokat. Várj egy kicsit és próbáld újra, vagy frissítsd az oldalt.
        </span>
        {onRetry && (
          <button
            type="button"
            className="btn-pill btn-outline btn-outline-neutral loading-banner-retry"
            onClick={onRetry}
          >
            Újrapróbálom
          </button>
        )}
      </div>
    );
  }

  if (!loading) return null;

  return <LoadingRow />;
}
