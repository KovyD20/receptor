import Icon from "../Icon/Icon";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { COLOR_SWATCHES } from "../../constants/categoryColors";
import "./ColorPicker.css";

export default function ColorPicker({
  category,
  value,
  isCustom,
  onSelect,
  onReset,
  onClose,
}) {
  const panelRef = useFocusTrap(true, { onEscape: onClose });

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      className="color-panel"
      role="group"
      aria-label={`${category} színe`}
    >
      <div className="color-panel-head">
        <span className="color-panel-title">Szín</span>
        <button
          type="button"
          className="icon-btn"
          aria-label="Színválasztó bezárása"
          onClick={onClose}
        >
          <Icon name="xmark" size={10} />
        </button>
      </div>

      <div className="color-grid">
        {COLOR_SWATCHES.map((hex) => {
          const selected = value?.toLowerCase() === hex;
          return (
            <button
              key={hex}
              type="button"
              className={`color-swatch${selected ? " is-selected" : ""}`}
              style={{ "--swatch": hex }}
              aria-label={hex}
              aria-pressed={selected}
              onClick={() => onSelect(hex)}
            />
          );
        })}
      </div>

      <button
        type="button"
        className="btn-pill btn-outline btn-outline-neutral color-reset"
        disabled={!isCustom}
        onClick={onReset}
      >
        Vissza az alapértelmezettre
      </button>
    </div>
  );
}
