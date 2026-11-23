import express from "express";
import type { Request, Response, NextFunction } from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { createRateLimiter } from "./server/helpers.ts";
import {
  handleAnalyzeScript,
  handleGenerateAudio,
  handleGetCapabilities,
  handleVerifyAudio,
} from "./server/ttsHandlers.ts";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Security: limit JSON body size to 10 MB + per-IP rate limiting on /api
app.use(express.json({ limit: "10mb" }));
app.use("/api", createRateLimiter(40, 60_000));

// API routes (exact match with client src/services/studioApi.ts)
app.get("/api/capabilities", handleGetCapabilities);
app.post("/api/analyze-script", handleAnalyzeScript);
app.post("/api/generate-audio", handleGenerateAudio);
app.post("/api/verify-audio", handleVerifyAudio);

// Catch-all JSON 404 for unknown /api/* routes (never fall through to SPA HTML)
app.use("/api", (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Ruta de API no encontrada: ${req.method} ${req.originalUrl}`,
  });
});

async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global Express error handler: always return JSON, never HTML
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[Express global error]", err);
    if (res.headersSent) return;

    const rawStatus = Number(err?.status ?? err?.statusCode ?? 500);
    const status = rawStatus >= 400 && rawStatus < 600 ? rawStatus : 500;
    const isBadJson = err?.type === "entity.parse.failed";
    const isTooLarge = err?.type === "entity.too.large" || status === 413;

    const message = isTooLarge
      ? "La solicitud supera el tamaño máximo permitido (10 MB)."
      : isBadJson
      ? "El cuerpo JSON enviado no es válido."
      : err?.message || "Error interno del servidor.";

    res.status(status).json({
      success: false,
      error: message,
    });
  });
}

setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
