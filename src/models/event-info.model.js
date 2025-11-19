// models/event-info.model.js
import mongoose from "mongoose";
import PlayerReport from "./player-reports.model.js";
import Athlete from "./athletes.model.js";
import { computeEfficiencies } from "../controllers/reports/player.ctrl.js";

// =============================================================
// Schema Definition
// =============================================================
const statEntrySchema = new mongoose.Schema({
  match_no: { type: Number, required: true },
  set_no: { type: Number, default: 1 },
  rally_no: { type: Number, required: true },
  sequence_no: { type: Number, required: true },
  jersey_no: { type: Number, required: true },
  rotation: { type: Number, enum: [1, 2, 3, 4, 5, 6], default: null },
  playing_zone: { type: Number, enum: [1, 2, 3, 4, 5, 6], default: null },
  target_zone: { type: Number, enum: [1, 2, 3, 4, 5, 6], default: null },
  action: { type: String, enum: ["serve", "receive", "set", "spike", "dig", "block"], required: true },
  outcome: { type: String, enum: ["ace", "error", "point", "tool", "block", "bop", "kill"], default: null },
  team_id: { type: Number, required: true },
  team: { type: String, required: true },
  gender: { type: String, enum: ["M", "F"], default: null },
  timestamp: { type: Date, default: Date.now }
}, { collection: "event_info" });

// =============================================================
// Helper: Aggregate Stats for One Match + Team
// =============================================================
async function aggregatePlayerStats(matchNo, teamId) {
  const events = await StatsEntry.find({ match_no: matchNo, team_id: teamId });
  if (!events.length) return {};

  const grouped = {};
  for (const ev of events) {
    const { jersey_no, action, outcome, set_no } = ev;
    if (!jersey_no) continue;

    if (!grouped[jersey_no]) {
      grouped[jersey_no] = {
        __setNos: new Set(), // 👈 track unique set numbers per player
        serve: { aces: 0, faults: 0, serve_hits: 0, total_attempts: 0 },
        attack: { spikes: 0, faults: 0, shots: 0, total_attempts: 0 },
        digs: { digs: 0, faults: 0, receptions: 0, total_attempts: 0 },
        block: { kill_blocks: 0, faults: 0, rebounds: 0, total_attempts: 0 },
        set: { running_sets: 0, faults: 0, still_sets: 0, total_attempts: 0 },
        reception: { excellents: 0, faults: 0, serve_receptions: 0, total_attempts: 0 },
      };
    }

    const stats = grouped[jersey_no];

    // 👇 collect unique set_no where the player had at least one event
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

  return grouped;
}

// =============================================================
// Shared Sync Logic
// =============================================================
async function syncPlayerReports(matchNo, teamId) {
  const grouped = await aggregatePlayerStats(matchNo, teamId);
  let insertedCount = 0;

  for (const [jerseyNo, overall] of Object.entries(grouped)) {
    const athlete = await Athlete.findOne({ team_id: teamId, jersey_no: Number(jerseyNo) });
    if (!athlete) {
      console.warn(`⚠️ No athlete found for team ${teamId}, jersey ${jerseyNo}`);
      continue;
    }

    // Compute efficiencies & merge with counts
    const reportMock = { toObject: () => ({ overall: JSON.parse(JSON.stringify(overall)) }) };
    const withEff = computeEfficiencies(reportMock);

    const mergedOverall = {
      serve: { ...overall.serve, efficiency: withEff.overall.serve.efficiency },
      attack: { ...overall.attack, efficiency: withEff.overall.attack.efficiency },
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
          report_id: Date.now(),
          sets_played: overall.sets_played || 0, // 👈 persist sets played
          overall: mergedOverall,
        },
      },
      { upsert: true, new: true }
    );

    insertedCount++;
  }

  console.log(`✅ Synced ${insertedCount} player reports for match ${matchNo}, team ${teamId}`);
}

// =============================================================
// Hooks
// =============================================================

// single insert (live updates)
statEntrySchema.post("save", async function (doc) {
  await syncPlayerReports(doc.match_no, doc.team_id);
});

// bulk insert (e.g. upload/import)
statEntrySchema.post("insertMany", async function (docs) {
  const uniquePairs = new Set(docs.map(d => `${d.match_no}-${d.team_id}`));
  for (const pair of uniquePairs) {
    const [matchNo, teamId] = pair.split("-");
    await syncPlayerReports(Number(matchNo), Number(teamId));
  }
});

// =============================================================
// Export Model
// =============================================================
const StatsEntry = mongoose.model("StatsEntry", statEntrySchema);
export default StatsEntry;
