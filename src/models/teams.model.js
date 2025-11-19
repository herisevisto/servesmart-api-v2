import mongoose from "mongoose";

const teamSchema = new mongoose.Schema({
  team_id: { type: Number, required: true, unique: true },
  mode: { type: String, enum: ["game", "practice"], required: true },
  affiliation: { type: String, required: true },
  name: { type: String, required: true },
  captain: { type: String, default: null },
  co_captain: { type: String, default: null },
  gender: { type: String, enum: ["M", "F"], required: true }, 
  notes: { type: String, default: "" },
}, { collection: "teams" });

export default mongoose.model("Team", teamSchema);


