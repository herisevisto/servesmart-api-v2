// models/player-reports.model.js
import mongoose from "mongoose";

const playerReportsSchema = new mongoose.Schema({
  report_id: { type: Number, required: true, unique: true },

  jersey_no: { type: Number, required: true },
  last_name: { type: String, required: true },
  first_name: { type: String, required: true },

  game_no: { type: Number, required: true },
  season_no: { type: Number, required: true },
  position: { type: String, required: true },
  gender: { type: String, enum: ["M", "F"], required: true },

  // 👇 Added field to persist total sets played for the match
  sets_played: { type: Number, min: 0, default: 0 },

  overall: {
    serve: {
      aces: { type: Number, min: 0, default: 0 },
      faults: { type: Number, min: 0, default: 0 },
      serve_hits: { type: Number, min: 0, default: 0 },
      total_attempts: { type: Number, min: 0, default: 0 },
      efficiency: { type: Number, min: 0, max: 100, default: 0 }
    },
    attack: {
      spikes: { type: Number, min: 0, default: 0 },
      faults: { type: Number, min: 0, default: 0 },
      shots: { type: Number, min: 0, default: 0 },
      total_attempts: { type: Number, min: 0, default: 0 },
      efficiency: { type: Number, min: 0, max: 100, default: 0 }
    },
    digs: {
      digs: { type: Number, min: 0, default: 0 },
      faults: { type: Number, min: 0, default: 0 },
      receptions: { type: Number, min: 0, default: 0 },
      total_attempts: { type: Number, min: 0, default: 0 },
      efficiency: { type: Number, min: 0, max: 100, default: 0 }
    },
    block: {
      kill_blocks: { type: Number, min: 0, default: 0 },
      faults: { type: Number, min: 0, default: 0 },
      rebounds: { type: Number, min: 0, default: 0 },
      total_attempts: { type: Number, min: 0, default: 0 },
      efficiency: { type: Number, min: 0, max: 100, default: 0 }
    },
    set: {
      running_sets: { type: Number, min: 0, default: 0 },
      faults: { type: Number, min: 0, default: 0 },
      still_sets: { type: Number, min: 0, default: 0 },
      total_attempts: { type: Number, min: 0, default: 0 },
      efficiency: { type: Number, min: 0, max: 100, default: 0 }
    },
    reception: {
      excellents: { type: Number, min: 0, default: 0 },
      faults: { type: Number, min: 0, default: 0 },
      serve_receptions: { type: Number, min: 0, default: 0 },
      total_attempts: { type: Number, min: 0, default: 0 },
      efficiency: { type: Number, min: 0, max: 100, default: 0 }
    },
    overall_efficiency: { type: Number, min: 0, max: 100, default: 0 }
  },

  notes: { type: String, default: "" },
  team_id: { type: Number, required: true }, 
}, { timestamps: true, collection: "player_report" });

export default mongoose.model("PlayerReport", playerReportsSchema);
