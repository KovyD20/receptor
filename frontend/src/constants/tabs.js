export const TABS = [
  {
    id: "receptek",
    label: "Receptek",
    shortLabel: "Receptek",
    icon: "book",
    accent: "var(--brand-bright)",
  },
  {
    id: "recept",
    label: "Recept",
    shortLabel: "Recept",
    icon: "utensils",
    accent: "var(--orange)",
  },
  {
    id: "lista",
    label: "Bevásárlólista",
    shortLabel: "Lista",
    icon: "cart",
    accent: "var(--yellow)",
  },
  {
    id: "huto",
    label: "Hűtő",
    shortLabel: "Hűtő",
    icon: "snowflake",
    accent: "var(--blue)",
  },
  {
    id: "uj",
    label: "Új recept",
    shortLabel: "Új",
    icon: "wand",
    accent: "var(--brand-bright)",
  },
];

export const TAB_IDS = TABS.map((t) => t.id);

export const SCREEN_TITLES = {
  receptek: "Receptek",
  recept: "Recept",
  lista: "Bevásárlólista",
  huto: "Hűtő",
  uj: "Új recept",
};
