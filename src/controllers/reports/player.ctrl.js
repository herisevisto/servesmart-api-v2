// controllers/reports/player.ctrl.js
import mongoose from "mongoose";
import PlayerReport from "../../models/player-reports.model.js";
import StatsEntry from "../../models/event-info.model.js";
import Athlete from "../../models/athletes.model.js";

// =============================================================
//  Base efficiency helpers
// =============================================================
const calcEff = (num = 0, den = 0) =>
  den > 0 ? Number(((num / den) * 100).toFixed(1)) : 0;

export const computeEfficiencies = (report) => {
  // support both mongoose docs (with toObject) and plain objects like your reportMock
  const base = typeof report.toObject === "function" ? report.toObject() : report;
  const overall = base.overall || {};

  const serve = overall.serve || {};
  const attack = overall.attack || {};
  const digs = overall.digs || {};
  const block = overall.block || {};
  const set = overall.set || {};
  const reception = overall.reception || {};

  const serveEff = calcEff(
    (((serve.aces || 0) + (serve.serve_hits || 0)) - (serve.faults || 0)),
    serve.total_attempts || 0
  );

  const spikeEff = calcEff(
    (((attack.spikes || 0) + (attack.shots || 0)) - (attack.faults || 0)),
    attack.total_attempts || 0
  );
  
  const digEff = calcEff(
    (((digs.digs || 0) + (digs.reception || 0)) - (digs.faults || 0)),
    digs.total_attempts || 0
  );

  const blockEff = calcEff(
   (((block.kill_blocks || 0) + (block.rebounds || 0)) - (block.faults || 0)),
    block.total_attempts || 0
  );

  const setEff = calcEff(
    (((set.running_sets || 0) + (set.still_sets || 0))- (set.faults || 0)),
    set.total_attempts || 0
  );

  const receptionEff = calcEff(
    (((reception.excellents || 0) + (reception.serve_receptions || 0)) - (reception.faults || 0)),
    reception.total_attempts || 0
  );

  const pointsScored =
    (attack.spikes || 0) +
    (attack.shots || 0) +
    (serve.aces || 0) +
    (serve.serve_hits || 0) +
    (block.kill_blocks || 0) +
    (block.rebounds || 0) +
    (set.running_sets || 0) +
    (set.still_sets || 0) +
    (digs.digs || 0) +
    (digs.reception || 0) +
    (reception.excellents || 0) +
    (reception.serve_receptions || 0);

  const errors =
    (attack.faults || 0) +
    (serve.faults || 0) +
    (block.faults || 0) +
    (digs.faults || 0) +
    (set.faults || 0) +
    (reception.faults || 0);

  const totalAttempts =
    (attack.total_attempts || 0) +
    (serve.total_attempts || 0) +
    (digs.total_attempts || 0) +
    (set.total_attempts || 0) +
    (reception.total_attempts || 0) +
    (block.total_attempts || 0);

  const overallEff = calcEff(pointsScored - errors, totalAttempts);

  return {
    ...base,
    overall: {
      ...overall,
      serve: { ...serve, efficiency: serveEff },
      attack: { ...attack, efficiency: spikeEff },
      digs: { ...digs, efficiency: digEff },
      block: { ...block, efficiency: blockEff },
      set: { ...set, efficiency: setEff },
      reception: { ...reception, efficiency: receptionEff },
      overall_efficiency: overallEff,
    },
  };
};

// =============================================================
//  GET all player reports
// =============================================================
export const getPlayerReports = async (req, res) => {
  try {
    const reports = await PlayerReport.find({
      jersey_no: { $exists: true, $ne: null },
      report_id: { $exists: true, $ne: null },
    }).sort({ report_id: -1 });

    if (!reports.length) return res.json([]);

    const withEff = reports.map((r) => computeEfficiencies(r));
    res.json(withEff);
  } catch (err) {
    console.error("getPlayerReports error:", err.message);
    res.status(500).json({ error: "Failed to fetch player reports." });
  }
};

// =============================================================
//  GET single player report
// =============================================================
export const getPlayerReportById = async (req, res) => {
  try {
    let reportId = req.params.reportId.trim();
    let report;

    if (mongoose.Types.ObjectId.isValid(reportId)) {
      report = await PlayerReport.findById(reportId);
    } else if (!isNaN(reportId)) {
      report = await PlayerReport.findOne({ report_id: Number(reportId) });
    }

    if (!report) return res.status(404).json({ error: "Player report not found" });

    res.json(computeEfficiencies(report));
  } catch (err) {
    console.error("getPlayerReportById error:", err.message);
    res.status(400).json({ error: "Invalid reportId" });
  }
};

// =============================================================
// PATCH update notes
// =============================================================
export const updatePlayerReportNotes = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      return res.status(400).json({ error: "Invalid reportId" });
    }

    const updatedReport = await PlayerReport.findByIdAndUpdate(
      reportId,
      { $set: { notes: notes || "" } },
      { new: true, runValidators: true }
    );

    if (!updatedReport) return res.status(404).json({ error: "Player report not found" });

    res.json({
      message: "Notes updated successfully",
      report: updatedReport,
    });
  } catch (err) {
    console.error("updatePlayerReportNotes error:", err.message);
    res.status(500).json({ error: "Failed to update notes" });
  }
};

// =============================================================
//  PATCH: Update player reports from event-info
// =============================================================
export const updatePlayerReportsFromEvents = async (req, res) => {
  try {
    const matchNo = Number(req.params.matchNo);
    const teamId = Number(req.query.team_id);

    if (!matchNo || !teamId)
      return res.status(400).json({ error: "Missing matchNo or team_id parameter." });

    const events = await StatsEntry.find({ match_no: matchNo, team_id: teamId });
    if (!events.length)
      return res.json({ message: "No event data found for this match/team." });

    const grouped = {};
    for (const ev of events) {
      const { jersey_no, action, outcome, set_no } = ev;
      if (!jersey_no) continue;
      if (!grouped[jersey_no]) {
        grouped[jersey_no] = {
          __setNos: new Set(), // 👈 track unique sets here as well
          serve: { aces: 0, faults: 0, serve_hits: 0, total_attempts: 0 },
          attack: { spikes: 0, faults: 0, shots: 0, total_attempts: 0 },
          digs: { digs: 0, faults: 0, receptions: 0, total_attempts: 0 },
          block: { kill_blocks: 0, faults: 0, rebounds: 0, total_attempts: 0 },
          set: { running_sets: 0, faults: 0, still_sets: 0, total_attempts: 0 },
          reception: { excellents: 0, faults: 0, serve_receptions: 0, total_attempts: 0 },
        };
      }

      const stats = grouped[jersey_no];

      if (set_no != null) stats.__setNos.add(Number(set_no) || 0);

      switch (action) {
        case "serve":
          stats.serve.total_attempts++;
          if (outcome === "ace") stats.serve.aces++;
          else if (outcome === "error") stats.serve.faults++;
          else stats.serve.serve_hits++;
          break;
        case "spike":
          stats.attack.total_attempts++;
          if (outcome === "kill") stats.attack.spikes++;
          else if (outcome === "error") stats.attack.faults++;
          else stats.attack.shots++;
          break;
        case "dig":
          stats.digs.total_attempts++;
          if (outcome === "kill") stats.digs.digs++;
          else if (outcome === "error") stats.digs.faults++;
          else stats.digs.receptions++;
          break;
        case "block":
          stats.block.total_attempts++;
          if (outcome === "kill") stats.block.kill_blocks++;
          else if (outcome === "error") stats.block.faults++;
          else stats.block.rebounds++;
          break;
        case "set":
          stats.set.total_attempts++;
          if (outcome === "kill") stats.set.running_sets++;
          else if (outcome === "error") stats.set.faults++;
          else stats.set.still_sets++;
          break;
        case "receive":
          stats.reception.total_attempts++;
          if (outcome === "kill") stats.reception.excellents++;
          else if (outcome === "error") stats.reception.faults++;
          else stats.reception.serve_receptions++;
          break;
      }
    }

    // finalize sets_played
    for (const j of Object.keys(grouped)) {
      grouped[j].sets_played = grouped[j].__setNos.size;
      delete grouped[j].__setNos;
    }

    let inserted = 0;
    for (const [jerseyNo, overall] of Object.entries(grouped)) {
      const athlete = await Athlete.findOne({ team_id: teamId, jersey_no: Number(jerseyNo) });
      if (!athlete) {
        console.warn(` No athlete found for team ${teamId}, jersey ${jerseyNo}`);
        continue;
      }

      // Compute efficiency while preserving counts
      const reportMock = { toObject: () => ({ overall: JSON.parse(JSON.stringify(overall)) }) };
      const withEff = computeEfficiencies(reportMock);

      const mergedOverall = {
        serve: { ...overall.serve, efficiency: withEff.overall.serve.efficiency },
        attack: { ...overall.attack, efficiency: withEff.overall.attack.efficiency  },
        digs: { ...overall.digs, efficiency: withEff.overall.digs.efficiency },
        block: { ...overall.block, efficiency: withEff.overall.block.efficiency },
        set: { ...overall.set, efficiency: withEff.overall.set.efficiency },
        reception: { ...overall.reception, efficiency: withEff.overall.reception.efficiency },
        overall_efficiency: withEff.overall.overall_efficiency,
      };

      await PlayerReport.findOneAndUpdate(
        { game_no: matchNo, team_id: teamId, jersey_no: Number(jerseyNo) },
        {
          $set: {
            first_name: athlete.first_name,
            last_name: athlete.last_name,
            position: athlete.position,
            team_id: teamId,
            game_no: matchNo,
            season_no: athlete.season_no || 87,
            gender: athlete.gender,
            report_id: Date.now(),
            sets_played: overall.sets_played || 0, // 👈 persist sets played
            overall: mergedOverall,
          },
        },
        { upsert: true, new: true }
      );
      inserted++;
    }

    res.json({
      message: "Player reports inserted/updated successfully.",
      match_no: matchNo,
      team_id: teamId,
      inserted_count: inserted,
    });
  } catch (err) {
    console.error("updatePlayerReportsFromEvents error:", err);
    res.status(500).json({ error: err.message || "Failed to update player reports from event-info." });
  }
};
