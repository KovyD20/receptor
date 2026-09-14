const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

const NON_TEXT_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

export function isTypingTarget(eventOrTarget) {
  const target =
    eventOrTarget && "target" in eventOrTarget
      ? eventOrTarget.target
      : eventOrTarget;
  if (!target || typeof target !== "object") return false;

  if (target.isContentEditable) return true;
  const editable = target.getAttribute?.("contenteditable");
  if (editable != null && editable !== "false") return true;

  const tag = target.tagName;
  if (!TYPING_TAGS.has(tag)) return false;
  if (tag === "INPUT") {
    const type = String(target.type || "text").toLowerCase();
    if (NON_TEXT_INPUT_TYPES.has(type)) return false;
  }
  return true;
}

export const ROVING_ITEM_ATTR = "data-kbd-item";

export function arrowReachable(key) {
  return { tabIndex: -1, [ROVING_ITEM_ATTR]: key };
}

export function isPlainKey(event) {
  return !event.ctrlKey && !event.metaKey && !event.altKey;
}
