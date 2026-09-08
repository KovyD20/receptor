function parseSeedArgs(argv = []) {
  return { reset: Array.isArray(argv) && argv.includes("--reset") };
}

function describeTarget(env = process.env) {
  const host = env.DB_HOST || "localhost";
  const port = env.DB_PORT || 5432;
  const name = env.DB_NAME || "(unset)";
  const ssl = env.DB_SSL === "true" ? " ssl" : "";
  return `${host}:${port}/${name}${ssl}`;
}

module.exports = { parseSeedArgs, describeTarget };
