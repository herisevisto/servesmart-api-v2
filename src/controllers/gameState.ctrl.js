import GameState from "../models/utils.model.js";
import Matches from "../models/match.model.js";
import { ActionLog } from "../models/game-stat.model.js";

export const saveOrUpdateGameState = async (req, res) => {
    try {
        const {match_no} = req.body
        if(!match_no){
            return res.status(400).json({
                success: false,
                message: 'match_no is required to save game state'
            });   
        }

        const { _id, ...updateData } = req.body;

        const updateGameState = await GameState.findOneAndUpdate(
            {match_no: match_no}, 
            {$set: updateData},
            {
                new:true,   // returns the new (updated) document
                upsert: true // creates the document if it doesnt exist
            }
        )
        res.status(200).json({success:true, data: updateGameState})
    } catch (e) {
        console.error("Error saving/updating game state:", e);
        res.status(500).json({ success: false, message: e.message });
    }
}

export async function getFullGameState(matchNo){
    try {
        const liveState = await GameState.findOne({match_no: matchNo}).lean()
        if(!liveState){
            return null;
        }
        const logs = await ActionLog.find({match_no: matchNo}).sort({createdAt: 1}).lean()

        const getPlayerName = (team, jerseyNo, homeAthletes, guestAthletes) => {
            // 'team' in ActionLog is 'left' or 'right', which we use here
            const list = team === 'left' ? homeAthletes : guestAthletes;
            if (!list) return `#${jerseyNo}`;
            
            const player = list.find(p => p.jersey_no == jerseyNo);
            if (!player) return `#${jerseyNo}`;
            
            return `${player.last_name}, ${player.first_name}`;
        }

        const mappedLogs = logs.map(log => {
            // Find the player name using the helper
            const playerName = getPlayerName(
                log.team, 
                log.jersey_no, 
                liveState.homeAthletes, 
                liveState.guestAthletes
            );

            // Return an object that matches your UI's 'entry' object
            return {
                ...log,
                action: log.action,            // 'action' field
                court: log.team,               // Map 'team' to 'court'
                zonePressed: log.playing_zone, // Map 'playing_zone' to 'zonePressed'
                playerNum: log.jersey_no,      // Map 'jersey_no' to 'playerNum'
                playerName: playerName         // Add the missing playerName
            };
        });

        return{
            ...liveState,
            actionLog: mappedLogs,
        }
    } catch (e) {
        console.error("Error getting full game state:", e);
        return null;   
    }
}

export const fetchGameState = async (req, res) => {
    try {
        const {matchNo} = req.params
        const fullState = await getFullGameState(Number(matchNo))
        if(!fullState){
            return res.status(404).json({ success: false, message: 'Game state not found.' });
        }
        res.status(200).json({ success: true, data: fullState });
    } catch (e) {
        console.error("Error fetching game state:", e);
        res.status(500).json({ success: false, message: e.message });
    }
}

export const fetchMatchesForCoach = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Coach user ID is required' 
            });
        }

        // 1. Find all game states that include this userId in the allowedCoaches array.
        const gameStates = await GameState.find({ 
            "allowedCoaches.user_id": userId 
        })
        .sort({ updatedAt: -1 }) 
        .lean(); 

        if (!gameStates || gameStates.length === 0) {
            return res.status(200).json({ 
                success: true, 
                data: [], 
                message: 'No matches found for this coach.' 
            });
        }

        // 2. For each game state, fetch the full data (including action logs)
        const fullMatchPromises = gameStates.map(state => 
            getFullGameState(state.match_no)
        );
        
        const fullMatchData = await Promise.all(fullMatchPromises);

        const validMatches = fullMatchData.filter(match => match !== null);

        res.status(200).json({ success: true, data: validMatches });

    } catch (e) {
        console.error("Error fetching matches for coach:", e);
        res.status(500).json({ success: false, message: e.message });
    }
}

export const fetchResumableMatches = async (req, res) => {
    try {
        const { userId } = req.params
        if(!userId){
            return res.status(400).json({ 
                success: false, 
                message: 'Coach user ID is required' 
            });
        }
        const numericUserId = Number(userId);
        if (isNaN(numericUserId)) {
             return res.status(400).json({success: false, message: 'Invalid user ID format.'});
        }
        // 1. find pending matches where the user is an allowed coach
        const pendingMatches = await Matches.find({
            "result": "pending",
            "allowed_coaches.user_id": numericUserId
        })
        .sort({ updatedAt: -1 }) 
        .lean();
        if (!pendingMatches || pendingMatches.length === 0) {
            return res.status(200).json({ 
                success: true, 
                data: [], 
                message: 'No resumable matches found.' 
            });
        }
        // 2. get match_no from each pending match
        const matchNumbers = pendingMatches.map(match => match.match_no);
        // 3. get full game state from each pending match
        const fullMatchPromises = matchNumbers.map(matchNo => 
            getFullGameState(matchNo)
        );
        const fullMatchData = await Promise.all(fullMatchPromises);
        // filterout any matches that didnt have corresponding gamestate
        const validMatches = fullMatchData.filter(match => match !== null);
        res.status(200).json({ success: true, data: validMatches });
    } catch (e) {
        console.error("Error fetching resumable matches:", e);
        res.status(500).json({ success: false, message: e.message });   
    }
}