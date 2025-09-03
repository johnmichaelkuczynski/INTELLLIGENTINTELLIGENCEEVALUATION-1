import { Router } from "express";
import { assessFiction } from "../services/assessments/fiction";

export default Router()
  .get("/health", (_req, res) => res.json({ ok: true }))
  .post("/", async (req, res) => {
    try {
      const { text, preview } = req.body ?? {};
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "MISSING_TEXT" });
      }
      const out = await assessFiction({ text, provider: "zhi1", preview: !!preview });
      return res.status(200).json(out);
    } catch (err: any) {
      console.error("[FICTION] FAIL:", err);
      return res.status(500).json({
        error: "FICTION_ASSESSMENT_FAILED",
        detail: err?.message ?? String(err),
      });
    }
  });