import { useRef, useState } from "react";
import Icon from "../Icon/Icon";
import { isPlainKey, isTypingTarget } from "../../lib/keyboard";
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

export function ColorEditToggle({ groupCount, active, onToggle }) {
  if (!groupCount) return null;

  return (
    <button
      type="button"
      className={`btn-pill btn-outline${
        active ? "" : " btn-outline-neutral"
      } color-edit-toggle`}
      aria-pressed={active}
      onClick={onToggle}
    >
      <Icon name={active ? "check" : "xmark"} size={11} />
      Színek szerkesztése
    </button>
  );
}

export function GroupCard({
  accent,
  category,
  meta,
  open,
  onToggle,
  navProps,
  onColorChange,
  onColorReset,
  colorEditing,
  isCustomColor,
  children,
}) {
  const [picking, setPicking] = useState(false);

  const canPickColor = Boolean(onColorChange) && Boolean(colorEditing);
  if (picking && !canPickColor) setPicking(false);

  return (
    <div className="group-card" style={{ "--accent": accent }}>
      <div className="group-head-row">
        <button
          type="button"
          className="group-head"
          aria-expanded={open}
          onClick={onToggle}
          {...navProps}
          onKeyDown={(event) => {
            if (!isPlainKey(event)) return;
            if (event.key === "ArrowRight" && !open) {
              event.preventDefault();
              onToggle();
            } else if (event.key === "ArrowLeft" && open) {
              event.preventDefault();
              onToggle();
            }
          }}
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
            disabled={!canPickColor}
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

      {open && (
        <div className="group-body" role="list">
          {children}
        </div>
      )}
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
          e.preventDefault();
          commit();
          onDone?.();
        } else if (e.key === "Escape") {
          e.preventDefault();
          setDraft(null);
          onDone?.();
        }
      }}
    />
  );
}

function NoteField({ value, maxLength, onCommit, onDone }) {
  const [draft, setDraft] = useState(null);

  const commit = () => {
    if (draft === null) return;
    const next = draft.trim();
    setDraft(null);
    if (next === (value || "")) return;
    onCommit(next);
  };

  return (
    <input
      className="item-note-input"
      type="text"
      aria-label="Saját megjegyzés"
      placeholder="saját megjegyzés"
      maxLength={maxLength}
      value={draft ?? (value || "")}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
          onDone?.();
        } else if (e.key === "Escape") {
          e.preventDefault();
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
  userNote,
  onNoteChange,
  noteMaxLength,
  done,
  onToggleDone,
  onIncrement,
  onDecrement,
  onDelete,
  disableDecrement,
  navProps,
}) {
  const rowRef = useRef(null);
  const [thumbFailed, setThumbFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const thumbSrc = showThumb ? pantryImageUrl({ nameKey, imageUrl }) : null;

  const canEdit = Boolean(onAmountChange || onUnitChange || onNoteChange);
  const isEditing = canEdit && editing;
  const showControls = isEditing || !canEdit;

  const stopEditing = () => {
    setEditing(false);
    rowRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (isTypingTarget(event) || !isPlainKey(event)) return;

    const run = (handler) => {
      if (!handler) return;
      event.preventDefault();
      handler();
    };

    switch (event.key) {
      case "ArrowRight":
        run(onIncrement);
        break;
      case "ArrowLeft":
        if (!disableDecrement) run(onDecrement);
        break;
      case " ":
        run(onToggleDone);
        break;
      case "Delete":
      case "Backspace":
        run(onDelete);
        break;
      case "Enter":
        if (canEdit) {
          event.preventDefault();
          setEditing(true);
        }
        break;
      default:
        break;
    }
  };

  return (
    <div
      ref={rowRef}
      className={`item-row${isEditing ? " is-editing" : ""}`}
      role="listitem"
      aria-label={name}
      onKeyDown={handleKeyDown}
      {...navProps}
    >
      {onToggleDone && (
        <button
          type="button"
          className={`item-check${done ? " is-done" : ""}`}
          tabIndex={-1}
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
        {isEditing && onNoteChange ? (
          <NoteField
            value={userNote}
            maxLength={noteMaxLength}
            onCommit={onNoteChange}
            onDone={stopEditing}
          />
        ) : (
          note && <span className="item-note">{note}</span>
        )}
      </div>

      <div className="item-controls">
        <div className={`item-stepper${showControls ? " has-steps" : ""}`}>
          {showControls && (
            <button
              type="button"
              className="icon-btn"
              tabIndex={-1}
              aria-label="Csökkentés"
              disabled={disableDecrement}
              onClick={onDecrement}
            >
              <Icon name="minus" size={11} />
            </button>
          )}
          {isEditing && onAmountChange ? (
            <AmountField
              value={amount}
              onCommit={onAmountChange}
              onDone={stopEditing}
            />
          ) : (
            <span className="item-qty">{qtyLabel}</span>
          )}
          {isEditing && onUnitChange && (
            <span className="item-unit-wrap" data-unit={unit || ""}>
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
            </span>
          )}
          {showControls && (
            <button
              type="button"
              className="icon-btn"
              tabIndex={-1}
              aria-label="Növelés"
              onClick={onIncrement}
            >
              <Icon name="plus" size={11} />
            </button>
          )}
        </div>

        {canEdit && (
          <button
            type="button"
            className={`icon-btn item-edit${isEditing ? " is-active" : ""}`}
            tabIndex={-1}
            aria-label={`${name} szerkesztése`}
            aria-pressed={isEditing}
            onClick={() => (isEditing ? stopEditing() : setEditing(true))}
          >
            <Icon name={isEditing ? "check" : "pen"} size={11} />
          </button>
        )}

        {showControls && (
          <button
            type="button"
            className="icon-btn danger"
            tabIndex={-1}
            aria-label={`${name} törlése`}
            onClick={onDelete}
          >
            <Icon name="trash" size={11} />
          </button>
        )}
      </div>
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
