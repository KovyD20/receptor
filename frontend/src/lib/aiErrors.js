const MESSAGES = {
  AI_MODEL_NOT_FOUND:
    "A beállított AI modell nem érhető el — valószínűleg megszűnt. Ezt fejlesztőnek kell javítania.",
  AI_AUTH: "Az AI hozzáférés nincs rendben. Ezt fejlesztőnek kell javítania.",
  AI_OVERLOADED:
    "Az AI éppen túlterhelt. Próbáld újra néhány másodperc múlva.",
  AI_TIMEOUT: "Az AI túl sokáig gondolkodott. Próbáld újra.",
  AI_INVALID_JSON: "Az AI válasza hibás formátumú volt. Próbáld újra.",
  AI_BAD_REQUEST: "Az AI elutasította a kérést. Próbáld újra.",
  URL_INVALID: "Ez nem érvényes webcím. Másold be a recept oldalának teljes linkjét.",
  URL_PRIVATE: "Ez a cím nem érhető el.",
  URL_TIMEOUT: "Az oldal túl lassan válaszolt. Próbáld újra.",
  URL_BLOCKED:
    "Ez az oldal nem engedi a beolvasást. Másold be a recept szövegét kézzel.",
  URL_FETCH_FAILED: "Az oldalt nem sikerült letölteni. Ellenőrizd a linket.",
  URL_TOO_MANY_REDIRECTS:
    "Ez a link túl sokszor irányít tovább. Másold be a recept közvetlen linkjét.",
  URL_NOT_HTML: "Ez a link nem egy weboldal.",
  URL_TOO_LARGE: "Ez az oldal túl nagy a beolvasáshoz.",
  URL_NO_TEXT:
    "Ezen az oldalon nem találtunk olvasható szöveget. Lehet, hogy bejelentkezés kell hozzá.",
  URL_NO_RECIPE: "Ezen az oldalon nem találtunk receptet.",
  AI_NOT_FEASIBLE:
    "Ebből a hozzávaló-listából nem készíthető el ez az étel. Válassz másikat.",
};

function quotaMessage(data) {
  const retryAfterSeconds = data?.retry_after_seconds;

  if (data?.quota_scope === "daily") {
    return "Az AI napi ingyenes keretét elhasználtuk. Próbáld újra holnap.";
  }
  if (retryAfterSeconds && retryAfterSeconds <= 300) {
    return `Az AI percenkénti keretét elhasználtuk. Próbáld újra kb. ${retryAfterSeconds} másodperc múlva.`;
  }
  return "Az AI napi ingyenes keretét elhasználtuk. Próbáld újra holnap.";
}

export function aiErrorMessage(status, data) {
  const code = data?.code;

  if (code === "AI_QUOTA") {
    return quotaMessage(data);
  }

  if (code && MESSAGES[code]) return MESSAGES[code];

  if (status === 429) {
    return "Túl sok AI kérés rövid idő alatt. Várj pár percet, aztán próbáld újra.";
  }

  if (data?.error === "Fridge is empty") return "A hűtő üres";

  return data?.error || "AI hiba";
}
