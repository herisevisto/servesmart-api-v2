import mongoose from "mongoose";

const assistantCoachSchema = new mongoose.Schema({
  asst_coach_id: { type: Number, required: true, unique: true },
  user_id:       { type: Number, default: null },
  last_name:     { type: String, required: true, trim: true },
  first_name:    { type: String, required: true, trim: true },
  affiliation: { type: [String], default: ["dls"] },
  teams_handled: { type: [String], default: ["Green Spikers"] },
  date_joined:   { type: Date, default: Date.now },
  team_id: { type: Number, required: true},
}, { collection: "asst_coaches" });

export default mongoose.model("AssistantCoach", assistantCoachSchema);
