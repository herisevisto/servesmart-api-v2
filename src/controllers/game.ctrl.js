import { StatsEntry, Lineup, DescriptiveInGameReport, ActionLog } from "../models/game-stat.model.js";
import Match from "../models/match.model.js";
import Team from "../models/teams.model.js"
import Coach from "../models/coaches.model.js"
import AsstCoach from "../models/asst-coach.model.js"
import EventInfo from "../models/event-info.model.js";

export const createMatch = async (req, res) => {
    try {
        const { competition, season_no, home, guest, mode, allowed_coaches, gender } = req.body;

        // Get latest match number for this season
        const latestMatch = await Match.findOne({ season_no })
        .sort({ match_no: -1 })
        .lean();
        
        const nextMatchNo = latestMatch ? latestMatch.match_no + 1 : 1;

        const match = new Match({
            competition,
            season_no,
            match_no: nextMatchNo,
            home,
            guest,
            gender,
            mode,
            set: 1,
            home_points: 0,
            guest_points: 0,
            result: "pending",
            allowed_coaches,
        });

        await match.save();

        return res.status(201).json({
            success: true,
            message: "Match created successfully",
            data: match
        });
    } catch (e) {
        console.error("Error creating match:", e);
        return res.status(500).json({
            success: false,
            message: "Failed to create match",
            error: e.message
        });
    }
}

export const createLineup = async (req, res) => {
    try {
    const { match_no, set_no, team, players } = req.body;
    if (!players || players.length !== 6) {
      return res.status(400).json({ error: "Lineup must have exactly 6 players" });
    }

    // Convert the incoming array into objects with rotation
    const formattedPlayers = players.map((player_id, idx) => ({
      player_id,      // this should match the _id in Player collection
      rotation: idx + 1
    }));

    const lineup = new Lineup({ match_no, set_no, team, formattedPlayers });
    await lineup.save();

    return res.status(201).json(lineup);

  } catch (e) {
    console.error("Error creating lineup:", e);
    return res.status(500).json({ error: "Server error" });
  }
}

export const createStatsEntry = async (req, res) => {
    try {
        const { match_no } = req.body;
        

        const newEntry = new StatsEntry({
            match_no,
            set_no: 1, // starts at 1
            rally_no: 1, // starts at 1
            sequence_no: 1 // starts at 1
        });

        await newEntry.save();

        res.status(201).json({ message: "Rally started", data: newEntry });
    } catch (e) {
        console.error("Error creating stat entry:", e);
        return res.status(500).json({ error: "Server error" })
    }
}

export const updateEfficiencyFieldLog = async (req, res) =>{
    try {
        const { match_no, set_no, rally_no, sequence_no, efficiency_field } = req.body;

        if (!efficiency_field) {
            return res.status(400).json({ message: "Efficiency field is required" });
        }

        const updatedLog = await ActionLog.findOneAndUpdate(
        { match_no, set_no, rally_no, sequence_no },
        { efficiency_field },
        { new: true } // return the updated document
        );

        if (!updatedLog) {
        return res.status(404).json({ message: "Action log not found" });
        }

        res.status(200).json({
        success: true,
        message: "Efficiency field updated successfully",
        data: updatedLog,
        });
    } catch (e) {
        console.error("Error updating efficiency field:", e);
        res.status(500).json({ message: "Error updating efficiency field", error: e.message });
    }
}

export const updateEndActionLog = async (req, res) => {
    try {
        const {match_no, set_no, rally_no, sequence_no, outcome, target_zone} = req.body

        const updatedLog = await ActionLog.findOneAndUpdate(
            { match_no, set_no, rally_no, sequence_no },
            { outcome, target_zone },
            { new: true}
        )
        
        console.log("DEBUG OUTCOME: ", outcome)
        if (!updatedLog) {
        return res.status(404).json({ message: "Action log not found" });
        }

        res.status(200).json({
        success: true,
        message: "Outcome updated successfully",
        data: updatedLog,
        });
    } catch (e) {
        res.status(500).json({ message: "Error updating action", error: e.message });
    }
}

export const addActionLog = async (req, res) => {
    try {
        const { match_no, set_no, rally_no, sequence_no, team, jersey_no, rotation, playing_zone, action, target_zone, outcome, efficiency_field } = req.body;

        // Find last sequence in this rally
        const lastAction = await ActionLog.findOne({ match_no, set_no, rally_no })
        .sort({ sequence_no: -1 });
        
        //const nextSeq = lastAction ? lastAction.sequence_no + 1 : 1;

        const newAction = new ActionLog({
            match_no,
            set_no,
            rally_no,
            sequence_no,
            team,
            jersey_no,
            rotation,
            playing_zone,
            action,
            target_zone,
            outcome,
            efficiency_field,
            timestamp: new Date()
        });
        
        await newAction.save();
        res.status(201).json({ message: "Action logged", data: newAction });
    } catch (e) {
        res.status(500).json({ message: "Error adding action", error: e.message });
    }
}

// can also be use for undo
export const delActionLog = async (req, res) => {
    try {
    const { match_no, set_no, rally_no, sequence_no } = req.body;

    const deleted = await ActionLog.findOneAndDelete({
      match_no,
      set_no,
      rally_no,
      sequence_no
    });

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Action not found" });
    }

    res.status(200).json({ message: "Action log deleted", data: deleted });
  } catch (e) {
    res.status(500).json({ message: "Error deleting action log", error: e.message });
  }
}

export const getTeams = async (req, res) => {
    try {
        const { mode, gender } = req.query
        const filter = {}
        if(mode) filter.mode = mode
        if(gender) filter.gender = gender
        const teams = await Team.find(filter)
        res.status(200).json(teams)
    } catch (e) {
        console.error("Error fetching teams,", error)
        res.status(500).json({message: "Server error fetching teams"})
    }
}

function getEfficiencyField(action, outcome) {
  switch(action) {
    case "serve":
      if(outcome === "ace") return "ace";
      if(outcome === "error") return "faults";
      if(outcome === "bop") return "serve_hits";
      break;
    case "spike":
      if(outcome === "kill") return "spikes";
      if(outcome === "bop") return "shots";
      if(outcome === "error") return "faults";
      break;
    case "block":
      if(outcome === "tool") return "kill_blocks";
      if(outcome === "bop") return "rebounds";
      if(outcome === "error") return "faults";
      break;
  }
  return null
}

function getDigSetRecEfficiencyField(action, outcome, nextAction = null) {
  if (outcome === "error") return "faults";

  if (action === "dig") {
    if (nextAction === "set") return "receptions";
    if (nextAction === 'dig') return 'digs'
    return null; 
  }
  if (action === "set") {
    if (nextAction === "spike") return "running_sets";
    if (nextAction === "set" || nextAction === "dig") return "still_sets";
    return null;
  }
  if (action === "receive"){
    if (nextAction === "spike") return "excellents";
    if (nextAction === "set" || nextAction === "dig") return "serve_receptions";
  }
  return null;
}

// When a rally ends, copy all actions from ActionLog → StatEntry
export const finalizeSet = async (req, res) => {
    try {
        const { match_no, set_no, winning_team, homeTeamName, guestTeamName } = req.body;

        const logs = await ActionLog.find({ match_no, set_no, }).sort({ rally_no: 1, sequence_no: 1 });
        if (!logs.length) return res.status(400).json({ message: "No actions to finalize" });

        const bulkOps = []
        const rallies = {};
        
        logs.forEach(log => {
            if (!rallies[log.rally_no]) rallies[log.rally_no] = [];
            rallies[log.rally_no].push(log);
        });

        for (const rallyNo in rallies) {
            const rallyLogs = rallies[rallyNo];

            // Update target zones for this rally
            for (let i = 0; i < rallyLogs.length - 1; i++) {
                const targetZone = rallyLogs[i + 1].playing_zone;
                bulkOps.push({
                    updateOne: {
                        filter: { _id: rallyLogs[i]._id },
                        update: { $set: { target_zone: targetZone } }
                    }
                });
            }

            // Update efficiency_field
            for(let i=0; i<rallyLogs.length; i++){
                const current = rallyLogs[i]
                const next = rallyLogs[i+1]
                const action = current.action?.toLowerCase()
                const outcome = current.outcome?.toLowerCase()
                const nextAction = next?.action?.toLowerCase()

                let efficiency = null

                if (["serve", "spike", "block"].includes(action)) {
                    efficiency = getEfficiencyField(action, outcome);
                } else if (["dig", "set", "receive"].includes(action)) {
                    efficiency = getDigSetRecEfficiencyField(action, outcome, nextAction);
                }

                if (efficiency) {
                    bulkOps.push({
                        updateOne: {
                            filter: { _id: current._id },
                            update: { $set: { efficiency_field: efficiency } }
                        }
                    });
                }
            }

            // Determine winning team for the last action of this rally
            const lastLog = rallyLogs[rallyLogs.length - 1];
            const courtTeamSide = lastLog.team === "left" ? homeTeamName : guestTeamName;
            let rallyWinner;
            if (lastLog.outcome === "error") {
                // Opposite team wins on error
                rallyWinner = courtTeamSide === homeTeamName ? guestTeamName : homeTeamName;
            } else {
                // Same team wins otherwise
                rallyWinner = courtTeamSide;
            }

            bulkOps.push({
                updateOne: {
                    filter: { _id: lastLog._id },
                    update: { $set: { winning_team: rallyWinner } }
                }
            });
        }
    
        // Perform all updates at once
        if (bulkOps.length) {
        const result = await ActionLog.bulkWrite(bulkOps);
        console.log(`✅ Bulk update complete: ${result.modifiedCount} documents updated.`);
        }

        // Re-fetch updated logs
        let updatedLogs = await ActionLog.find({ match_no, set_no }).sort({ rally_no: 1, sequence_no: 1 });

        //Update 'team' column to actual team names (home/guest)
        updatedLogs = updatedLogs.map(log => {
            const logObj = log.toObject();
            logObj.team = logObj.team === "left" ? homeTeamName : guestTeamName;
            return logObj;
        });

        // Save as permanent StatsEntry
        await StatsEntry.insertMany(updatedLogs);
        res.status(201).json({ message: "Rally finalized", data: updatedLogs });
    } catch (e) {
        res.status(500).json({ message: "Error finalizing rally", error: e.message });
    }
}

// When a rally ends, copy all actions from StatEntry → Match & Event  Info
export const finalizeMatch = async (req, res) => {
    try {
        const { match_no, gender } = req.body;

        console.log("📩 finalizeMatch req.body:", req.body);

        // Fetch all StatEntries for this match
        const statEntries = await StatsEntry.find({ match_no }).sort({ set_no: 1, rally_no: 1, sequence_no: 1 });
        if (!statEntries.length) return res.status(400).json({ message: "No stat entries found for this match" });

        let matchInfo = await Match.findOne({ match_no });
        if (!matchInfo) {
            // If no Match exists yet, try to take basic info from the first statEntry (if available)
            const firstEntry = statEntries[0];
            matchInfo = {
                competition: firstEntry.competition || "Unknown",
                season_no: firstEntry.season_no || 1,
                mode: firstEntry.mode || "game",
                home: firstEntry.home || "Home",
                guest: firstEntry.guest || "Guest",
            };
        }

        const home_team = matchInfo.home;
        const guest_team = matchInfo.guest;

        // Group statEntries by set_no
        const sets = {};
        statEntries.forEach(entry => {
            if (!sets[entry.set_no]) sets[entry.set_no] = [];
            sets[entry.set_no].push(entry);
        })

        const finalMatches = [];

        for (const [set_no, entries] of Object.entries(sets)) {
            // Count points for home and guest

            const home_points = entries.filter(e => e.winning_team && e.winning_team === home_team).length;
            const guest_points = entries.filter(e => e.winning_team && e.winning_team === guest_team).length;

            const result = home_points > guest_points ? 'win' : home_points < guest_points ? 'loss' : 'draw';

            // Check if set already exists
            const existingSet = await Match.findOne({ match_no, set: set_no });

            if (existingSet) {
                // Update points and result
                existingSet.home_points = home_points;
                existingSet.guest_points = guest_points;
                existingSet.result = result;
                await existingSet.save();
                finalMatches.push(existingSet);
            } else {
                // Create new set
                const newSet = new Match({
                    match_no,
                    competition: matchInfo.competition,
                    season_no: matchInfo.season_no,
                    mode: matchInfo.mode,
                    home: home_team,
                    guest: guest_team,
                    set: Number(set_no),
                    gender,
                    home_points,
                    guest_points,
                    result
                });
                await newSet.save();
                finalMatches.push(newSet);

                console.log(`✨ [Match ${match_no}, Set ${set_no}] CREATED new match document.`);
            }
        }

        // COPY TO EVENT INFO
        const uniqueTeamNames = [...new Set(statEntries.map(e => e.team))];
        const teamDocs = await Team.find({ name: { $in: uniqueTeamNames } });
        const teamIdMap = {};
        teamDocs.forEach(t => {
            teamMap[t.name] = { 
                id: t.team_id, 
                gender: t.gender 
            };
        });
        // MAP STAT ENTRIES  TO EVENT INFO 
        const eventsToArchive = statEntries.map(entry => {
            const teamData = teamMap[entry.team];

            if(!resolvedTeamId){
                console.warn(`⚠️ Warning: No team_id found for team "${entry.team}" in match ${match_no}`);
            }
            return{
                match_no: entry.match_no,
                set_no: entry.set_no,
                rally_no: entry.rally_no,
                sequence_no: entry.sequence_no,
                jersey_no: entry.jersey_no,
                rotation: entry.rotation,
                playing_zone: entry.playing_zone,
                target_zone: entry.target_zone,
                action: entry.action,
                outcome: entry.outcome,
                team: entry.team,
                team_id: teamData ? teamData.id : 0, // Default to 0 if not found to prevent crash
                gender: teamData ? teamData.gender : null,
                timestamp: entry.timestamp || new Date()
            }
        })

        if(eventsToArchive.length>0){
            await EventInfo.insertMany(eventsToArchive)
            console.log(`✅ Archived ${eventsToArchive.length} events to EventInfo.`);   
        }

        // DELETE all action logs after match is finalized
        await ActionLog.deleteMany({match_no})

        res.status(201).json({ message: "Match finalized", data: finalMatches });
    } catch (e) {
        console.error("❌ Error finalizing match:", e);
        res.status(500).json({ message: "Error finalizing match", error: e.message });
    }
}

export const getSets = async (req, res) => {
    try {
        const matchNo = parseInt(req.query.matchNo);
        if(!matchNo) return res.status(400).json({error: "matchNo required"})
        
        const sets = await StatsEntry.distinct("set_no", {match_no: matchNo}) 

        if (!sets || sets.length === 0) return res.status(404).json({ error: "No sets found" });

        sets.sort((a, b) => a - b);

        return res.json({sets})
    } catch (e) {
        console.error(e)
    }
}

// in-game reporting (descriptive)
export const calculateSuccess = async (req, res) => {
    try {
        const { match_no, set_no, team } = req.body;
        if (!match_no || !set_no || !team) {
        return res.status(400).json({ error: "Missing match_no, set_no, or team" });
        }
    } catch (e) {
        
    }
}

export const calculateErrors = async (req, res) => {
    try {
        const { match_no, set_no, team } = req.body;
        if (!match_no || !set_no || !team) {
        return res.status(400).json({ error: "Missing match_no, set_no, or team" });
        }
    } catch (e) {
        
    }
}


export const calculateZoneEfficiency = async (req, res) => {
    try {
        const { match_no, set_no, team } = req.body;
        if (!match_no || !set_no || !team) {
        return res.status(400).json({ error: "Missing match_no, set_no, or team" });
        }

        // Check if a report already exists
        const existingReport = await DescriptiveInGameReport.findOne({ match_no, set_no, team });
        if (existingReport) {
        console.log(`⚠️ Report already exists for match ${match_no}, set ${set_no}, team ${team}`);
        return res.status(200).json({
            message: "Report already exists",
            report: existingReport,
            alreadyExists: true,
            sortedEfficiencies: existingReport.efficiencies, 
        });
        }

        // fetch all relevant stats from the DB
        const data = await StatsEntry.find({match_no, set_no, team})

        if (!data || data.length === 0) {
            console.log(`⚠️ No stats found for match ${match_no}, set ${set_no}, team ${team}`);
            return null;
        }

        const SUCCESS_FIELDS = ['ace', 'serve_hits', 'spikes', 'shots', 'digs', 'receptions', 
            'kill_blocks', 'rebounds', 'running_sets', 'still_sets', 
            'excellents', 'serve_receptions'];
        const ERROR_FIELDS = ['faults'];
        const SER_EFF = ['ace', 'faults', 'serve_hits']
        const SPK_EFF = ['spikes', 'shots', 'faults']
        const DIG_EFF = ['digs', 'receptions', 'faults']
        const BLK_EFF = ['kill_blocks', 'rebounds', 'faults']
        const SET_EFF = ['running_sets', 'still_sets', 'faults']
        const REC_EFF = ['excellents', 'serve_receptions', 'faults']

        const EFF_MAP = {
            serve: SER_EFF,
            spike: SPK_EFF,
            dig: DIG_EFF,
            block: BLK_EFF,
            set: SET_EFF,
            receive: REC_EFF,
        }
        
        const efficiencies = {};

        // Classify success/error
        const classify = (field) => {
            if(!field) return 'neutral'
            if (SUCCESS_FIELDS.includes(field)) return 'success';
            if (ERROR_FIELDS.includes(field)) return 'error';
            return 'neutral'
        }

        // Loop through each action in that zone
        data.forEach(d => {
            const actionType = d.action
            const zoneType = actionType === 'serve'  ?  'target_zone' : 'playing_zone'
            const zone = Number(d[zoneType])
            const outcome = d.outcome
            const EFFfield = d.efficiency_field

            //console.log(`DEBUG IN GAME ➡️action=${actionType}, EFF FIELD=${EFFfield}, zone=${zone}, outcome=${outcome}`);

            if(!EFF_MAP[actionType]){
                console.log(`⚠️ Unknown actionType: ${actionType}`);
                return;
            }
            
            const category = classify(EFFfield)
            
            if(!efficiencies[actionType]) efficiencies[actionType] = {}
            if(!efficiencies[actionType][zone]){
                efficiencies[actionType][zone] =  { fields: {}, success: 0, error: 0, total: 0, }
            }

            const current = efficiencies[actionType][zone]
            current.total++

            if (!current.fields[EFFfield]) current.fields[EFFfield] = 0;
            current.fields[EFFfield]++;

            if (category === 'success') current.success++;
            else if (category === 'error') current.error++;

            //console.log(`🟩 ${actionType.toUpperCase()} Z${zone}: ${EFFfield} (${category})`);        
        });

        // Compute efficiencies
        for (const actionType in efficiencies) {
            for (const zone in efficiencies[actionType]) {
            const { success, error, total } = efficiencies[actionType][zone];
            efficiencies[actionType][zone].efficiency = total > 0 ? Number(((success - error) / total).toFixed(2)) : 0
            }
        }

        // Sort zones numerically for each action
        const sortedEfficiencies = Object.fromEntries(
            Object.entries(efficiencies).map(([action, zones]) => [
            action,
            Object.fromEntries(
                Object.entries(zones).sort(([a], [b]) => Number(a) - Number(b))
            )
            ])
        );

        // Compute overall summary
        let totalEff = 0, count = 0;
        Object.values(sortedEfficiencies).forEach(actionZones => {
            Object.values(actionZones).forEach(zone => {
                if (zone.efficiency !== undefined) {
                    totalEff += zone.efficiency;
                    count++;
                }
            });
        });

        const overall_efficiency = count > 0 ? Number((totalEff / count).toFixed(2)) : 0;
        const total_actions = data.length;

        // Upsert report into DB
        const report = await DescriptiveInGameReport.findOneAndUpdate(
            { match_no, set_no, team },
            {
                $set: {
                    efficiencies: sortedEfficiencies,
                    overall_efficiency,
                    total_actions,
                    generated_at: new Date(),
                },
            },
            { upsert: true, new: true }
        );
        console.log(`✅ In-game report generated for match ${match_no} set ${set_no} (${team})`);
        return res.status(200).json({ sortedEfficiencies, report });
    } catch (e) {
        console.error("❌ Error in calculateZoneEfficiency:", e);
        return null;
    }
}

export const getCoaches = async (req, res) => {
    try {
        const {affiliation} = req.query
        if(!affiliation){
            return res.status(400).json({
                success: false,
                message: "Affiliation query parameter is required"
            })
        }
        const coaches = await Coach.find({
            affiliation: affiliation,
            user_id: { $ne: null}
        }).lean()

        const asstCoaches = await AsstCoach.find({
            affiliation: affiliation,
            user_id: { $ne: null}
        }).lean()

        const allCoaches = [...coaches, ...asstCoaches]
        res.status(200).json(allCoaches)
    } catch (e) {
        console.error("Error fetching coaches:", e);
        res.status(500).json({ 
            success: false, 
            message: "Server error fetching coaches" 
        });
    }
}
