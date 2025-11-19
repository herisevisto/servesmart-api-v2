import mongoose from "mongoose";

// counter: if multiple matches be created concurrently: to avoid race conditions
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // name of the sequence
  seq: { type: Number, default: 0 }
}, { collection: "counterMatch" })
const Counter = mongoose.model("Counter", counterSchema);

const matchesSchema = new mongoose.Schema({
    match_id: { type: Number },
    competition: { type: String, required: true },
    season_no: { type: Number, required: true },
    match_no: { type: Number, required: true },
    home: { type: String, required: true },
    gender: { type: String, enum: ["M", "F"], required: true },  //gender = M for Male and F for Female
    guest: { type: String, required: true },
    mode: { 
        type: String, 
        enum: ['game', 'practice',], 
        required: true 
    },
    set: { type: Number },
    home_points: { type: Number, min: 0 },
    guest_points: { type: Number, min: 0 },
    result: { 
        type: String, 
        enum: ['win', 'loss', 'draw', 'pending']
    },
    allowed_coaches: [{
        user_id: {type: Number, required: true},
        name: {type: String, required: true}
    }]
}, { timestamps: true, collection: "matches" });

// pre-save hook for match_id auto-increment
matchesSchema.pre("save", async function (next) {
    if (this.isNew) {
      
        // Increment counter if exists
        let counter = await Counter.findByIdAndUpdate(
            { _id: "match_id" },
            { $inc: { seq: 1 } },
            { new: true }
        );

        // If no counter exists, get the last match_id from this collection
        if (!counter) {
            const lastMatch = await this.constructor.findOne({}).sort({ match_id: -1 });
            const startSeq = lastMatch ? lastMatch.match_id : 0;
            counter = await Counter.create({ _id: "match_id", seq: startSeq + 1 });
        }

        this.match_id = counter.seq;
    }
    next();
})

export default mongoose.model("Match", matchesSchema);
