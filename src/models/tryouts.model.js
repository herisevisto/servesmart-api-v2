import mongoose from "mongoose";

const tryoutSchema = new mongoose.Schema({
  tryout_id:     { type: Number, required: true, unique: true },
  user_id:       { type: Number, default: null },
  last_name:     { type: String, required: true, trim: true },
  first_name:    { type: String, required: true, trim: true },
  team:          { type: String, default: "" },
  affiliation:   { type: String, default: "dls"},
  position_pref: { type: String, enum: ["S", "OH", "OP", "OS", "MB", "L", ""], default: ""},// SETTER, OUTSIDE HITTER, OPPOSITE HITTER, OUTSIDE SPIKER, MIDDLE BLOCKER, LIBERO
  tryout_status: { type: String, enum: ["Draft", "Selected", "Rejected"], default: "Draft" },
  date_joined:   { type: Date, default: Date.now },
  age:           { type: Number, required: true, min: 0 },
  email:  { type: String, required: true, lowercase: true, trim: true },
  phone:  { type: String, required: true, trim: true },
  height: { type: Number, required: true, min: 0 },
  weight: { type: Number, required: true, min: 0 },
  handed: { type: String, required: true, trim: true },
  season: { type: Number, required: true, min: 0 },
  team_id: { type: Number, required: null},
  gender: { type: String, enum: ["M", "F"], required: true },
}, { collection: "tryouts" });

export default mongoose.model("Tryout", tryoutSchema);
