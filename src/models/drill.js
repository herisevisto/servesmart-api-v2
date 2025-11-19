import mongoose from "mongoose";

const DrillChecklistItemSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    done: { type: Boolean, default: false },
  },
  { _id: false }
);

const DrillSchema = new mongoose.Schema({
  name:        { type: String, required: true }, // "Serve Target (Zoning)"
  type:        { type: String, default: "" },     // "Serve", "Spike", etc.
  defaultSecs: { type: Number, default: 120 },    // default timer length
  checklist:   { type: [DrillChecklistItemSchema], default: [] },
  
}, {
  timestamps: true, 
});

const Drill = mongoose.model("Drill", DrillSchema);

export default Drill;
