const MESSAGES = {
  AI_MODEL_NOT_FOUND:
    "A beállított AI modell nem érhető el — valószínűleg megszűnt. Ezt fejlesztőnek kell javítania.",
  AI_AUTH: "Az AI hozzáférés nincs rendben. Ezt fejlesztőnek kell javítania.",
  AI_OVERLOADED:
    "Az AI éppen túlterhelt. Próbáld újra néhány másodperc múlva.",
  AI_TIMEOUT: "Az AI túl sokáig gondolkodott. Próbáld újra.",
  AI_INVALID_JSON: "Az AI válasza hibás formátumú volt. Próbáld újra.",
  AI_BAD_REQUEST: "Az AI elutasította a kérést. Próbáld újra.",
  AI_NOT_FEASIBLE:
    "Ebből a hozzávaló-listából nem készíthető el ez az étel. Válassz másikat.",
};

function quotaMessage(retryAfterSeconds) {
  if (retryAfterSeconds && retryAfterSeconds <= 300) {
    return `Az AI percenkénti keretét elhasználtuk. Próbáld újra kb. ${retryAfterSeconds} másodperc múlva.`;
  }
  return "Az AI napi ingyenes keretét elhasználtuk. Próbáld újra holnap.";
}

export function aiErrorMessage(status, data) {
  const code = data?.code;

  if (code === "AI_QUOTA") {
    return quotaMessage(data?.retry_after_seconds);
  }

  if (code && MESSAGES[code]) return MESSAGES[code];

  if (status === 429) {
    return "Túl sok AI kérés rövid idő alatt. Várj pár percet, aztán próbáld újra.";
  }

  if (data?.error === "Fridge is empty") return "A hűtő üres";

  return data?.error || "AI hiba";
}
