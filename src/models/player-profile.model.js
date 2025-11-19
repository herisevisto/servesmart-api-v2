import mongoose from "mongoose";

const PlayerProfileSchema = new mongoose.Schema({
  entity_type: { type: String, enum: ["athlete", "tryout"], required: true },
  entity_id:   { type: Number, required: true },
  height:  { type: String, default: null },
  weight:  { type: String, default: null },
  handed:  { type: String, default: null },
  status:  { type: String, default: "Active" },
  season:  { type: String, default: null },
  contact: { type: String, default: null },
  email:   { type: String, default: null },
  captaincy: { type: String, enum: ["None", "Captain", "Co-Captain"], default: "None" },
}, {collection: "player_profile", timestamps: true});

PlayerProfileSchema.index({ entity_type: 1, entity_id: 1 }, { unique: true });

export default mongoose.model("PlayerProfile", PlayerProfileSchema);
