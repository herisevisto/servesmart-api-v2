import express from "express";

import { createMatch, createLineup, createStatsEntry, addActionLog, finalizeSet, 
    updateEndActionLog, delActionLog, updateEfficiencyFieldLog, finalizeMatch, 
    calculateZoneEfficiency, getTeams, getSets, getCoaches } 
    from "../controllers/game.ctrl.js"; // add functions from ctrl
import { fetchGameState, fetchMatchesForCoach, fetchResumableMatches, saveOrUpdateGameState } from "../controllers/gameState.ctrl.js";

const router = express.Router();

router.post("/createMatch", createMatch);

router.post("/createLineup", createLineup);

router.post("/createStatsEntry", createStatsEntry);

router.post("/addActionLog", addActionLog);
router.put("/updateEfficiencyFieldLog", updateEfficiencyFieldLog);
router.put("/updateEndActionLog", updateEndActionLog);
router.delete("/delActionLog", delActionLog);

router.get("/getTeams", getTeams)

router.post("/finalizeSet", finalizeSet);
router.post("/finalizeMatch", finalizeMatch);
router.post("/calculateZoneEfficiency", calculateZoneEfficiency);

router.get("/getSets", getSets);
router.get("/getCoaches", getCoaches);

router.post('/gamestate/save', saveOrUpdateGameState)
router.get('/gamestate/fetch/:matchNo', fetchGameState)
router.get('/coach-matches/:userId', fetchMatchesForCoach)
router.get('/resumable-matches/:userId', fetchResumableMatches)

// add functions

export default router;