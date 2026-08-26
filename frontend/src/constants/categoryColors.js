const CATEGORY_COLORS = {
  "Zöldségek": "var(--cat-vegetables)",
  "Gyümölcsök": "var(--cat-fruits)",
  "Pékáruk": "var(--cat-bakery)",
  "Húsfélék": "var(--cat-meat)",
  "Felvágottak": "var(--cat-deli)",
  "Tejtermékek, tojás": "var(--cat-dairy)",
  "Fagyasztott termékek": "var(--cat-frozen)",
  "Szárazáru": "var(--cat-dry)",
  "Fűszerek, ízesítők": "var(--cat-spices)",
  "Üdítők, italok": "var(--cat-drinks)",
  "Snackek": "var(--cat-snacks)",
  "Háztartási alapcikkek (konyha)": "var(--cat-household)",
  "Háztartási alapcikkek (fürdő)": "var(--cat-household-bath)",
  "Egyéb": "var(--cat-other)",
};

export const CATEGORY_COLOR_KEYS = Object.keys(CATEGORY_COLORS);

export const COLOR_SWATCHES = [
  "#6ee7a0",
  "#67d5e0",
  "#7fc7ff",
  "#8fb2c4",
  "#9b8cff",
  "#b98cff",
  "#d98cb3",
  "#ff8fb1",
  "#e5383b",
  "#ff7a45",
  "#ffb020",
  "#f0c96a",
  "#d9a05b",
  "#c9b458",
  "#9aa0a6",
  "#cfcfcf",
];

export function categoryAccent(category) {
  return CATEGORY_COLORS[category] || "var(--cat-other)";
}
