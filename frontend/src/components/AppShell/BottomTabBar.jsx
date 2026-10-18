import Icon from "../Icon/Icon";
import { TABS } from "../../constants/tabs";

export default function BottomTabBar({ tab, badgeFor, onSelectTab }) {
  return (
    <nav className="tabbar-bottom" aria-label="Fő menü">
      {TABS.map((t) => {
        const badge = badgeFor(t.id);
        return (
          <button
            key={t.id}
            type="button"
            className={`tab-bottom${tab === t.id ? " is-active" : ""}`}
            style={{ "--accent": t.accent }}
            aria-current={tab === t.id}
            data-nav-home={tab === t.id ? "" : undefined}
            onClick={() => onSelectTab(t.id)}
          >
            <span className="tab-bottom-icon">
              <Icon name={t.icon} size={19} />
              {badge !== null && <span className="tab-badge">{badge}</span>}
            </span>
            <span className="tab-bottom-label">{t.shortLabel}</span>
          </button>
        );
      })}
    </nav>
  );
}
