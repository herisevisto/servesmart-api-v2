import Match from "./models/match.model.js"
import { ActionLog } from "./models/game-stat.model.js"
import { getFullGameState } from "./controllers/gameState.ctrl.js"
import GameState from "./models/utils.model.js"

export function setupSocket(io) {
    io.on('connnection', (socket) => {
        console.log('A user connected:', socket.id)

        socket.on('join_match', async ({matchId, userId}) => {
            try {
                const match = await Match.findOne({match_no: matchId})
                if(!match){
                    return socket.emit('error', {message: 'Match not found'})
                }
                
                const isAllowed = match.allowed_coaches.some(coach => coach.user_id === userId)
                
                if(!isAllowed){
                    return socket.emitt('error', {message: 'You are not authorized for this match' })
                }
                
                socket.join(matchId)
                console.log(`User ${socket.id} (User ID: ${userId}) joined match ${matchId}`)

                
            } catch (e) {
                
            }
        })

        socket.on('game_action', async(data) => {
            const {matchId, actionType, team, player } = data

            try {
                let currentState = await GameState.findOne({ match_no: matchId })
                if(!currentState) return socket.emit('error', { message: 'Game state not found.' });

            } catch (e) {
                
            }
        })
    })
}