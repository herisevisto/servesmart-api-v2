import express from "express";
import {
  getMatchResults,
  upsertMatchResultsBulk,
  getTeamSummary,
  upsertTeamSummaryBulk,
  getStandings,
  getStandingForTeam 
} from "../controllers/results.ctrl.js";

const router = express.Router();

router.get("/match", getMatchResults);
router.post("/match/bulk", upsertMatchResultsBulk);

router.get("/summary", getTeamSummary);
router.post("/summary/bulk", upsertTeamSummaryBulk);

router.get("/standings", getStandings);
router.get("/standings/:team", getStandingForTeam);

export default router;
