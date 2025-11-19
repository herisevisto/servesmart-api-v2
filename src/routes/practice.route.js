import express from "express";
import { createPracticeSession, getPracticeSessionsByTeam } from "../controllers/practice.ctrl.js";
import {
  addPracActionLog,
  updateEndPracActionLog,
  updateEfficiencyFieldPracLog,
  delPracActionLog,
  commitPracSet,          
  finalizePracSet,
  finalizePracticeSession
} from "../controllers/practice.actions.ctrls.js";

const router = express.Router();

// sessions
router.post("/createSession", createPracticeSession);
router.get("/sessions/:team", getPracticeSessionsByTeam);

// logs
router.post("/addActionLog", addPracActionLog);
router.put("/updateEndActionLog", updateEndPracActionLog);
router.put("/updateEfficiencyFieldLog", updateEfficiencyFieldPracLog);
router.delete("/delActionLog", delPracActionLog);

// set/match finalize
router.post("/commitSet", commitPracSet);      // <-- NEW
router.post("/finalizeSet", finalizePracSet);
router.post("/finalizeSession", finalizePracticeSession);

export default router;
