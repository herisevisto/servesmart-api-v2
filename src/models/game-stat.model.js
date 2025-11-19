import mongoose from "mongoose";

const actionLogSchema = new mongoose.Schema({
  match_no:     { type: Number, required: true }, 
  set_no:       { type: Number, required: true },  
  rally_no:     { type: Number, required: true },
  sequence_no:  { type: Number, required: true },  

  team:         { type: String }, // name of team/affiliation
  jersey_no:    { type: Number, required: true },  
  rotation:     { type: Number, enum: [1, 2, 3, 4, 5, 6], default: null },

  playing_zone: { type: Number, enum: [1, 2, 3, 4, 5, 6], default: null }, 
  action: { 
    type: String, 
    enum: ["serve", "receive", "set", "spike", "dig", "block","skip set"], 
    default:null
  },

  target_zone:  { type: Number, enum: [1, 2, 3, 4, 5, 6], default: null },   
  outcome: { 
    type: String, 
    enum: ["ace", "error", "kill","tool", "block", "bop"], 
    default:null
  },

  efficiency_field:{
    type: String,
    enum: ["ace", "faults", "serve_hits", // this is for serve action 
        "spikes", "shots", // faults -- spike action 
        "digs", "receptions", //faults // dig
        "kill_blocks", "rebounds", //"faults", // block
        "running_sets", "still_sets", //"faults", // set
        "excellents", "serve_receptions", //faults // receive
    ],
    default: null
  },

  winning_team: { type: String , default: null },

  timestamp:    { type: Date, default: Date.now }
}, { collection: "action-logs" });


const descInGameReportSchema = new mongoose.Schema({
  match_no: { type: Number, required: true },
  set_no: { type: Number, required: true },
  team: { type: String, required: true },

  // Action-based zone efficiencies
  efficiencies: {
    serve: { type: Object, default: {} },
    spike: { type: Object, default: {} },
    block: { type: Object, default: {} },
    dig: { type: Object, default: {} },
    set: { type: Object, default: {} },
    receive: { type: Object, default: {} },
  },

  overall_efficiency: { type: Number, default: 0 },
  total_actions: { type: Number, default: 0 },

  generated_at: { type: Date, default: Date.now }
}, { collection: "descriptive-in-game-reports" })

const lineupSchema = new mongoose.Schema({
  match_no: { type: Number, required: true },
  set_no: { type: Number, required: true },

  team: { type: String},

  // 6 players on court, indexed by rotation positions 1–6
  players: [
    {
      player_id: { type: Number, required: true }, // jersey no. or unique id
      rotation: { type: Number, enum: [1,2,3,4,5,6], required: true }
    }
  ],

  libero: { type: Number, default: null }, // optional
  timestamp: { type: Date, default: Date.now }
}, { collection: "lineups" });


const statEntrySchema = new mongoose.Schema({
  match_no:     { type: Number, required: true }, 
  set_no:       { type: Number, required: true, default: 1 },  
  rally_no:     { type: Number, required: true, default: 1 },
  sequence_no:  { type: Number, required: true, default: 1 },   

  team:         { type: String, def: null, }, // to be updated real time stat
  jersey_no:    { type: Number, default: 0 },  // to be updated real time stat
  rotation:     { type: Number, enum: [1, 2, 3, 4, 5, 6], default: 1 }, 

  playing_zone: { type: Number, enum: [1, 2, 3, 4, 5, 6], default: null }, // to be updated real time stat
  action: { 
    type: String, 
    enum: ["serve", "receive", "set", "spike", "dig", "block","skip set"], 
    default:null
  }, // to be updated real time stat

  target_zone:  { type: Number, enum: [1, 2, 3, 4, 5, 6], default: null },   // to be updated real time stat
  outcome: { 
    type: String, 
    enum: ["ace", "error", "kill","tool", "block", "bop"], 
    default:null
  }, // to be updated real time stat,

  efficiency_field:{
    type: String,
    enum: ["ace", "faults", "serve_hits", // this is for serve action 
        "spikes", "shots", // faults -- spike action 
        "digs", "receptions", //faults // dig
        "kill_blocks", "rebounds", //"faults", // block
        "running_sets", "still_sets", //"faults", // set
        "excellents", "serve_receptions", //faults // receive
    ],
    default: null
  },

  winning_team: { type: String, default: null },

  timestamp:    { type: Date, default: Date.now }
}, { collection: "stat_entries" });


const StatsEntry = mongoose.model("StatEntry", statEntrySchema)
const Lineup = mongoose.model("Lineup", lineupSchema)
const DescriptiveInGameReport = mongoose.model("DescriptiveInGameReport", descInGameReportSchema)
const ActionLog = mongoose.model("ActionLogs", actionLogSchema)

export {StatsEntry, Lineup, DescriptiveInGameReport, ActionLog}
