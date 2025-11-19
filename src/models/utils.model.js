import mongoose from "mongoose"

const gameStateSchema = new mongoose.Schema({
    mode: { type: String},
    // --- ALL STATES ---
    reload: { type: Boolean, default: false },
    gameCategory: { type: String },
    genderCategory: { type: String },
    homeAthletes: { type: Array, default: [] },
    guestAthletes: { type: Array, default: [] },
    setNo: { type: Number, default: 1 },
    rotationLeft: { type: Number, default: 1 },
    rotationRight: { type: Number, default: 1 },
    setFinished: { type: Boolean, default: false },
    gameConfirmed: { type: Boolean, default: false },
    showPlayerNumbers: { type: Boolean, default: true },
    teams: { type: Array, default: [] },
    homeTeam: { type: String },
    guestTeam: { type: String },
    homeTeamName: { type: String },
    guestTeamName: { type: String },
    actionLog: { type: Array, default: [] },
    undoneLogs: { type: Array, default: [] },
    actionButtonText: { type: String, default: '' },
    blockCounter: { type: Boolean, default: false },
    setScores: {
        a: { type: [String], default: ['-', '-', '-', '-', '-'] },
        b: { type: [String], default: ['-', '-', '-', '-', '-'] }
    },
    courtActionText: { type: String, default: 'Select team to serve' },
    

    timeoutTeam: { type: String, default: null },
    courtLeftPlayers: { type: [mongoose.Schema.Types.Mixed], default: [] },
    courtRightPlayers: { type: [mongoose.Schema.Types.Mixed], default: [] },
    showWelcomeOverlay: { type: Boolean, default: true },
    editLineupMode: { type: Boolean, default: false },
    showInGameScreen: { type: Boolean, default: false },
    showMatchEndScreen: { type: Boolean, default: false },
    renderPlayState: { type: String, default: 'chooseTeam' },
    selectedCoaches: { type: Array, default: [] },
    coachCategory: { type: Boolean, default: false },
    leftTeamPlayers: { type: [mongoose.Schema.Types.Mixed], default: [] },
    rightTeamPlayers: { type: [mongoose.Schema.Types.Mixed], default: [] },
    scoreA: { type: Number, default: 0 },
    scoreB: { type: Number, default: 0 },
    
    // --- REFS --- 
    setActive: { type: Boolean, default: false },
    rallyNoRef: { type: Number, default: 1 },
    sequenceNoRef: { type: Number, default: 1 },
    outcome: { type: String, default: 'bop' },
    prevOutcome: { type: String, default: 'bop' },
    match_no: {type: Number, required: true, unique: true},
    prevPlayState: { type: String, default: null },
    prevPlayStateonReceive: { type: String, default: null },
    playState: { type: String, default: 'chooseTeam' },
    servingTeam: { type: String, default: null },
    defendingTeam: { type: String, default: null },
    attackingTeam: { type: String, default: null },
    serverPlayer: { type: mongoose.Schema.Types.Mixed, default: null },
    lastActionPlayer: { type: Object, default: null },
    prevActionPlayer: { type: Object, default: null },
    rallyCounter: { type: Number, default: 0 },
}, { timestamps: true, collection: "game-states" })

const GameState = mongoose.model('game-states', gameStateSchema);
export default GameState;