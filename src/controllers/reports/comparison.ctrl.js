import TeamReport from "../../models/team-reports.model.js";
import PlayerReport from "../../models/player-reports.model.js";
import { computeEfficiencies as computeTeamEff } from "../reports/team.ctrl.js";
import { computeEfficiencies as computePlayerEff } from "../reports/player.ctrl.js";

/* ============================================================
   Compare TWO TEAMS
=============================================================== */
export const compareTeams = async (req, res) => {
  try {
    const { teamA, teamB, seasonA, seasonB, matchA, matchB } = req.query;

    if (!teamA || !teamB)
      return res.status(400).json({ message: "Missing team names." });

    const leftReport = await TeamReport.findOne({
      team: new RegExp(`^${teamA}$`, "i"),
      season_no: parseInt(seasonA, 10),
      game_no: parseInt(matchA, 10)
    });

    const rightReport = await TeamReport.findOne({
      team: new RegExp(`^${teamB}$`, "i"),
      season_no: parseInt(seasonB, 10),
      game_no: parseInt(matchB, 10)
    });

    if (!leftReport || !rightReport) {
      return res.status(404).json({
        message: "One or both team reports not found.",
        details: { leftFound: !!leftReport, rightFound: !!rightReport }
      });
    }

    const left = computeTeamEff(leftReport);
    const right = computeTeamEff(rightReport);

    const mapKeys = (data) => ({
      name: data.team,
      season: data.season_no,
      match: data.game_no,
      efficiency: parseFloat(data.overall.overall_efficiency) || 0,
      spike: {
        percentage: parseFloat(data.overall.attack.efficiency) || 0,
        spikes: data.overall.attack.spikes || 0,
        faults: data.overall.attack.faults || 0,
        shots: data.overall.attack.shots || 0,
        totalAttempts: data.overall.attack.total_attempts || 0
      },
      block: {
        percentage: parseFloat(data.overall.block.efficiency) || 0,
        killBlocks: data.overall.block.kill_blocks || 0,
        faults: data.overall.block.faults || 0,
        rebounds: data.overall.block.rebounds || 0,
        totalAttempts: data.overall.block.total_attempts || 0
      },
      serve: {
        percentage: parseFloat(data.overall.serve.efficiency) || 0,
        aces: data.overall.serve.aces || 0,
        faults: data.overall.serve.faults || 0,
        serveHits: data.overall.serve.serve_hits || 0,
        totalAttempts: data.overall.serve.total_attempts || 0
      },
      digs: {
        percentage: parseFloat(data.overall.digs.efficiency) || 0,
        digs: data.overall.digs.digs || 0,
        faults: data.overall.digs.faults || 0,
        receptions: data.overall.digs.receptions || 0,
        totalAttempts: data.overall.digs.total_attempts || 0
      },
      sets: {
        percentage: parseFloat(data.overall.set.efficiency) || 0,
        runningSets: data.overall.set.running_sets || 0,
        faults: data.overall.set.faults || 0,
        stillSets: data.overall.set.still_sets || 0,
        totalAttempts: data.overall.set.total_attempts || 0
      },
      reception: {
        percentage: parseFloat(data.overall.reception.efficiency) || 0,
        excellents: data.overall.reception.excellents || 0,
        faults: data.overall.reception.faults || 0,
        serveReceptions: data.overall.reception.serve_receptions || 0,
        totalAttempts: data.overall.reception.total_attempts || 0
      }
    });

    res.json({
      left: left ? mapKeys(left) : {},
      right: right ? mapKeys(right) : {}
    });


  } catch (err) {
    console.error(" compareTeams error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/* ============================================================
    Compare TWO PLAYERS
=============================================================== */
export const comparePlayers = async (req, res) => {
  try {
    const { playerA, playerB, seasonA, seasonB, matchA, matchB } = req.query;

    if (!playerA || !playerB)
      return res.status(400).json({ message: "Missing player names." });

    const leftReport = await PlayerReport.findOne({
      $or: [
        { $expr: { $regexMatch: { input: { $concat: ["$first_name", " ", "$last_name"] }, regex: playerA, options: "i" } } },
        { first_name: new RegExp(playerA.split(" ")[0], "i") },
        { last_name: new RegExp(playerA.split(" ")[0], "i") }
      ],
      season_no: parseInt(seasonA, 10),
      game_no: parseInt(matchA, 10)
    });

    const rightReport = await PlayerReport.findOne({
      $or: [
        { $expr: { $regexMatch: { input: { $concat: ["$first_name", " ", "$last_name"] }, regex: playerB, options: "i" } } },
        { first_name: new RegExp(playerB.split(" ")[0], "i") },
        { last_name: new RegExp(playerB.split(" ")[0], "i") }
      ],
      season_no: parseInt(seasonB, 10),
      game_no: parseInt(matchB, 10)
    });

    if (!leftReport || !rightReport) {
      return res.status(404).json({
        message: "One or both player reports not found.",
        details: { leftFound: !!leftReport, rightFound: !!rightReport }
      });
    }

    const left = computePlayerEff(leftReport);
    const right = computePlayerEff(rightReport);

    const mapPlayer = (data) => ({
      name: `${data.first_name} ${data.last_name}`,
      firstName: data.first_name,
      lastName: data.last_name,
      jerseyNo: data.jersey_no,
      position: data.position,
      season: data.season_no,
      match: data.game_no,
      efficiency: parseFloat(data.overall.overall_efficiency) || 0,
      spike: {
        percentage: parseFloat(data.overall.attack.efficiency) || 0,
        spikes: data.overall.attack.spikes || 0,
        faults: data.overall.attack.faults || 0,
        shots: data.overall.attack.shots || 0,
        totalAttempts: data.overall.attack.total_attempts || 0
      },
      block: {
        percentage: parseFloat(data.overall.block.efficiency) || 0,
        killBlocks: data.overall.block.kill_blocks || 0,
        faults: data.overall.block.faults || 0,
        rebounds: data.overall.block.rebounds || 0,
        totalAttempts: data.overall.block.total_attempts || 0
      },
      serve: {
        percentage: parseFloat(data.overall.serve.efficiency) || 0,
        aces: data.overall.serve.aces || 0,
        faults: data.overall.serve.faults || 0,
        serveHits: data.overall.serve.serve_hits || 0,
        totalAttempts: data.overall.serve.total_attempts || 0
      },
      digs: {
        percentage: parseFloat(data.overall.digs.efficiency) || 0,
        digs: data.overall.digs.digs || 0,
        faults: data.overall.digs.faults || 0,
        receptions: data.overall.digs.receptions || 0,
        totalAttempts: data.overall.digs.total_attempts || 0
      },
      sets: {
        percentage: parseFloat(data.overall.set.efficiency) || 0,
        runningSets: data.overall.set.running_sets || 0,
        faults: data.overall.set.faults || 0,
        stillSets: data.overall.set.still_sets || 0,
        totalAttempts: data.overall.set.total_attempts || 0
      },
      reception: {
        percentage: parseFloat(data.overall.reception.efficiency) || 0,
        excellents: data.overall.reception.excellents || 0,
        faults: data.overall.reception.faults || 0,
        serveReceptions: data.overall.reception.serve_receptions || 0,
        totalAttempts: data.overall.reception.total_attempts || 0
      }
    });

    res.json({
      left: left ? mapPlayer(left) : {},
      right: right ? mapPlayer(right) : {}
    });


  } catch (err) {
    console.error("comparePlayers error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
