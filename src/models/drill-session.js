import mongoose from "mongoose";

const DrillChecklistItemSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    done: { type: Boolean, default: false },
  },
  { _id: false }
);

const DrillEntrySchema = new mongoose.Schema(
  {
    drillId: { type: String },
    name: { type: String, required: true },
    type: { type: String },
    durationSecs: { type: Number },
    notes: { type: String, default: "" },
    checklist: [DrillChecklistItemSchema],
  },
  { _id: false }
);

const DrillSessionSchema = new mongoose.Schema({
  team: { type: String, required: true },
  drills: [DrillEntrySchema],
  createdAt: { type: Date, default: Date.now },
});

const DrillSession = mongoose.model("DrillSession", DrillSessionSchema);

export default DrillSession;
