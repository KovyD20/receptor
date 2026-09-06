import { SYSTEM_UNITS, UNIT_ALIASES } from "../constants/units";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const UNIT_TOKENS = Array.from(
  new Set([...SYSTEM_UNITS, ...Object.keys(UNIT_ALIASES)]),
).sort((a, b) => b.length - a.length);

const UNIT_TOKEN_PATTERN = UNIT_TOKENS.map(escapeRegex).join("|");

export function stripAmountsAndUnits(value) {
  const base = (value || "").toString().trim().toLocaleLowerCase("hu-HU");
  const ascii = base.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const unitRegex = UNIT_TOKEN_PATTERN
    ? new RegExp(`(\\d+([.,]\\d+)?)(\\s*)(${UNIT_TOKEN_PATTERN})\\b`, "g")
    : null;

  const withoutNumbers = ascii
    .replace(unitRegex || /$^/, " ")
    .replace(/\b\d+([.,]\d+)?\b/g, " ")
    .replace(/[()\-_,.;:!+]/g, " ");

  return withoutNumbers.replace(/\s+/g, " ").trim();
}

export function normalizeUnit(value) {
  const raw = (value || "").toString().trim().toLocaleLowerCase("hu-HU");
  if (!raw) return "";
  const ascii = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const cleaned = ascii.replace(/\./g, "").replace(/[\s-]+/g, "").trim();
  return UNIT_ALIASES[cleaned] || cleaned;
}

export function unitInfo(unit) {
  const u = normalizeUnit(unit);
  const table = {
    g: { kind: "mass", factor: 1 },
    dkg: { kind: "mass", factor: 10 },
    kg: { kind: "mass", factor: 1000 },
    ml: { kind: "volume", factor: 1 },
    dl: { kind: "volume", factor: 100 },
    l: { kind: "volume", factor: 1000 },
    db: { kind: "count", factor: 1 },
  };
  return { unit: u, ...table[u] };
}

export function areUnitsCompatible(a, b) {
  if (!a || !b) return false;
  if (a.unit === b.unit) return true;
  if (!a.kind || !b.kind) return false;
  return a.kind === b.kind && (a.kind === "mass" || a.kind === "volume");
}

export function convertAmount(amount, fromInfo, toInfo) {
  if (!fromInfo || !toInfo) return amount;
  if (fromInfo.unit === toInfo.unit) return amount;
  if (!areUnitsCompatible(fromInfo, toInfo)) return amount;
  return (Number(amount) || 0) * (fromInfo.factor / toInfo.factor);
}

const MAX_PURCHASE_PACKAGES = 20;
const PACKAGE_EPSILON = 1e-9;

function trimFloat(value) {
  return Math.round(value * 1000) / 1000;
}

export function accumulatePurchase(asks, purchase, previous = null) {
  const list = (Array.isArray(asks) ? asks : [])
    .map((ask) => ({ amount: Number(ask?.amount), unit: normalizeUnit(ask?.unit) }))
    .filter((ask) => Number.isFinite(ask.amount) && ask.amount > 0);

  const packageAmount = Number(purchase?.amount);
  const packageUnit = normalizeUnit(purchase?.unit);
  const hasPackage =
    Boolean(packageUnit) && Number.isFinite(packageAmount) && packageAmount > 0;

  if (!hasPackage) {
    if (list.length === 0) return { amount: 0, unit: "", source: null, rounded: false };

    const target = unitInfo(list[0].unit);
    let sum = 0;
    for (const ask of list) {
      const from = unitInfo(ask.unit);
      if (!areUnitsCompatible(from, target)) continue;
      sum += convertAmount(ask.amount, from, target);
    }
    return {
      amount: trimFloat(sum),
      unit: target.unit,
      source: null,
      rounded: false,
    };
  }

  const to = unitInfo(packageUnit);

  let totalUnit = previous?.amount > 0 ? normalizeUnit(previous.unit) : "";
  let total = previous?.amount > 0 ? Number(previous.amount) : 0;
  let loose = Boolean(previous?.loose);

  for (const ask of list) {
    const from = unitInfo(ask.unit);
    if (!areUnitsCompatible(from, to)) {
      loose = true;
      continue;
    }
    if (!totalUnit) {
      totalUnit = from.unit;
      total = ask.amount;
      continue;
    }
    total += convertAmount(ask.amount, from, unitInfo(totalUnit));
  }
  total = trimFloat(total);

  const source =
    total > 0
      ? { amount: total, unit: totalUnit, ...(loose ? { loose: true } : {}) }
      : loose
        ? { amount: 0, unit: "", loose: true }
        : null;

  const convertedTotal =
    total > 0 ? convertAmount(total, unitInfo(totalUnit), to) : 0;
  let packages =
    convertedTotal > 0
      ? Math.ceil(convertedTotal / packageAmount - PACKAGE_EPSILON)
      : 0;
  if (loose) packages = Math.max(packages, 1);

  if (packages <= 0) return { amount: 0, unit: packageUnit, source, rounded: false };

  if (packages > MAX_PURCHASE_PACKAGES) {
    console.warn(
      `accumulatePurchase: ${total} ${totalUnit} is ${packages} x ${packageAmount} ${packageUnit} — leaving the amount unchanged.`,
    );
    return { amount: total, unit: totalUnit, source, rounded: false };
  }

  const amount = trimFloat(packages * packageAmount);
  return {
    amount,
    unit: packageUnit,
    source,
    rounded: amount !== total || packageUnit !== totalUnit,
  };
}
