require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const app = express();
const PORT = Number(process.env.PORT || 3000);

const aiRouter = require("./routes/ai");
const dbRouter = require("./routes/db");
const pantryRouter = require("./routes/pantry");

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

for (const origin of allowedOrigins) {
  if (
    origin.startsWith("http://") &&
    !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  ) {
    console.warn(
      `[cors] "${origin}" is plain http. A deployed frontend is served over https ` +
        `and its Origin header will read "https://…", which will NOT match — use https:// ` +
        `unless this host really is http-only.`,
    );
  }
}
console.log(`[cors] allowed origins: ${allowedOrigins.join(", ")}`);

if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "100kb" }));
app.use("/api/ai", aiRouter);
app.use("/api/db", dbRouter);
app.use("/api/pantry", pantryRouter);

app.get("/health", (req, res) => {
  res.json({ status: "ok", instance: process.env.INSTANCE_NAME || "local" });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
