import mongoose from "mongoose";

const athleteSchema = new mongoose.Schema({
    player_id:   { type: Number, required: true, unique: true },
    user_id:     { type: Number, default: null  }, 
    last_name:   { type: String, required: true, trim: true },
    first_name:  { type: String, required: true, trim: true },
    team:        { type: String, default: "dls" },
    position:    { type: String, enum: ["S", "OH", "OP", "OS", "MB", "L", ""], default: ""},// SETTER, OUTSIDE HITTER, OPPOSITE HITTER, OUTSIDE SPIKER, MIDDLE BLOCKER, LIBERO
    captaincy:   {type: String, enum: ["None", "Captain", "Co-Captain"], default: "None"},
    jersey_no:   { type: Number, default: null },
    height:      { type: Number, default: null },
    weight:      { type: Number, default: null },
    age:       { type: Number, default: null },
    status: { type: [String], enum: ["Active", "Playing", "Injured", "Inactive", "Released"], default: ["Active"] },
    date_joined: { type: Date, default: Date.now },
    gender: { type: String, enum: ["M", "F"], required: true },
    team_id: { type: Number, required: true},
}, { collection: "athletes" });

export default mongoose.model("Athlete", athleteSchema);