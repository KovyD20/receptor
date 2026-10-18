const { z } = require("zod");
const { Type } = require("./aiClient");

const AI_ALLOWED_UNITS = [
  "db",
  "szem",
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
      group: { type: Type.STRING },
      note: { type: Type.STRING },
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

const URL_RECIPE_SCHEMA = {
  type: Type.OBJECT,
  properties: { found: { type: Type.BOOLEAN }, ...RECIPE_PROPERTIES },
  required: ["found", ...RECIPE_REQUIRED],
};

const OPTIONS_SCHEMA = {
  type: Type.OBJECT,
  properties: { options: { type: Type.ARRAY, items: { type: Type.STRING } } },
  required: ["options"],
};

// The responseSchema above steers the model; these check what actually came back.
const recipeOutput = z.object({
  name: z.string(),
  servings: z.number().nonnegative(),
  time_minutes: z.number().nonnegative(),
  ingredients: z.array(
    z.object({
      name: z.string(),
      amount: z.number(),
      unit: z.string(),
      group: z.string().optional(),
      note: z.string().optional(),
    }),
  ),
  steps: z.array(z.string()),
});

const RECIPE_OUTPUT = recipeOutput;
const FRIDGE_RECIPE_OUTPUT = recipeOutput.extend({ feasible: z.boolean() });
const URL_RECIPE_OUTPUT = recipeOutput.extend({ found: z.boolean() });
const OPTIONS_OUTPUT = z.object({ options: z.array(z.string()) });

const SYSTEM_PROMPT = [
  "Te egy profi séf asszisztens vagy.",
  "Minden szöveges mezőt kizárólag magyarul írj: az étel nevét, a hozzávalókat és az elkészítési lépéseket is.",
  "A hozzávalóknál a name mezőbe csak magát a hozzávalót írd, a mennyiség az amount és a unit mezőbe kerül.",
  "Szinonimák normalizálása: teáskanál/kiskanál -> tk, evőkanál -> ek, darab -> db.",
  'Ha a recept a hozzávalókat szekciókra bontja (pl. tészta és töltelék), minden hozzávaló group mezőjébe írd a szekció nevét (pl. "A töltelékhez"); egyébként hagyd üresen.',
  'A note mezőbe csak az adott hozzávalóra vonatkozó előkészítési megjegyzés kerülhet (pl. "reszelve a héja"); ha nincs ilyen, hagyd üresen.',
].join("\n");

module.exports = {
  AI_ALLOWED_UNITS,
  RECIPE_SCHEMA,
  FRIDGE_RECIPE_SCHEMA,
  URL_RECIPE_SCHEMA,
  OPTIONS_SCHEMA,
  RECIPE_OUTPUT,
  FRIDGE_RECIPE_OUTPUT,
  URL_RECIPE_OUTPUT,
  OPTIONS_OUTPUT,
  SYSTEM_PROMPT,
};
