// /src/models/player-season-stats.model.js
import mongoose from "mongoose";

const PlayerSeasonStatsSchema = new mongoose.Schema({
  entity_type: { type: String, enum: ["athlete", "tryout"], required: true },
  entity_id:   { type: Number, required: true },       // player_id or tryout_id
  season_key:  { type: String, required: true },       // e.g., "2025", "S4-2025", etc.

  // numbers the UI shows in SEASON TOTALS:
  matches:     { type: Number, default: 0 },
  sets:        { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 },
  kills:       { type: Number, default: 0 },
  aces:        { type: Number, default: 0 },
  blocks:      { type: Number, default: 0 },
  digs:        { type: Number, default: 0 },
  assists:     { type: Number, default: 0 },
}, { timestamps: true, collection: "player_season_stats" });

PlayerSeasonStatsSchema.index({ entity_type: 1, entity_id: 1, season_key: 1 }, { unique: true });

export default mongoose.model("PlayerSeasonStats", PlayerSeasonStatsSchema);
