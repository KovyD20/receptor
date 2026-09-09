import { describe, it, expect } from "vitest";
import { normalizeCatalogText } from "./catalogText.js";
import sharedCases from "../../../shared/normalizeCatalogText.cases.json";

describe("normalizeCatalogText (frontend copy — must match backend lib/normalize)", () => {
  it("strips accents, lowercases, and cleans punctuation", () => {
    expect(normalizeCatalogText("Vöröshagyma")).toBe("voroshagyma");
    expect(normalizeCatalogText("saláta (jégsaláta / fejes)")).toBe(
      "salata jegsalata fejes",
    );
    expect(normalizeCatalogText("")).toBe("");
  });
});

describe("normalizeCatalogText agrees with the shared cases", () => {
  it.each(sharedCases.cases)("$in -> $out", ({ in: input, out }) => {
    expect(normalizeCatalogText(input)).toBe(out);
  });

  it("returns an empty string for nullish input", () => {
    expect(normalizeCatalogText(null)).toBe("");
    expect(normalizeCatalogText(undefined)).toBe("");
  });
});
