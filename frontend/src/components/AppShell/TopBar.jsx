import Icon from "../Icon/Icon";
import { SCREEN_TITLES, TABS } from "../../constants/tabs";

export default function TopBar({
  user,
  isMobile,
  tab,
  search,
  onSearchChange,
  searchOpen,
  onToggleSearch,
  searchInputRef,
  onOpenHelp,
  onSignOut,
  onSignOutWithConfirm,
  badgeFor,
  onSelectTab,
}) {
  return (
    <header className="topbar">
      <div className="topbar-main">
        <div className="brand">
          <div className="brand-mark">R</div>
          <div className="brand-name">
            {isMobile ? SCREEN_TITLES[tab] : "Recept Operációs Rendszer"}
          </div>
        </div>

        {isMobile ? (
          <>
            <div className="view-spacer" />
            <button
              type="button"
              className="icon-btn topbar-icon"
              aria-label="Keresés"
              aria-expanded={searchOpen}
              onClick={onToggleSearch}
            >
              <Icon name="search" size={14} />
            </button>
            <button
              type="button"
              className="topbar-avatar"
              title={`${user?.email || ""} — kijelentkezés`}
              aria-label="Kijelentkezés"
              onClick={onSignOutWithConfirm}
            >
              {(user?.email || "?").charAt(0).toUpperCase()}
            </button>
          </>
        ) : (
          <>
            <div className="topbar-search">
              <div className="search-box">
                <Icon name="search" size={13} color="#7a7a7a" />
                <input
                  ref={searchInputRef}
                  placeholder="Keresés receptek, hozzávalók, hűtő…"
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
              </div>
            </div>
            <div className="topbar-user">
              <button
                type="button"
                className="icon-btn topbar-icon topbar-help"
                aria-label="Gyorsbillentyűk"
                title="Gyorsbillentyűk (?)"
                onClick={onOpenHelp}
              >
                ?
              </button>
              <span className="topbar-email">
                {user?.email || "Ismeretlen email"}
              </span>
              <button
                type="button"
                className="btn-pill btn-outline"
                style={{ "--accent": "var(--brand-bright)" }}
                onClick={onSignOut}
              >
                Kijelentkezés
              </button>
            </div>
          </>
        )}
      </div>

      {isMobile && searchOpen && (
        <div className="topbar-search-mobile">
          <div className="search-box">
            <Icon name="search" size={13} color="#7a7a7a" />
            <input
              autoFocus
              placeholder="Keresés receptek, hozzávalók, hűtő…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
      )}

      {!isMobile && (
        <nav className="tabbar-top" aria-label="Fő menü">
          <div className="tabbar-top-inner">
            {TABS.map((t) => {
              const badge = badgeFor(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`tab-top${tab === t.id ? " is-active" : ""}`}
                  style={{ "--accent": t.accent }}
                  aria-current={tab === t.id}
                  data-nav-home={tab === t.id ? "" : undefined}
                  onClick={() => onSelectTab(t.id)}
                >
                  <Icon name={t.icon} size={14} />
                  {t.label}
                  {badge !== null && <span className="tab-badge">{badge}</span>}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
