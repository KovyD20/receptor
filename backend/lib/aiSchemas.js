const { Type } = require("./aiClient");

const AI_ALLOWED_UNITS = [
  "db",
  "g",
  "dkg",
  "kg",
  "ml",
  "dl",
  "l",
  "tk",
  "ek",
  "csipet",
  "csokor",
  "gerezd",
  "szelet",
  "bögre",
  "pohár",
  "csomag",
  "konzerv",
  "fej",
  "szál",
  "marék",
];

const INGREDIENTS_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      amount: { type: Type.NUMBER },
      unit: { type: Type.STRING, enum: AI_ALLOWED_UNITS },
    },
    required: ["name", "amount", "unit"],
  },
};

const RECIPE_PROPERTIES = {
  name: { type: Type.STRING },
  servings: { type: Type.INTEGER },
  time_minutes: { type: Type.INTEGER },
  ingredients: INGREDIENTS_SCHEMA,
  steps: { type: Type.ARRAY, items: { type: Type.STRING } },
};

const RECIPE_REQUIRED = [
  "name",
  "servings",
  "time_minutes",
  "ingredients",
  "steps",
];

const RECIPE_SCHEMA = {
  type: Type.OBJECT,
  properties: RECIPE_PROPERTIES,
  required: RECIPE_REQUIRED,
};

const FRIDGE_RECIPE_SCHEMA = {
  type: Type.OBJECT,
  properties: { feasible: { type: Type.BOOLEAN }, ...RECIPE_PROPERTIES },
  required: ["feasible", ...RECIPE_REQUIRED],
};

const OPTIONS_SCHEMA = {
  type: Type.OBJECT,
  properties: { options: { type: Type.ARRAY, items: { type: Type.STRING } } },
  required: ["options"],
};

const SYSTEM_PROMPT = [
  "Te egy profi séf asszisztens vagy.",
  "Minden szöveges mezőt kizárólag magyarul írj: az étel nevét, a hozzávalókat és az elkészítési lépéseket is.",
  "A hozzávalóknál a name mezőbe csak magát a hozzávalót írd, a mennyiség az amount és a unit mezőbe kerül.",
  "Szinonimák normalizálása: teáskanál/kiskanál -> tk, evőkanál -> ek, darab -> db.",
].join("\n");

module.exports = {
  AI_ALLOWED_UNITS,
  RECIPE_SCHEMA,
  FRIDGE_RECIPE_SCHEMA,
  OPTIONS_SCHEMA,
  SYSTEM_PROMPT,
};
