// models/practice-session.js
import mongoose from "mongoose";

const PracticeSessionSchema = new mongoose.Schema(
  {
    team: { type: String, required: true },      
    opponent: { type: String, default: null },   
    drills: { type: Array, default: [] },
    weightsPlan: { type: Array, default: [] },
    notes: { type: String, default: "" },
    started_at: { type: Date, default: Date.now },
    ended_at: { type: Date, default: null }
  },
  { timestamps: true, collection: "practice_sessions" }
);

export default mongoose.model("PracticeSession", PracticeSessionSchema);
