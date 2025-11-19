import mongoose from "mongoose";

const teamReportSchema = new mongoose.Schema({
    report_id: { type: Number, required: true, unique: true },

    team: { type: String, required: true },
    team_id: { type: Number, required: true },
    game_no: { type: Number, required: true },
    season_no: { type: Number, required: true },
    notes: { type: String, default: "" },
    teamplayer_no: { type: Number, required: true },

    overall: {
        serve: {
            aces: { type: Number, min: 0, default: 0 },
            faults: { type: Number, min: 0, default: 0 },
            serve_hits: { type: Number, min: 0, default: 0 },
            total_attempts: { type: Number, min: 0, default: 0 },
            efficiency: { type: Number, min: 0, max: 100, default: 0 }
        },

        attack: {
            spikes: { type: Number, min: 0, default: 0 },
            faults: { type: Number, min: 0, default: 0 },
            shots: { type: Number, min: 0, default: 0 },
            total_attempts: { type: Number, min: 0, default: 0 },
            efficiency: { type: Number, min: 0, max: 100, default: 0 }
        },

        digs: {
            digs: { type: Number, min: 0, default: 0 },
            faults: { type: Number, min: 0, default: 0 },
            receptions: { type: Number, min: 0, default: 0 },
            total_attempts: { type: Number, min: 0, default: 0 },
            efficiency: { type: Number, min: 0, max: 100, default: 0 }
        },

        block: {
            kill_blocks: { type: Number, min: 0, default: 0 },
            faults: { type: Number, min: 0, default: 0 },
            rebounds: { type: Number, min: 0, default: 0 },
            total_attempts: { type: Number, min: 0, default: 0 },
            efficiency: { type: Number, min: 0, max: 100, default: 0 }
        },

        set: {
            running_sets: { type: Number, min: 0, default: 0 },
            faults: { type: Number, min: 0, default: 0 },
            still_sets: { type: Number, min: 0, default: 0 },
            total_attempts: { type: Number, min: 0, default: 0 },
            efficiency: { type: Number, min: 0, max: 100, default: 0 }
        },

        reception: {
            excellents: { type: Number, min: 0, default: 0 },
            faults: { type: Number, min: 0, default: 0 },
            serve_receptions: { type: Number, min: 0, default: 0 },
            total_attempts: { type: Number, min: 0, default: 0 },
            efficiency: { type: Number, min: 0, max: 100, default: 0 }
        },

        overall_efficiency: { type: Number, min: 0, max: 100, default: 0 }
    },

    notes: { type: String, default: "" },

}, { timestamps: true, collection: "team_report" });
export default mongoose.model("TeamReport", teamReportSchema);
