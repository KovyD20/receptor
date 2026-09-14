import { useRef, useState } from "react";
import Icon from "../Icon/Icon";
import { isPlainKey, isTypingTarget } from "../../lib/keyboard";
import ColorPicker from "../ColorPicker/ColorPicker";
import SuggestInput from "../SuggestInput/SuggestInput";
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

function AmountField({ value, onCommit, onStep, onDone }) {
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
        if (e.key === "+" || e.key === "-") {
          e.preventDefault();
          setDraft(null);
          onStep?.(e.key === "+" ? 1 : -1);
          return;
        }
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

export function PantryThumb({ nameKey, imageUrl, className = "item-thumb" }) {
  const [failedSrc, setFailedSrc] = useState(null);

  const src = pantryImageUrl({ nameKey, imageUrl });
  if (!src || failedSrc === src) return null;

  return (
    <img
      className={className}
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      onError={() => setFailedSrc(src)}
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
  const [editing, setEditing] = useState(false);

  const canEdit = Boolean(onAmountChange || onUnitChange || onNoteChange);
  const isEditing = canEdit && editing;
  const showControls = isEditing || !canEdit;

  const stopEditing = () => {
    setEditing(false);
    rowRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (event.defaultPrevented || !isPlainKey(event)) return;

    const run = (handler) => {
      if (!handler) return;
      event.preventDefault();
      handler();
    };

    if (isEditing) {
      switch (event.key) {
        case "+":
          run(onIncrement);
          return;
        case "-":
          if (!disableDecrement) run(onDecrement);
          return;
        case "Enter":
          event.preventDefault();
          stopEditing();
          return;
        case "Delete":
          run(onDelete);
          return;
        default:
          break;
      }
    }

    if (isTypingTarget(event)) return;

    switch (event.key) {
      case "+":
        run(onIncrement);
        break;
      case "-":
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

      {showThumb && <PantryThumb nameKey={nameKey} imageUrl={imageUrl} />}

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
              onStep={(delta) => {
                if (delta > 0) onIncrement?.();
                else if (!disableDecrement) onDecrement?.();
              }}
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

export function AddItemRow({ units, onAdd, suggest, browse, dropUp }) {
  const [draft, setDraft] = useState({ name: "", amount: "", unit: "db" });

  const submit = () => {
    const name = draft.name.trim();
    const amount = Number(draft.amount);
    if (!name || !Number.isFinite(amount) || amount <= 0) return;
    onAdd({ name, amount, unit: draft.unit || "db" });
    setDraft({ name: "", amount: "", unit: "db" });
  };

  const stepAmount = (delta) => {
    setDraft((prev) => {
      const next = (Number(prev.amount) || 0) + delta;
      return { ...prev, amount: next > 0 ? String(next) : "" };
    });
  };

  const applySuggestion = (entry) => {
    setDraft((prev) => {
      if (prev.amount) return { ...prev, name: entry.name };
      return {
        name: entry.name,
        amount: String(entry.purchase?.amount || 1),
        unit: entry.purchase?.unit || prev.unit,
      };
    });
  };

  return (
    <div className="add-item">
      <Icon name="plus" size={12} color="#7a7a7a" />
      <SuggestInput
        className="add-name"
        placeholder="Tétel hozzáadása"
        suggest={suggest}
        browse={browse}
        dropUp={dropUp}
        value={draft.name}
        onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
        onSelect={applySuggestion}
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
        onKeyDown={(e) => {
          if (e.key === "+" || e.key === "-") {
            e.preventDefault();
            stepAmount(e.key === "+" ? 1 : -1);
            return;
          }
          if (e.key === "Enter") submit();
        }}
      />
      <select
        value={draft.unit}
        aria-label="Mértékegység"
        onChange={(e) => setDraft((p) => ({ ...p, unit: e.target.value }))}
      >
        {units.includes(draft.unit) ? null : (
          <option value={draft.unit}>{draft.unit}</option>
        )}
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
