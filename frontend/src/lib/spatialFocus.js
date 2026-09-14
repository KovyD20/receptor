function centerOf(rect) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function overlapOn(axis, a, b) {
  return axis === "x"
    ? Math.min(a.right, b.right) - Math.max(a.left, b.left)
    : Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
}

export function bestInDirection(origin, direction, list) {
  const base = origin.getBoundingClientRect();
  const from = centerOf(base);
  const vertical = direction === "up" || direction === "down";
  const sign = direction === "down" || direction === "right" ? 1 : -1;

  let best = null;
  let bestScore = Infinity;

  for (const element of list) {
    if (
      element === origin ||
      origin.contains(element) ||
      element.contains(origin)
    )
      continue;
    const rect = element.getBoundingClientRect();
    const to = centerOf(rect);

    const primary = vertical ? (to.y - from.y) * sign : (to.x - from.x) * sign;
    if (primary <= 1) continue;

    const bandOverlap = overlapOn("y", base, rect);
    if (vertical) {
      const shared = Math.min(base.height, rect.height) * 0.5;
      if (bandOverlap > shared) continue;
    } else if (bandOverlap <= 0) {
      continue;
    }

    const cross = vertical ? Math.abs(to.x - from.x) : Math.abs(to.y - from.y);
    const alignment = vertical ? overlapOn("x", base, rect) : bandOverlap;
    const score = primary + cross * (alignment > 0 ? 0.3 : 2.5);

    if (score < bestScore) {
      bestScore = score;
      best = element;
    }
  }

  return best;
}
