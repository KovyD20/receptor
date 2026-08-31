import { useState } from "react";
import Icon from "../Icon/Icon";
import ColorPicker from "../ColorPicker/ColorPicker";
import { pantryImageUrl } from "../../lib/pantryImages";

export function CollapseAllToggle({ keys, anyClosed, onOpenAll, onCloseAll }) {
  if (!keys || keys.length === 0) return null;

  const willExpand = anyClosed(keys);

  return (
    <button
      type="button"
      className="btn-pill btn-outline btn-outline-neutral collapse-all"
      onClick={() => (willExpand ? onOpenAll() : onCloseAll(keys))}
    >
      <Icon name={willExpand ? "chevronDown" : "chevronUp"} size={11} />
      {willExpand ? "Kategóriák kibontása" : "Kategóriák összecsukása"}
    </button>
  );
}

export function GroupCard({
  accent,
  category,
  meta,
  open,
  onToggle,
  onColorChange,
  onColorReset,
  isCustomColor,
  children,
}) {
  const [picking, setPicking] = useState(false);

  return (
    <div className="group-card" style={{ "--accent": accent }}>
      <div className="group-head-row">
        <button
          type="button"
          className="group-head"
          aria-expanded={open}
          onClick={onToggle}
        >
          <span className="group-name">{category}</span>
          <span className="group-meta">{meta}</span>
          <Icon
            name={open ? "chevronUp" : "chevronDown"}
            size={11}
            color="#7d7d7d"
          />
        </button>

        {onColorChange && (
          <button
            type="button"
            className="group-color"
            aria-label={`${category} színének módosítása`}
            aria-expanded={picking}
            onClick={() => setPicking((prev) => !prev)}
          >
            <span className="group-color-dot" />
          </button>
        )}
      </div>

      {picking && (
        <ColorPicker
          category={category}
          value={accent}
          isCustom={Boolean(isCustomColor)}
          onSelect={(hex) => {
            onColorChange(hex);
            setPicking(false);
          }}
          onReset={() => {
            onColorReset?.();
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      )}

      {open && <div className="group-body">{children}</div>}
    </div>
  );
}

function AmountField({ value, onCommit, onDone }) {
  const [draft, setDraft] = useState(null);

  const commit = () => {
    if (draft === null) return;
    const next = Number(draft);
    setDraft(null);
    if (!Number.isFinite(next) || next <= 0 || next === Number(value)) return;
    onCommit(next);
  };

  return (
    <input
      className="item-qty-input"
      type="number"
      min="0"
      step="any"
      aria-label="Mennyiség"
      autoFocus
      value={draft ?? String(value ?? "")}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          commit();
          onDone?.();
        } else if (e.key === "Escape") {
          setDraft(null);
          onDone?.();
        }
      }}
    />
  );
}

export function ItemRow({
  name,
  nameKey,
  imageUrl,
  showThumb = true,
  qtyLabel,
  amount,
  unit,
  units,
  onAmountChange,
  onUnitChange,
  note,
  done,
  onToggleDone,
  onIncrement,
  onDecrement,
  onDelete,
  disableDecrement,
}) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const thumbSrc = showThumb ? pantryImageUrl({ nameKey, imageUrl }) : null;

  const canEdit = Boolean(onAmountChange || onUnitChange);
  const isEditing = canEdit && editing;

  return (
    <div className="item-row">
      {onToggleDone && (
        <button
          type="button"
          className={`item-check${done ? " is-done" : ""}`}
          aria-pressed={Boolean(done)}
          aria-label={`${name} megvéve`}
          onClick={onToggleDone}
        >
          <Icon name="check" size={11} />
        </button>
      )}

      {thumbSrc && !thumbFailed && (
        <img
          className="item-thumb"
          src={thumbSrc}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          onError={() => setThumbFailed(true)}
        />
      )}

      <div className="item-label">
        <span className={`item-name${done ? " is-done" : ""}`}>{name}</span>
        {note && <span className="item-note">{note}</span>}
      </div>

      <div className="item-stepper">
        <button
          type="button"
          className="icon-btn"
          aria-label="Csökkentés"
          disabled={disableDecrement}
          onClick={onDecrement}
        >
          <Icon name="minus" size={11} />
        </button>
        {isEditing && onAmountChange ? (
          <AmountField
            value={amount}
            onCommit={onAmountChange}
            onDone={() => setEditing(false)}
          />
        ) : (
          <span className="item-qty">{qtyLabel}</span>
        )}
        {isEditing && onUnitChange && (
          <select
            className="item-unit"
            aria-label="Mértékegység"
            value={unit}
            onChange={(e) => onUnitChange(e.target.value)}
          >
            {(units || []).includes(unit) ? null : (
              <option value={unit}>{unit}</option>
            )}
            {(units || []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          className="icon-btn"
          aria-label="Növelés"
          onClick={onIncrement}
        >
          <Icon name="plus" size={11} />
        </button>
      </div>

      {canEdit && (
        <button
          type="button"
          className={`icon-btn item-edit${isEditing ? " is-active" : ""}`}
          aria-label={`${name} mennyiségének módosítása`}
          aria-pressed={isEditing}
          onClick={() => setEditing((prev) => !prev)}
        >
          <Icon name={isEditing ? "check" : "pen"} size={11} />
        </button>
      )}

      <button
        type="button"
        className="icon-btn danger"
        aria-label={`${name} törlése`}
        onClick={onDelete}
      >
        <Icon name="trash" size={11} />
      </button>
    </div>
  );
}

export function AddItemRow({ units, onAdd }) {
  const [draft, setDraft] = useState({ name: "", amount: "", unit: "db" });

  const submit = () => {
    const name = draft.name.trim();
    const amount = Number(draft.amount);
    if (!name || !Number.isFinite(amount) || amount <= 0) return;
    onAdd({ name, amount, unit: draft.unit || "db" });
    setDraft({ name: "", amount: "", unit: "db" });
  };

  return (
    <div className="add-item">
      <Icon name="plus" size={12} color="#7a7a7a" />
      <input
        className="add-name"
        placeholder="Tétel hozzáadása"
        value={draft.name}
        onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <input
        className="add-amount"
        type="number"
        min="0"
        step="1"
        placeholder="menny."
        value={draft.amount}
        onChange={(e) => setDraft((p) => ({ ...p, amount: e.target.value }))}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <select
        value={draft.unit}
        aria-label="Mértékegység"
        onChange={(e) => setDraft((p) => ({ ...p, unit: e.target.value }))}
      >
        {units.map((unit) => (
          <option key={unit} value={unit}>
            {unit}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="icon-btn"
        aria-label="Hozzáadás"
        onClick={submit}
      >
        <Icon name="plus" size={12} />
      </button>
    </div>
  );
}
