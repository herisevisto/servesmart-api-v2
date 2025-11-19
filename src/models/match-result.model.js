import mongoose from "mongoose";

const { Schema } = mongoose;

const SetScoreSchema = new Schema(
  {
    home_points: { type: Number, required: true, min: 0 },
    guest_points: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const MatchResultSchema = new Schema(
  {
    team: { type: String, required: true, trim: true, lowercase: true },
    opponent: { type: String, required: true, trim: true, lowercase: true },
    competition: { type: String, required: true, trim: true },
    match_id: { type: Number, required: true },

    result_sets: {
      type: String,
      required: true,
      match: /^\d+-\d+$/,
    },

    wl: {
      type: String,
      required: true,
      enum: ["W", "L", "D"], 
    },

    set_scores: {type: [SetScoreSchema],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "set_scores must include at least one set.",
      },
    },

    season: { type: Number, required: true, min: 1 },
  },
  {
    collection: "match_results",
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

MatchResultSchema.index({ team: 1, season: 1 });
MatchResultSchema.index({ team: 1, match_id: 1 }, { unique: true });

MatchResultSchema.virtual("sets_won").get(function () {
  const [won] = String(this.result_sets || "0-0").split("-").map(Number);
  return Number.isFinite(won) ? won : 0;
});

MatchResultSchema.virtual("sets_lost").get(function () {
  const [, lost] = String(this.result_sets || "0-0").split("-").map(Number);
  return Number.isFinite(lost) ? lost : 0;
});

MatchResultSchema.virtual("total_home_points").get(function () {
  return (this.set_scores || []).reduce((sum, s) => sum + (s.home_points || 0), 0);
});

MatchResultSchema.virtual("total_guest_points").get(function () {
  return (this.set_scores || []).reduce((sum, s) => sum + (s.guest_points || 0), 0);
});

const MatchResult = mongoose.models.MatchResult || mongoose.model("MatchResult", MatchResultSchema);
export default MatchResult;
