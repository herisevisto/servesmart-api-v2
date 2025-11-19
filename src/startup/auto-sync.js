// src/startup/auto-sync.js
import StatsEntry from "../models/event-info.model.js";
import { updatePlayerReportsFromEvents } from "../controllers/reports/player.ctrl.js";
import { updateTeamReportsFromPlayers } from "../controllers/reports/team.ctrl.js";

export const runAutoSyncOnStartup = async () => {
  try {
    console.log(" [AUTO-SYNC] Starting full report synchronization from event_info...");

    // Get distinct matches
    const matches = await StatsEntry.distinct("match_no");
    if (!matches.length) {
      console.log("⚠️ [AUTO-SYNC] No match data found in event_info. Skipping.\n");
      return;
    }

    // Loop over all matches
    for (const matchNo of matches) {
      const teamIds = await StatsEntry.find({ match_no: matchNo }).distinct("team_id");
      console.log(`🔹 [AUTO-SYNC] Processing match ${matchNo} (${teamIds.length} teams)...`);

      for (const teamId of teamIds) {
        // Fake req/res objects for calling controllers directly
        const req = { params: { matchNo }, query: { team_id: teamId } };
        const res = {
          json: (msg) => console.log(` [AUTO-SYNC] Player sync → ${msg.match_no ? `Match ${msg.match_no},` : ""} Team ${teamId}`),
          status: () => ({
            json: (err) => console.error(" [AUTO-SYNC ERROR]", err),
          }),
        };

        // Update player reports from event_info
        await updatePlayerReportsFromEvents(req, res);

        // Then update team reports from player_reports
        const resTeam = {
          json: (msg) =>
            console.log(`[AUTO-SYNC] Team report updated → Match ${matchNo}, Team ${teamId} (${msg.team_name || "Unknown Team"})`),
          status: () => ({
            json: (err) => console.error(" [AUTO-SYNC TEAM ERROR]", err),
          }),
        };

        await updateTeamReportsFromPlayers(req, resTeam);
      }
    }

    console.log("[AUTO-SYNC] Player & Team reports are fully synchronized.\n");
  } catch (err) {
    console.error("[AUTO-SYNC] Failed:", err.message);
  }
};
