import mongoose from "mongoose";
import TeamReport from "../../models/team-reports.model.js";
import PlayerReport from "../../models/player-reports.model.js";
import Team from "../../models/teams.model.js"; 

// =============================================================
// Helper to safely compute efficiency
// =============================================================
const calcEff = (num, den) => (den && den > 0 ? ((num / den) * 100).toFixed(1) : 0);

// =============================================================
// Compute efficiencies for a given team report
// =============================================================
export const computeEfficiencies = (report) => {
  const overall = report.overall || {};

  const serve = overall.serve || {};
  const attack = overall.attack || {};
  const digs = overall.digs || {};
  const block = overall.block || {};
  const set = overall.set || {};
  const reception = overall.reception || {};

  const serveEff = calcEff((((serve.aces || 0) + (serve.serve_hits || 0)) - (serve.faults || 0)), serve.total_attempts || 0);
  const spikeEff = calcEff((((attack.spikes || 0) + (attack.shots || 0)) - (attack.faults || 0)), attack.total_attempts || 0);
  const digEff = calcEff((((digs.digs || 0) + (digs.reception || 0)) - (digs.faults || 0)), digs.total_attempts || 0);
  const blockEff = calcEff((((block.kill_blocks || 0) + (block.rebounds || 0)) - (block.faults || 0)), block.total_attempts || 0);
  const setEff = calcEff((((set.running_sets || 0) + (set.still_sets || 0)) - (set.faults || 0)), set.total_attempts || 0);
  const receptionEff = calcEff((((reception.excellents || 0) + (reception.servereceptions || 0)) - (reception.faults || 0)), reception.total_attempts || 0);
  

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

// =============================================================
// GET all team reports
// =============================================================
// =============================================================
// GET all team reports
// =============================================================
export const getTeamReports = async (req, res) => {
  try {
    const allReports = await TeamReport.find({
      team_id: { $exists: true, $ne: null },
      game_no: { $exists: true, $ne: null },
      season_no: { $exists: true, $ne: null }
    }).sort({ game_no: -1, createdAt: -1 });

    if (!allReports.length) return res.json([]);

    // ✅ Collect all unique IDs and affiliations
    const teamIds = [...new Set(allReports.map(r => r.team_id))];
    const affiliations = [...new Set(allReports.map(r => r.team?.toLowerCase?.()))];

    // ✅ Fetch all teams in one go
    const teams = await Team.find({
      $or: [
        { team_id: { $in: teamIds } },
        { affiliation: { $in: affiliations } }
      ]
    });

    // ✅ Build lookup maps
    const teamById = {};
    const teamByAff = {};
    teams.forEach(t => {
      teamById[t.team_id] = t.gender;
      teamByAff[t.affiliation.toLowerCase()] = t.gender;
    });

    const maxGameNo = Math.max(...allReports.map(r => r.game_no));

    const formatted = allReports.map(r => {
      const withEff = computeEfficiencies(r);
      // ✅ Pick gender by ID first, fallback to affiliation
      const gender = teamById[r.team_id] || teamByAff[r.team?.toLowerCase()] || "U";

      return {
        ...withEff,
        gender, // ✅ Added gender here
        active: r.game_no === maxGameNo,
        logo: "/assets/icons/logo.png",
        title: "Men's Volleyball Team (MVT)",
        stats: {
          players: r.teamplayer_no,
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

// =============================================================
// GET single team report
// =============================================================
export const getTeamReportById = async (req, res) => {
  try {
    let reportId = req.params.reportId.trim();
    let report;

    if (mongoose.Types.ObjectId.isValid(reportId)) {
      report = await TeamReport.findById(reportId);
    } else if (!isNaN(reportId)) {
      report = await TeamReport.findOne({ report_id: Number(reportId) });
    }

    if (!report) return res.status(404).json({ error: "Team report not found" });

    const withEff = computeEfficiencies(report);
    res.json(withEff);
  } catch (err) {
    console.error("getTeamReportById error:", err.message);
    res.status(400).json({ error: "Invalid reportId" });
  }
};

// =============================================================
// PATCH - update notes
// =============================================================
export const updateTeamReportNotes = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { notes } = req.body;

    let updatedReport = null;

    if (mongoose.Types.ObjectId.isValid(reportId)) {
      updatedReport = await TeamReport.findByIdAndUpdate(
        reportId,
        { $set: { notes: notes || "" } },
        { new: true, runValidators: true }
      );
    } else if (!isNaN(reportId)) {
      updatedReport = await TeamReport.findOneAndUpdate(
        { report_id: Number(reportId) },
        { $set: { notes: notes || "" } },
        { new: true, runValidators: true }
      );
    }

    if (!updatedReport) {
      return res.status(404).json({ error: "Team report not found" });
    }

    res.json({
      message: "Notes updated successfully",
      report: updatedReport
    });
  } catch (err) {
    console.error("updateTeamReportNotes error:", err.message);
    res.status(500).json({ error: "Failed to update notes" });
  }
};

// =============================================================
// GET players under a specific team report
// =============================================================
export const getPlayersByTeamReportId = async (req, res) => {
  try {
    const { teamReportId } = req.params;

    let teamReport = null;

    if (mongoose.Types.ObjectId.isValid(teamReportId)) {
      teamReport = await TeamReport.findById(teamReportId);
    } else if (!isNaN(teamReportId)) {
      teamReport = await TeamReport.findOne({ report_id: Number(teamReportId) });
    }

    if (!teamReport) {
      return res.status(404).json({ error: "Team report not found" });
    }

    const players = await PlayerReport.find({ team_id: teamReport.team_id });

    if (!players.length) {
      return res.status(404).json({ error: "No players found for this team" });
    }

    res.json({ teamReport, players });
  } catch (err) {
    console.error("getPlayersByTeamReportId error:", err.message);
    res.status(500).json({ error: "Failed to fetch players for this team report." });
  }
};

// =============================================================
// AUTO BUILD TEAM REPORTS FROM PLAYER REPORTS
// =============================================================
export const updateTeamReportsFromPlayers = async (req, res) => {
  try {
    const matchNo = Number(req.params.matchNo);
    const teamId = Number(req.query.team_id);

    if (!matchNo || !teamId) {
      return res.status(400).json({ error: "Missing matchNo or team_id parameter." });
    }

    //  Get all player reports for this match/team
    const players = await PlayerReport.find({ game_no: matchNo, team_id: teamId });
    if (!players.length) {
      return res.json({ message: "No player reports found for this team/match." });
    }

    // Initialize totals
    const overall = {
      serve: { aces: 0, faults: 0, serve_hits: 0, total_attempts: 0 },
      attack: { spikes: 0, faults: 0, shots: 0, total_attempts: 0 },
      digs: { digs: 0, faults: 0, receptions: 0, total_attempts: 0 },
      block: { kill_blocks: 0, faults: 0, rebounds: 0, total_attempts: 0 },
      set: { running_sets: 0, faults: 0, still_sets: 0, total_attempts: 0 },
      reception: { excellents: 0, faults: 0, serve_receptions: 0, total_attempts: 0 },
    };

    //  Sum all player stats
    for (const p of players) {
      const stats = p.overall || {};
      for (const key in overall) {
        const cat = overall[key];
        const playerCat = stats[key] || {};
        for (const stat in cat) {
          cat[stat] += playerCat[stat] || 0;
        }
      }
    }

    //  Compute team-level efficiencies
    const serveEff = calcEff(((overall.serve.aces + overall.serve.serve_hits) - overall.serve.faults), overall.serve.total_attempts);
    const spikeEff = calcEff(((overall.attack.spikes + overall.attack.shots) - overall.attack.faults), overall.attack.total_attempts);
    const digEff = calcEff(((overall.digs.digs + overall.digs.receptions) - overall.digs.faults), overall.digs.total_attempts);
    const blockEff = calcEff(((overall.block.kill_blocks + overall.block.rebounds) - overall.block.fault), overall.block.total_attempts);
    const setEff = calcEff(((overall.set.running_sets + overall.set.still_sets) - overall.set.faults), overall.set.total_attempts);
    const receptionEff = calcEff(((overall.reception.excellents + overall.reception.serve_receptions) - overall.reception.faults), overall.reception.total_attempts);

    const pointsScored = overall.attack.spikes + overall.attack.shots + overall.serve.aces + overall.serve.serve_hits +
    overall.block.kill_blocks + overall.block.rebounds + overall.digs.digs + overall.digs.receptions +
    overall.set.running_sets + overall.set.still_sets + overall.reception.excellents + overall.reception.serve_receptions;
    const errors = overall.attack.faults + overall.serve.faults + overall.block.faults + overall.reception.faults 
    + overall.set.faults + overall.digs.faults;
    const totalAttempts = overall.attack.total_attempts + overall.serve.total_attempts + overall.reception.total_attempts
    + overall.block.total_attempts + overall.set.total_attempts + overall.digs.total_attempts;
    const overallEff = calcEff((pointsScored - errors), totalAttempts);

    overall.serve.efficiency = serveEff;
    overall.attack.efficiency = spikeEff;
    overall.digs.efficiency = digEff;
    overall.block.efficiency = blockEff;
    overall.set.efficiency = setEff;
    overall.reception.efficiency = receptionEff;
    overall.overall_efficiency = overallEff;
    
    // Find team name from Team collection
    let teamName = "Unknown Team";
    const teamDoc = await Team.findOne({ team_id: teamId });
    if (teamDoc && teamDoc.affiliation) {
      teamName = teamDoc.affiliation;
    }

    // Upsert team report
    await TeamReport.findOneAndUpdate(
      { game_no: matchNo, team_id: teamId },
      {
        $set: {
          team: teamName,
          team_id: teamId,
          game_no: matchNo,
          season_no: players[0].season_no || 87,
          teamplayer_no: players.length,
          overall,
          report_id: Date.now(),
        },
      },
      { upsert: true, new: true }
    );

    res.json({
      message: "Team report updated from player reports successfully.",
      match_no: matchNo,
      team_id: teamId,
      team_name: teamName,
      players: players.length,
    });
  } catch (err) {
    console.error("updateTeamReportsFromPlayers error:", err);
    res.status(500).json({ error: err.message || "Failed to update team report from player reports." });
  }
};

export const getSeasonTeamEfficiency = async (req, res) => {
  try {
    const { team_id, season_no } = req.query;

    if (!team_id || !season_no) {
      return res.status(400).json({ error: "Missing team_id or season_no parameter." });
    }

    const teamReports = await TeamReport.find({
      team_id: Number(team_id),
      season_no: Number(season_no)
    });

    if (!teamReports.length) {
      return res.status(404).json({ error: "No team reports found for this season." });
    }

    const aggregated = teamReports.reduce((acc, report) => {
      const eff = report.overall || {};
      return {
        overall: acc.overall + (eff.overall_efficiency || 0),
        serve: acc.serve + (eff.serve?.efficiency || 0),
        attack: acc.attack + (eff.attack?.efficiency || 0),
        digs: acc.digs + (eff.digs?.efficiency || 0),
        block: acc.block + (eff.block?.efficiency || 0),
        set: acc.set + (eff.set?.efficiency || 0),
        reception: acc.reception + (eff.reception?.efficiency || 0),
      };
    }, { 
      overall: 0, 
      serve: 0, 
      attack: 0, 
      digs: 0, 
      block: 0, 
      set: 0, 
      reception: 0 
    });

    const count = teamReports.length;
    const avgEfficiency = {
      overall: parseFloat((aggregated.overall / count).toFixed(1)),
      serve: parseFloat((aggregated.serve / count).toFixed(1)),
      spike: parseFloat((aggregated.attack / count).toFixed(1)),
      dig: parseFloat((aggregated.digs / count).toFixed(1)),
      block: parseFloat((aggregated.block / count).toFixed(1)),
      set: parseFloat((aggregated.set / count).toFixed(1)),
      reception: parseFloat((aggregated.reception / count).toFixed(1)),
      matchesIncluded: count,
    };

    res.json(avgEfficiency);
  } catch (err) {
    console.error("getSeasonTeamEfficiency error:", err);
    res.status(500).json({ error: "Failed to fetch season team efficiency." });
  }
};
