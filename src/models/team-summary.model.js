import mongoose from "mongoose";

const { Schema } = mongoose;

const TeamSummarySchema = new Schema(
  {
    team: { type: String, required: true, trim: true, lowercase: true },
    competition: { type: String, required: true, trim: true },
    season: { type: String, required: true, trim: true },
    total_matches_played: { type: Number, required: true, min: 0 },

    sets_won: { type: Number, required: true, min: 0 },
    sets_lost: { type: Number, required: true, min: 0 },

    points_scored: { type: Number, required: true, min: 0 },
    points_allowed: { type: Number, required: true, min: 0 },

    matches_won: { type: Number, required: true, min: 0 },
    matches_lost: { type: Number, required: true, min: 0 },
  },
  {
    collection: "team_summary",
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

TeamSummarySchema.index({ team: 1, competition: 1, season: 1 }, { unique: true });

TeamSummarySchema.virtual("season_no").get(function () {
  const m = String(this.season || "").match(/\d+/);
  return m ? Number(m[0]) : null;
});

TeamSummarySchema.virtual("win_pct").get(function () {
  const total = Number(this.total_matches_played || 0);
  const won = Number(this.matches_won || 0);
  return total > 0 ? won / total : 0;
});

TeamSummarySchema.virtual("points_diff").get(function () {
  return Number(this.points_scored || 0) - Number(this.points_allowed || 0);
});

TeamSummarySchema.virtual("sets_diff").get(function () {
  return Number(this.sets_won || 0) - Number(this.sets_lost || 0);
});

const TeamSummary =
  mongoose.models.TeamSummary ||
  mongoose.model("TeamSummary", TeamSummarySchema);

export default TeamSummary;
