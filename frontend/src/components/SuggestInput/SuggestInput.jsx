import { useEffect, useId, useRef, useState } from "react";
import { pantryImageUrl } from "../../lib/pantryImages";
import "./SuggestInput.css";

function SuggestOption({ id, match, active, onPick }) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const { entry, alias } = match;
  const thumbSrc = pantryImageUrl({ nameKey: entry.key, imageUrl: entry.imageUrl });

  return (
    <div
      id={id}
      role="option"
      aria-selected={active}
      className={`suggest-option${active ? " is-active" : ""}`}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onPick(match)}
    >
      {thumbSrc && !thumbFailed && (
        <img
          className="suggest-thumb"
          src={thumbSrc}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          onError={() => setThumbFailed(true)}
        />
      )}
      <span className="suggest-name">{entry.name}</span>
      {alias && <span className="suggest-alias">{alias}</span>}
      <span className="suggest-cat">{entry.category}</span>
    </div>
  );
}

export default function SuggestInput({
  value,
  onChange,
  onSelect,
  suggest,
  dropUp = false,
  className = "",
  placeholder,
  onKeyDown,
  ...inputProps
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listRef = useRef(null);
  const listId = useId();
  const optionId = (index) => `${listId}-${index}`;

  const matches = suggest ? suggest(value) : [];
  const isOpen = open && matches.length > 0;
  const activeMatch = active >= 0 ? matches[active] : null;

  useEffect(() => {
    if (active < 0) return;
    listRef.current?.children[active]?.scrollIntoView?.({ block: "nearest" });
  }, [active]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.style.left = "";
    const overflow = list.getBoundingClientRect().right - window.innerWidth + 12;
    if (overflow > 0) {
      list.style.left = `${-6 - overflow}px`;
    }
  }, [isOpen, value]);

  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  const pick = (match) => {
    close();
    onSelect?.(match.entry);
  };

  const move = (delta) => {
    if (!matches.length) return;
    setOpen(true);
    setActive((prev) => {
      const next = prev + delta;
      if (next < 0) return matches.length - 1;
      if (next >= matches.length) return 0;
      return next;
    });
  };

  const handleKeyDown = (event) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        move(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        move(-1);
        break;
      case "Enter":
        if (!activeMatch) break;
        event.preventDefault();
        pick(activeMatch);
        break;
      case "Escape":
        if (!isOpen) break;
        event.preventDefault();
        close();
        break;
      case "Tab":
        close();
        break;
      default:
        break;
    }
  };

  return (
    <div className={`suggest${dropUp ? " is-up" : ""}`}>
      <input
        {...inputProps}
        type="text"
        className={className}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeMatch ? optionId(active) : undefined}
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(event) => {
          onChange(event);
          setOpen(true);
          setActive(-1);
        }}
        onBlur={close}
        onKeyDown={(event) => {
          handleKeyDown(event);
          if (!event.defaultPrevented) onKeyDown?.(event);
        }}
      />

      {isOpen && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Javaslatok"
          className="suggest-list"
        >
          {matches.map((match, index) => (
            <SuggestOption
              key={match.entry.key}
              id={optionId(index)}
              match={match}
              active={index === active}
              onPick={pick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
