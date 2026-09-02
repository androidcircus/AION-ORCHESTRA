import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { cmo } from "../lib/cmo";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const cmoStatus = cmo.getStatus();
  const data = HealthCheckResponse.parse({
    status: cmoStatus.status === "healthy" ? "ok" : "degraded"
  });
  res.json({
    ...data,
    cmo: cmoStatus
  });
});

router.post("/healthz", (req, res) => {
  const { action, report } = req.body;
  if (action === "diagnose" && report) {
    cmo.diagnose(new Error(report.error), `UI:${report.id}`, "medium");
  }
  res.status(202).send();
});

export default router;
