import mongoose from "mongoose";
import TeamReport from "../../models/team-reports.model.js";

// helper to safely compute efficiency
const calcEff = (num, den) => (den && den > 0 ? ((num / den) * 100).toFixed(1) : 0);

// function to calculate all efficiencies
export const computeEfficiencies = (report) => {
  const overall = report.overall || {};

  const serve = overall.serve || {};
  const attack = overall.attack || {};
  const digs = overall.digs || {};
  const block = overall.block || {};
  const set = overall.set || {};
  const reception = overall.reception || {};

  // apply formulas
  const serveEff = calcEff((((serve.aces || 0) + (serve.serve_hits || 0)) - (serve.faults || 0)), serve.total_attempts || 0);
  const spikeEff = calcEff((((attack.spikes || 0) + (attack.shots || 0)) - (attack.faults || 0)), attack.total_attempts || 0);
  const digEff = calcEff((((digs.digs || 0) + (digs.reception || 0)) - (digs.faults || 0)), digs.total_attempts || 0);
  const blockEff = calcEff((((block.kill_blocks || 0) + (block.rebounds || 0)) - (block.faults || 0)), block.total_attempts || 0);
  const setEff = calcEff((((set.running_sets || 0) + (set.still_sets || 0)) - (set.faults || 0)), set.total_attempts || 0);
  const receptionEff = calcEff((((reception.excellents || 0) + (reception.serve_receptions || 0)) - (reception.faults || 0)), reception.total_attempts || 0);

  // points scored = spikes + aces + kill blocks
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
  // total errors = attack.faults + serve.faults + block.faults + reception.faults
  const errors =
    (attack.faults || 0) +
    (serve.faults || 0) +
    (block.faults || 0) +
    (digs.faults || 0) +
    (set.faults || 0) +
    (reception.faults || 0);
  // total attempts = attack + serve + reception + block
  const totalAttempts =
    (attack.total_attempts || 0) +
    (serve.total_attempts || 0) +
    (digs.total_attempts || 0) +
    (set.total_attempts || 0) +
    (reception.total_attempts || 0) +
    (block.total_attempts || 0);
  
  const overallEff = calcEff((pointsScored - errors), totalAttempts);

  return {
    ...report.toObject(),
    overall: {
      ...overall,
      serve: { ...serve, efficiency: serveEff },
      attack: { ...attack, efficiency: spikeEff },
      digs: { ...digs, efficiency: digEff },
      block: { ...block, efficiency: blockEff },
      set: { ...set, efficiency: setEff },
      reception: { ...reception, efficiency: receptionEff },
      overall_efficiency: overallEff
    }
  };
};

// GET all team reports
export const getTeamReports = async (req, res) => {
  try {
    const allReports = await TeamReport.find({
      team: { $exists: true, $ne: null },
      game_no: { $exists: true, $ne: null },
      season_no: { $exists: true, $ne: null }
    }).sort({ game_no: -1, createdAt: -1 });

    if (!allReports.length) return res.json([]);

    const maxGameNo = Math.max(...allReports.map(r => r.game_no));

    const formatted = allReports.map(r => {
      const withEff = computeEfficiencies(r);
      return {
        ...withEff,
        active: r.game_no === maxGameNo,
        logo: "/assets/icons/logo.png",
        title: "Men's Volleyball Team (MVT)",
        stats: {
          players: r.teamplayer_no, // TODO if player is available on db
          match: r.game_no,
          season: r.season_no
        }
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error("getTeamReports error:", err.message);
    res.status(500).json({ error: "Failed to fetch team reports." });
  }
};

// GET single team report
export const getTeamReportById = async (req, res) => {
  try {
    let reportId = req.params.reportId.trim();
    let report;

    if (mongoose.Types.ObjectId.isValid(reportId)) {
      report = await TeamReport.findById(reportId);
    } else if (!isNaN(reportId)) {
      report = await TeamReport.findOne({ game_no: Number(reportId) });
      if (!report) {
        report = await TeamReport.findOne({ report_id: Number(reportId) });
      }
    }

    if (!report) return res.status(404).json({ error: "Team report not found" });

    const withEff = computeEfficiencies(report);
    res.json(withEff);
  } catch (err) {
    console.error("getTeamReportById error:", err.message);
    res.status(400).json({ error: "Invalid ObjectId or game_no/report_id" });
  }
};

export const updateTeamReportNotes = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      return res.status(400).json({ error: "Invalid reportId" });
    }

    const updatedReport = await TeamReport.findByIdAndUpdate(
      reportId,
      { $set: { notes: notes || "" } }, 
      { new: true, runValidators: true }  
    );

    if (!updatedReport) {
      return res.status(404).json({ error: "Team report not found" });
    }

    res.json({
      message: "Notes updated successfully",
      report: updatedReport,
    });
  } catch (err) {
    console.error("updateTeamReportNotes error:", err.message);
    res.status(500).json({ error: "Failed to update notes" });
  }
};
