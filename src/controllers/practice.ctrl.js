// src/controllers/practice.ctrl.js
import * as gameCtrl from "./game.ctrl.js";
import PracticeSession from "../models/practice-session.js";

const withPractice = (fn) => (req, res, next) => {
  try {
    const body = (req.body && typeof req.body === "object") ? req.body : {};
    req.body = { ...body, mode: "practice" };
    return fn(req, res, next);
  } catch (err) {
    return next(err);
  }
};


export const createPracticeSession = async (req, res) => {
  try {
    const {
      team,
      opponent = null,
      drills = [], 
      notes = ""
    } = req.body || {};

    if (!team) {
      return res.status(400).json({ success: false, message: "team is required" });
    }

    const doc = await PracticeSession.create({
      team,
      opponent,
      drills,
      notes,
      started_at: new Date(),
      ended_at: null,
    });

    return res.json({ success: true, data: doc });
  } catch (err) {
    console.error("createPracticeSession error:", err);
    return res.status(500).json({ success: false, message: "Server error creating practice session" });
  }
};


export const getPracticeSessionsByTeam = async (req, res) => {
  try {
    const { team } = req.params;
    const sessions = await PracticeSession.find({ team }).sort({ createdAt: -1 });
    return res.json({ success: true, data: sessions });
  } catch (err) {
    console.error("getPracticeSessionsByTeam error:", err);
    return res.status(500).json({ success: false, message: "Server error fetching sessions" });
  }
};

export const createMatch               = withPractice(gameCtrl.createMatch);
export const createLineup              = gameCtrl.createLineup; // or wrap if you need separate practice lineups
export const createStatsEntry          = withPractice(gameCtrl.createStatsEntry);
export const addActionLog              = withPractice(gameCtrl.addActionLog);
export const updateEfficiencyFieldLog  = withPractice(gameCtrl.updateEfficiencyFieldLog);
export const updateEndActionLog        = withPractice(gameCtrl.updateEndActionLog);
export const delActionLog              = withPractice(gameCtrl.delActionLog);
export const finalizeSet               = withPractice(gameCtrl.finalizeSet);
export const finalizeMatch             = withPractice(gameCtrl.finalizeMatch);
export const calculateZoneEfficiency   = withPractice(gameCtrl.calculateZoneEfficiency);


export const ping = (_req, res) => res.json({ ok: true, mode: "practice" });
