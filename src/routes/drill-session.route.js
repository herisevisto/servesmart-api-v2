import express from "express";
import {
  createDrillSession,
  getDrillSessionsByTeam,
} from "../controllers/drillsession.ctrl.js";

const router = express.Router();

// POST /api/drill-sessions
router.post("/", createDrillSession);

// GET /api/drill-sessions/:team
router.get("/:team", getDrillSessionsByTeam);

export default router;
