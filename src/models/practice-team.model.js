// models/practice-team.model.js
import mongoose from "mongoose";
import Athlete from "./athletes.model.js"; 

const { Schema } = mongoose;

const practiceRosterEntrySchema = new Schema(
  {
    athlete: { type: Schema.Types.ObjectId, ref: "Athlete", required: true },
    jersey_no: { type: Number, default: null, min: 0 }, 
    position: { type: String, enum: ["S", "OH", "OP", "OS", "MB", "L", ""], default: "" },
    display_name: { type: String, trim: true, default: null },
    status: { type: String, enum: ["Active", "Injured", "Inactive"], default: "Active" },
    added_at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const practiceTeamSchema = new Schema(
  {
    practice_team_id: { type: Number, unique: true, sparse: true },

    team_name: { type: String, required: true, trim: true },

    mode: { type: String, enum: ["practice"], default: "practice", required: true, immutable: true },

    team_ref: { type: Schema.Types.ObjectId, ref: "Team", required: true },

    official_team_name: { type: String, required: true, trim: true },

    affiliation: { type: String, trim: true, default: null },
    team_id: { type: Number, default: null },

    roster: {
      type: [practiceRosterEntrySchema],
      default: [],
      validate: {
        validator(arr) {
          const ids = arr.map((r) => String(r.athlete));
          return ids.length === new Set(ids).size; 
        },
        message: "Duplicate athlete found in the practice team roster.",
      },
    },

    notes: { type: String, trim: true, default: null },
  },
  { collection: "practice_teams", timestamps: true }
);

practiceTeamSchema.index(
  { _id: 1, "roster.athlete": 1 },
  { unique: true, sparse: true, partialFilterExpression: { "roster.athlete": { $exists: true } } }
);

async function hydrateRosterSnapshots(doc) {
  if (!doc?.roster?.length) return;

  const needs = doc.roster
    .map((r, idx) => ({ r, idx }))
    .filter(({ r }) => !r.display_name || !r.position);

  if (!needs.length) return;

  const ids = needs.map(({ r }) => r.athlete);
  const athletes = await Athlete.find({ _id: { $in: ids } })
    .select("first_name last_name position")
    .lean();

  const byId = new Map(athletes.map((a) => [String(a._id), a]));

  for (const { r } of needs) {
    const a = byId.get(String(r.athlete));
    if (!a) continue;
    if (!r.display_name) r.display_name = `${a.first_name} ${a.last_name}`.trim();
    if (!r.position) r.position = a.position || "";
  }
}

practiceTeamSchema.pre("save", async function () {
  await hydrateRosterSnapshots(this);
});

practiceTeamSchema.pre("findOneAndUpdate", async function () {
  const update = this.getUpdate() || {};

  const newRoster =
    update.roster ??
    (update.$set && update.$set.roster) ??
    null;

  if (!newRoster) return;

  const doc = { roster: newRoster };
  await hydrateRosterSnapshots(doc);

  if (update.roster) update.roster = doc.roster;
  if (update.$set && update.$set.roster) update.$set.roster = doc.roster;
});

practiceTeamSchema.statics.refreshSnapshots = async function (practiceTeamId) {
  const doc = await this.findById(practiceTeamId);
  if (!doc) return null;
  await hydrateRosterSnapshots(doc);
  await doc.save();
  return doc;
};

export default mongoose.model("PracticeTeam", practiceTeamSchema);
