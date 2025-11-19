// models/prac-actionlog.js
import mongoose from "mongoose";

const PracActionLogSchema = new mongoose.Schema(
  {
    session_id: { type: mongoose.Schema.Types.ObjectId, ref: "PracticeSession", required: true },
    set_no: { type: Number, required: true },
    rally_no: { type: Number, required: true },
    sequence_no: { type: Number, required: true },

    team: { type: String, required: true },          // e.g., 'dls', 'ust'
    jersey_no: { type: Number, required: true },
    rotation: { type: Number, required: true },      // 1..6
    playing_zone: { type: Number, default: null },   // 1..6 or null
    action: { type: String, required: true },        // 'serve','receive','set','spike','dig','block'
    target_zone: { type: Number, default: null },

    outcome: { type: String, default: "bop" },       // 'bop','error','ace','kill','tool'
    efficiency_field: { type: String, default: null },// 'ace','faults','spikes','shots','...'
    winning_team: { type: String, default: null },   // set-level winner at the moment of finalize

    timestamp: { type: Date, default: Date.now }
  },
  { timestamps: true, collection: "prac_actionlogs" }
);

export default mongoose.model("PracActionLog", PracActionLogSchema);
