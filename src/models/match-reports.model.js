import mongoose from "mongoose";

const matchReportSchema = new mongoose.Schema({
    report_id: { type: Number, required: true, unique: true },

    game_no: { type: Number, required: true },
    season_no: { type: Number, required: true },

    teams: {
        home: { type: String, required: true },
        guest: { type: String, required: true }
    },

    set_scores: {
        type: [{
            set_no: { type: Number, required: true },
            home_points: { type: Number, min: 0, required: true },
            guest_points: { type: Number, min: 0, required: true }
        }],
        validate: [arr => arr.length <= 5, "A match can only have up to 5 sets."]
    },

    winner: { 
        type: String, 
        enum: ["home", "guest"], 
        required: true 
    }
}, { timestamps: true, collection: "match_report" });

export default mongoose.model("MatchReport", matchReportSchema);
