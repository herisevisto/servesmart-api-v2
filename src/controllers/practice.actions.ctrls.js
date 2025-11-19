// controllers/practice.actions.ctrl.js
import PracActionLog from "../models/prac-actionlog.js";
import PracticeSession from "../models/practice-session.js";

const toNum = (v) => (v === undefined || v === null ? undefined : Number(v));

/**
 * Ensure the provided team belongs to the session (either session.team or session.opponent)
 */
async function validateTeamAgainstSession(session_id, team) {
  const sess = await PracticeSession.findById(session_id);
  if (!sess) throw new Error("Practice session not found");
  const allowed = [sess.team, sess.opponent].filter(Boolean);
  if (!allowed.includes(team)) {
    throw new Error(
      `Invalid team "${team}". Must be one of: ${allowed.join(", ")}`
    );
  }
  return true;
}

/**
 * Create an action log
 */
export const addPracActionLog = async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.session_id || !body.team) {
      return res
        .status(400)
        .json({ success: false, message: "session_id and team are required" });
    }
    await validateTeamAgainstSession(body.session_id, body.team);

    const log = await PracActionLog.create(body);
    return res.json({ success: true, data: log });
  } catch (err) {
    console.error("addPracActionLog error:", err);
    return res
      .status(500)
      .json({
        success: false,
        message: err.message || "Server error adding prac action log",
      });
  }
};

/**
 * Update end-of-action fields: outcome, target_zone (optional)
 * Now includes team in the filter so it hits the correct side.
 */
export const updateEndPracActionLog = async (req, res) => {
  try {
    const {
      session_id,
      set_no,
      rally_no,
      sequence_no,
      team,
      outcome,
      target_zone,
    } = req.body;

    console.log("updateEndPracActionLog body:", req.body);

    if (!session_id || typeof team === "undefined") {
      return res
        .status(400)
        .json({ success: false, message: "session_id and team are required" });
    }
    await validateTeamAgainstSession(session_id, team);

    const filter = {
      session_id,
      team,
      set_no: toNum(set_no),
      rally_no: toNum(rally_no),
      sequence_no: toNum(sequence_no),
    };

    const $set = { outcome };
    if (typeof target_zone !== "undefined") {
      $set.target_zone = toNum(target_zone);
    }

    const log = await PracActionLog.findOneAndUpdate(
      filter,
      { $set },
      { new: true }
    );

    if (!log) {
      console.warn("updateEndPracActionLog: no document matched", {
        filter,
        $set,
      });
      return res
        .status(404)
        .json({ success: false, message: "Action log not found" });
    }

    return res.json({ success: true, data: log });
  } catch (err) {
    console.error("updateEndPracActionLog error:", err);
    return res
      .status(500)
      .json({
        success: false,
        message: err.message || "Server error updating outcome",
      });
  }
};

/**
 * Update efficiency_field (per action)
 * Now includes team in the filter so it hits the correct side.
 */
export const updateEfficiencyFieldPracLog = async (req, res) => {
  try {
    const {
      session_id,
      set_no,
      rally_no,
      sequence_no,
      team,
      efficiency_field,
    } = req.body;

    if (!session_id || typeof team === "undefined") {
      return res
        .status(400)
        .json({ success: false, message: "session_id and team are required" });
    }
    await validateTeamAgainstSession(session_id, team);

    const filter = {
      session_id,
      team,
      set_no: toNum(set_no),
      rally_no: toNum(rally_no),
      sequence_no: toNum(sequence_no),
    };

    const log = await PracActionLog.findOneAndUpdate(
      filter,
      { $set: { efficiency_field } },
      { new: true }
    );

    if (!log) {
      console.warn("updateEfficiencyFieldPracLog: no document matched", {
        filter,
        efficiency_field,
      });
      return res
        .status(404)
        .json({ success: false, message: "Action log not found" });
    }
    return res.json({ success: true, data: log });
  } catch (err) {
    console.error("updateEfficiencyFieldPracLog error:", err);
    return res
      .status(500)
      .json({
        success: false,
        message:
          err.message || "Server error updating efficiency field",
      });
  }
};

/**
 * Commit a set (affects both teams' logs in that set)
 */
export const commitPracSet = async (req, res) => {
  try {
    const { session_id, set_no } = req.body;
    if (!session_id || typeof set_no === "undefined") {
      return res.status(400).json({
        success: false,
        message: "session_id and set_no are required",
      });
    }
    const filter = { session_id, set_no: toNum(set_no) };
    const update = { $set: { committed: true, committed_at: new Date() } };

    const result = await PracActionLog.updateMany(filter, update);
    return res.json({
      success: true,
      message: "Practice set committed",
      matched: result.matchedCount ?? result.nMatched,
      modified: result.modifiedCount ?? result.nModified,
    });
  } catch (err) {
    console.error("commitPracSet error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error committing set",
    });
  }
};

/**
 * Delete a specific action log
 * Now includes team in the filter so it deletes the correct side.
 */
export const delPracActionLog = async (req, res) => {
  try {
    const { session_id, set_no, rally_no, sequence_no, team } = req.body;

    if (!session_id || typeof team === "undefined") {
      return res
        .status(400)
        .json({ success: false, message: "session_id and team are required" });
    }
    await validateTeamAgainstSession(session_id, team);

    const filter = {
      session_id,
      team,
      set_no: toNum(set_no),
      rally_no: toNum(rally_no),
      sequence_no: toNum(sequence_no),
    };

    const del = await PracActionLog.findOneAndDelete(filter);
    return res.json({ success: true, data: del });
  } catch (err) {
    console.error("delPracActionLog error:", err);
    return res
      .status(500)
      .json({
        success: false,
        message: err.message || "Server error deleting prac action log",
      });
  }
};

/**
 * Finalize a set (affects both teams in that set)
 */
export const finalizePracSet = async (req, res) => {
  try {
    const { session_id, set_no, winning_team } = req.body;
    await PracActionLog.updateMany(
      { session_id, set_no: toNum(set_no) },
      { $set: { winning_team } }
    );
    return res.json({ success: true, message: "Practice set finalized" });
  } catch (err) {
    console.error("finalizePracSet error:", err);
    return res
      .status(500)
      .json({
        success: false,
        message: err.message || "Server error finalizing set",
      });
  }
};

/**
 * Finalize the practice session (end timestamp)
 */
export const finalizePracticeSession = async (req, res) => {
  try {
    const { session_id } = req.body;
    const updated = await PracticeSession.findByIdAndUpdate(
      session_id,
      { $set: { ended_at: new Date() } },
      { new: true }
    );
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("finalizePracticeSession error:", err);
    return res
      .status(500)
      .json({
        success: false,
        message: err.message || "Server error finalizing session",
      });
  }
};
