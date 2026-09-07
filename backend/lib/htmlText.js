const MAX_TEXT_CHARS = 20000;

const ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  aacute: "á",
  eacute: "é",
  iacute: "í",
  oacute: "ó",
  ouml: "ö",
  odblac: "ő",
  otilde: "ő",
  uacute: "ú",
  uuml: "ü",
  udblac: "ű",
  ucirc: "ű",
  Aacute: "Á",
  Eacute: "É",
  Iacute: "Í",
  Oacute: "Ó",
  Ouml: "Ö",
  Odblac: "Ő",
  Uacute: "Ú",
  Uuml: "Ü",
  Udblac: "Ű",
};

function decodeEntities(text) {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(parseInt(code, 16)),
    )
    .replace(
      /&([a-z]+);/gi,
      (match, name) => ENTITIES[name] ?? ENTITIES[name.toLowerCase()] ?? match,
    );
}

function htmlToText(html) {
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html;

  return decodeEntities(
    body
      .replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<\/(p|div|li|tr|h[1-6]|section|article)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim()
    .slice(0, MAX_TEXT_CHARS);
}

function fieldToText(value) {
  if (typeof value !== "string") return "";
  return htmlToText(value).replace(/\s*\n\s*/g, " ").trim();
}

module.exports = { htmlToText, fieldToText, decodeEntities, MAX_TEXT_CHARS };
