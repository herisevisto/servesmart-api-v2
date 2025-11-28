// stats.ctrl.js
import mongoose from "mongoose";
import Athlete from "../models/athletes.model.js";
import Match from "../models/match.model.js";
import Teams from "../models/teams.model.js";
import Tryout from "../models/tryouts.model.js";
import PlayerProfile from "../models/player-profile.model.js";
import AssistantCoach from "../models/asst-coach.model.js";
import User from "../models/user.model.js";
import PracticeTeam from "../models/practice-team.model.js";
import Coach from "../models/coaches.model.js";
import StatsEntry from "../models/event-info.model.js";


async function assertJerseyFree(teamIdNum, jerseyNo, excludePlayerId = null) {
  if (jerseyNo == null) return; 
  const j = Number(jerseyNo);
  if (!Number.isFinite(j)) return;

  const q = { team_id: Number(teamIdNum), jersey_no: j };
  if (excludePlayerId != null) q.player_id = { $ne: Number(excludePlayerId) };

  const clash = await Athlete.findOne(q).lean();
  if (clash) {
    throw new Error(`Jersey #${j} is already taken in this team (player_id=${clash.player_id}).`);
  }
}


const escapeRegex = (s = "") => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const loadProfilesMap = async (entityType, ids) => {
  if (!ids?.length) return {};

  const idsNum = ids.map(n => Number(n)).filter(n => !Number.isNaN(n));

  let profiles = await PlayerProfile.find({
    entity_type: new RegExp(`^${String(entityType)}$`, 'i'),
    entity_id: { $in: idsNum }
  }).lean();

  if (profiles.length === 0) {
    const idsStr = ids.map(String);
    profiles = await PlayerProfile.find({
      entity_type: new RegExp(`^${String(entityType)}$`, 'i'),
      entity_id: { $in: idsStr }
    }).lean();
  }

  const map = {};
  for (const p of profiles) map[Number(p.entity_id)] = p;
  return map;
};

const toSafeProfile = (p) => {
  if (!p) return {};
  return {
    height:   p.height   ?? "—",
    weight:   p.weight   ?? "—",
    handed:   p.handed   ?? "—",
    status:   p.status   ?? "—",
    season:   p.season   ?? "—",
    contact:  p.contact  ?? "—",
    email:    p.email    ?? "—",
    captaincy:p.captaincy?? "None",
    gender:   p.gender   ?? "—",
  };
};

const GENDER_CANON = (v) => {
  const s = String(v ?? '').trim().toLowerCase();
  if (s === 'm' || s === 'male') return 'M';
  if (s === 'f' || s === 'female') return 'F';
  return null;
};

export const getAllMatches = async (req, res) => {
  try {
    const matches = await Match.find().sort({ match_id: 1 });
    res.status(200).json(matches);
  } catch (e) {
    res.status(500).json({ message: "Error fetching matches", error: e.message });
  }
};

export const getLatestMatch = async (req, res) => {
    try {
        const latestMatch = await Match.findOne({ result: { $ne: "pending" } }).sort({ match_no: -1 }); 
        if (!latestMatch) {
        return res.status(404).json({ message: "No matches found" });
        }

        const sets = await Match.find({ match_no: latestMatch.match_no }).sort({ set: 1 });
        
        const teamA = {
        name: latestMatch.home,
        sets: sets.map(s => s.home_points),
        setWins: sets.filter(s => s.home_points > s.guest_points).length,
        score: sets[sets.length - 1].home_points 
        };

        const teamB = {
        name: latestMatch.guest,
        sets: sets.map(s => s.guest_points),
        setWins: sets.filter(s => s.guest_points > s.home_points).length,
        score: sets[sets.length - 1].guest_points 
        };

    console.log("Latest match:", latestMatch);
    console.log("All sets:", sets);
    console.log("Team A:", teamA);
    console.log("Team B:", teamB);

        res.status(200).json({teamA, teamB});
    } catch (e) {
        res.status(500).json({ message: "Error fetching latest match", error: e.message });
    }
}

export const getAllDLSUMatches = async (req, res) => {
    try {
        const matches = await Match.find({
            $or: [
                { home: "dls"},
                { guest: "dls"}
            ]
        }).sort({createdAt: -1});
        res.json(matches);
    } catch (e) {
        res.status(500).json({error: e.message});
    }
}

export const getAllGameMatch = async (req, res) => {
  try {
    const matches = await Match.find({
      mode: "game"
    }).sort({ season_no: -1, match_no: -1 });

    res.json(matches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

export const getUnivGameMatch = async (req, res) => {
  try {
    const teamAffiliation = req.query.input; 
    console.log("DEBUG NPUT:", teamAffiliation)

    let query = { mode: "game" };

    if (teamAffiliation) {
      query.$or = [
        { home: teamAffiliation },
        { guest: teamAffiliation }
      ];
    }

    console.log("DEBUG: query =", query);
    const matches = await Match.find(query).sort({ season_no: -1, match_no: -1 });
    console.log("DEBUG: matches found =", matches.length);
    res.json(matches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

export const getUnivPracticeMatch = async (req, res) => {
  try {
    const teamAffiliation = req.query.input; 
    let query = { mode: "practice" };

    if (teamAffiliation) {
      query.$or = [
        { home: teamAffiliation },
        { guest: teamAffiliation }
      ];
    }

    const matches = await Match.find(query).sort({ season_no: -1, match_no: -1 });

    res.json(matches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


export const getAllPracticeMatch = async (req, res) => {
  try {
    const matches = await Match.find({
      mode: "practice"
    }).sort({ season_no: -1, match_no: -1 });

    res.json(matches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

export const getAllTeams = async (req, res) => {
    try {
        // Get all teams
        const teams = await Teams.find({});

        // for each team, find latest season they played
        const teamsWithLatestSeason = await Promise.all(
            teams.map(async (team)=> {
                // find the latest match where this team is home or guest (played)
                const latestMatch = await Match.find({
                    $or: [{ home: team.affiliation }, { guest: team.affiliation }]
                })
                .sort({season_no: -1})
                .limit(1); // only latest season

                const latestSeason = latestMatch.length ? latestMatch [0].season_no : null;

                return{
                    ...team.toObject(),
                    latestSeason
                };
            })
        );

        res.json(teamsWithLatestSeason);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

export const getTeamsByAffiliation = async (req, res ) => {
  try {
    const teamAffiliation = req.query.input; 

    const teams = await Teams.find({ affiliation: teamAffiliation }).sort({ name: 1 });
    res.json(teams);
  } catch (e) {
    res.status(500).json({error: e.message});
  }
}

export const getAthletesByAffiliation = async (req, res) => {
  try {
    const raw = (req.query.input || '').trim();
    if (!raw) return res.json([]);

    const esc = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const athletes = await Athlete
      .find({ team: new RegExp(`^${esc}$`, 'i') })
      .sort({ last_name: 1 })
      .lean();

    const ids = athletes.map(a => a.player_id);
    const profileMap = await loadProfilesMap("athlete", ids);

    const data = athletes.map(a => ({
      ...a,
      type: "athlete",
      profile: toSafeProfile(profileMap[a.player_id]),
    }));

    res.json(data);
  } catch (e) {
    console.error("getAthletesByAffiliation error:", e);
    res.status(500).json({ error: e.message });
  }
};

/*
export const getAthletesByAffiliation = async (req, res ) => {
  try {
    const {input} = req.query

    const athletes = await Athlete.find({ team: input}).sort({last_name: 1}); 
    res.json(athletes);
  } catch (e) {
    res.status(500).json({error: e.message});
  }
}
*/

export const getTryoutsByAffiliation = async (req, res) => {
    try {
    const raw = (req.query.input || '').trim();
    if (!raw) return res.json([]);
    const esc = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const tryouts = await Tryout
      .find({ affiliation: new RegExp(`^${esc}$`, 'i') })
      .sort({ last_name: 1 })
      .lean();
    
    res.json(tryouts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export const getAllPlayersByAffiliation = async (req, res) => {
  try {
    const raw = (req.query.input || '').trim();
    if (!raw) return res.json({ athletes: [], tryouts: [] });

    const esc = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const [athletes, tryouts] = await Promise.all([
      Athlete.find({ team: new RegExp(`^${esc}$`, 'i') }).sort({ last_name: 1 }).lean(),
      Tryout.find({ affiliation: new RegExp(`^${esc}$`, 'i') }).sort({ last_name: 1 }).lean(),
    ]);

    const [athProfileMap, trProfileMap] = await Promise.all([
      loadProfilesMap("athlete", athletes.map(a => a.player_id)),
      loadProfilesMap("tryout",  tryouts.map(t => t.tryout_id)),
    ]);

    res.json({
      athletes: athletes.map(a => ({ ...a, type: "athlete", profile: toSafeProfile(athProfileMap[a.player_id]) })),
      tryouts : tryouts .map(t => ({ ...t, type: "tryout",  profile: toSafeProfile(trProfileMap[t.tryout_id]) })),
    });
  } catch (e) {
    console.error("getAllPlayersByAffiliation error:", e);
    res.status(500).json({ error: e.message });
  }
}; 
/*
export const getAllPlayersByAffiliation = async (req, res) => {
    try {
    const affiliation = req.query.input;

    const athletes = await Athlete.find({ team: affiliation}).sort({last_name: 1}); 
    const tryouts = await Tryout.find({affiliation: affiliation}).sort({ last_name: 1 });
    
    res.json({ athletes, tryouts });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
*/
export const searchPlayer = async (req, res) => {
  try {
    const name = req.query.input;
    if (!name) return res.status(400).json({ error: "Please provide a name to search" });

    const regex = new RegExp(name, "i");

    const athletes = await Athlete.find({
      $or: [{ first_name: regex }, { last_name: regex }]
    }).sort({ last_name: 1 }).lean();

    const tryouts = await Tryout.find({
      $or: [{ first_name: regex }, { last_name: regex }]
    }).sort({ last_name: 1 }).lean();

    const athleteIds = athletes.map(a => a.player_id);
    const tryoutIds  = tryouts.map(t => t.tryout_id);

    const [athProfileMap, trProfileMap] = await Promise.all([
      loadProfilesMap("athlete", athleteIds),
      loadProfilesMap("tryout", tryoutIds),
    ]);

    const athletesWithProfile = athletes.map(a => ({ ...a, profile: toSafeProfile(athProfileMap[a.player_id]) }));
    const tryoutsWithProfile  = tryouts.map(t  => ({ ...t, profile: toSafeProfile(trProfileMap[t.tryout_id]) }));

    res.json({ athletes: athletesWithProfile, tryouts: tryoutsWithProfile });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const searchTeam = async (req, res) => {
    try {
        const name= req.query.input;

        if (!name) return res.status(400).json({ error: "Please provide a name to search" });

        const regex = new RegExp(name, "i");

        const teams = await Teams.find({
        $or: [
            { name: regex },
            { affiliation: regex }
        ]
        }).sort({ name: 1 });

        res.json(teams);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

export const allAthletes = async (req, res) => {
  try {
    const team = (req.query.input || '').trim();
    const query = team ? { team: new RegExp(`^${escapeRegex(team)}$`, 'i') } : {};
    const athletes = await Athlete.find(query).sort({ last_name: 1 }).lean();

    const ids = athletes.map(a => a.player_id);
    const profileMap = await loadProfilesMap("athlete", ids);

    const data = athletes.map(a => ({
      ...a,
      type: "athlete",
      profile: toSafeProfile(profileMap[a.player_id]),
    }));

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const allTryouts = async (req, res) => {
  try {
    const team = req.query.input;
    const query = team ? { $or: [{ team }, { affiliation: team }] } : {};
    const tryouts = await Tryout.find(query).sort({ last_name: 1 }).lean();

    const ids = tryouts.map(t => t.tryout_id);
    const profileMap = await loadProfilesMap("tryout", ids);
    const data = tryouts.map(t => ({
      ...t,
      type: "tryout",
      profile: toSafeProfile(profileMap[t.tryout_id]),
    }));

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export async function teamsForUI(_req, res) {
  try {
    const teams = await Teams.find(
      {},
      {
        _id: 0,
        team_id: 1,
        name: 1,
        affiliation: 1,
        mode: 1,
        captain: 1,
        co_captain: 1,
        gender: 1,        
      }
    )
      .sort({ name: 1 })
      .lean();

    if (!teams.length) return res.json([]);

    const affs = [...new Set(teams.map(t => (t.affiliation || "").trim().toLowerCase()))].filter(Boolean);

    const [countsMap, seasonMap] = await Promise.all([
      (async () => {
        const map = new Map();
        await Promise.all(affs.map(async (aff) => {
          try { map.set(aff, await Athlete.countDocuments({ team: aff }).exec()); }
          catch { map.set(aff, 0); }
        }));
        return map;
      })(),
      (async () => {
        const map = new Map();
        await Promise.all(affs.map(async (aff) => {
          try { map.set(aff, await getLatestSeasonForAff(aff)); }
          catch { map.set(aff, null); }
        }));
        return map;
      })(),
    ]);

    const data = teams.map(t => {
      const aff = (t.affiliation || "").trim().toLowerCase();
      return {
        team_id: t.team_id,
        id: t.team_id,
        uid: t.team_id,
        name: t.name,
        affiliation: aff,
        players: countsMap.get(aff) || 0,
        season: seasonMap.get(aff) ?? "—",
        type: (t.mode === "practice" ? "PRACTICE" : "OFFICIAL"),
        captain: t.captain || null,
        coCaptain: t.co_captain || null,
        gender: t.gender || null,           
      };
    });

    res.json(data);
  } catch (err) {
    console.error("teamsForUI error:", err);
    res.status(500).json({ error: "Failed to fetch teamsForUI" });
  }
}


export const teamDetail = async (req, res) => {
  try {
    const rawTeamId = req.query.team_id;
    const nameRaw   = req.query.name || "";
    const affRaw    = req.query.aff || req.query.affiliation || "";

    let teamDoc = null;

    if (rawTeamId != null) {
      const tid = Number(rawTeamId);
      if (Number.isFinite(tid)) {
        teamDoc = await Teams.findOne({ team_id: tid }).lean();
      }
    }

    if (!teamDoc && nameRaw.trim()) {
      teamDoc = await Teams.findOne({ name: nameRaw.trim() }).lean();
    }

    if (!teamDoc && affRaw.trim()) {
      teamDoc = await Teams.findOne({
        affiliation: affRaw.trim().toLowerCase(),
      }).lean();
    }

    if (!teamDoc) {
      return res.json({ team: null, assistants: [], roster: [] });
    }

    const aff = (teamDoc.affiliation || "").trim().toLowerCase();

    let assistants = Array.isArray(teamDoc.assistants) ? teamDoc.assistants : [];
    if (!assistants.length) {
      const asstDocs = await AssistantCoach
        .find({ affiliation: aff })
        .sort({ last_name: 1, first_name: 1 })
        .lean();
      assistants = (asstDocs || []).map(a =>
        a?.name || [a?.last_name, a?.first_name].filter(Boolean).join(", ") || "—"
      );
    }

    const athletes = await Athlete.find(
      { team_id: teamDoc.team_id },
      {
        _id: 0,
        player_id: 1,
        first_name: 1,
        last_name: 1,
        position: 1,
        jersey_no: 1,
        status: 1,
        captaincy: 1,
      }
    )
      .sort({ last_name: 1, first_name: 1 })
      .lean();

    const roster = (athletes || []).map((a) => ({
      uid: a.player_id,
      no: a.jersey_no ?? "—",
      name: `${a.last_name || ""}, ${a.first_name || ""}`.replace(/^,\s*/, "").trim(),
      position: (a.position || "").toUpperCase(),
      status: Array.isArray(a.status) ? (a.status[0] || "Active") : (a.status || "Active"),
    }));

    res.json({
      team: {
        team_id: teamDoc.team_id,
        name: teamDoc.name,
        affiliation: aff,
        type: teamDoc.mode === "practice" ? "PRACTICE" : "OFFICIAL",
        captain: teamDoc.captain || null,
        coCaptain: teamDoc.co_captain || null,
        season: teamDoc.season ?? "—",
        gender: teamDoc.gender || null,
        notes: teamDoc.notes || "",
      },
      assistants,
      roster,
    });
  } catch (err) {
    console.error("teamDetail error:", err);
    res.status(500).json({ error: "Failed to fetch team detail" });
  }
};

export const playerCount = async (req, res) => {
  try {
    const q = req.query.team || req.query.affiliation || req.query.name;
    if (!q) return res.status(400).json({ error: "team/affiliation is required" });

    const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const teamDoc = await Teams.findOne({
      $or: [
        { affiliation: new RegExp(`^${esc}$`, "i") },
        { name:        new RegExp(`^${esc}$`, "i") }
      ]
    }).lean();

    const labels = teamDoc
      ? [(teamDoc.affiliation||"").toLowerCase(), (teamDoc.name||"").toLowerCase()]
      : [q.toLowerCase()];

    const result = await Athlete.aggregate([
      { $project: { key: { $toLower: "$team" } } },
      { $match: { key: { $in: labels } } },
      { $count: "count" }
    ]);
    const count = result[0]?.count || 0;

    res.json({ labels, count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const seasonRecords = async (req, res) => {
  try {
    const season = req.query.season ? Number(req.query.season) : undefined; 
    const competition = (req.query.competition || 'UAAP').trim();          
    const mode = (req.query.mode || 'game').trim();                         
    const teamFilter = (req.query.team || '').trim().toLowerCase();         

    const matchStage = { competition, mode };
    if (season) matchStage.season_no = season;

    const rows = await Match.aggregate([
      { $match: matchStage },

      { $addFields: { _resLower: { $toLower: '$result' } } },
      {
        $addFields: {
          result_norm: {
            $switch: {
              branches: [{ case: { $eq: ['$_resLower', 'lose'] }, then: 'loss' }],
              default: '$_resLower',
            },
          },
        },
      },

      {
        $group: {
          _id: {
            match_id: '$match_id',
            season_no: '$season_no',
            competition: '$competition',
            home: { $toLower: '$home' },
            guest: { $toLower: '$guest' },
            mode: '$mode',
          },
          homeSetWins: { $sum: { $cond: [{ $eq: ['$result_norm', 'win'] }, 1, 0] } }, 
          guestSetWins:{ $sum: { $cond: [{ $eq: ['$result_norm', 'loss']}, 1, 0] } }, 
          sets: { $sum: 1 },
        },
      },

      {
        $project: {
          season_no: '$_id.season_no',
          competition: '$_id.competition',
          home: '$_id.home',
          guest: '$_id.guest',
          mode: '$_id.mode',
          winner: {
            $switch: {
              branches: [
                { case: { $gt: ['$homeSetWins', '$guestSetWins'] }, then: 'home' },
                { case: { $gt: ['$guestSetWins', '$homeSetWins'] }, then: 'guest' },
              ],
              default: 'draw',
            },
          },
        },
      },

      { $match: { winner: { $in: ['home', 'guest'] } } },

      {
        $project: {
          season_no: 1,
          competition: 1,
          rows: [
            {
              team: '$home',
              played: 1,
              win:  { $cond: [{ $eq: ['$winner', 'home'] }, 1, 0] },
              loss: { $cond: [{ $eq: ['$winner', 'guest'] }, 1, 0] },
            },
            {
              team: '$guest',
              played: 1,
              win:  { $cond: [{ $eq: ['$winner', 'guest'] }, 1, 0] },
              loss: { $cond: [{ $eq: ['$winner', 'home'] }, 1, 0] },
            },
          ],
        },
      },
      { $unwind: '$rows' },

      ...(teamFilter
        ? [{ $match: { 'rows.team': teamFilter } }]
        : []),

      {
        $group: {
          _id: { team: '$rows.team', season_no: '$season_no', competition: '$competition' },
          played: { $sum: '$rows.played' },
          win:    { $sum: '$rows.win' },
          loss:   { $sum: '$rows.loss' },
        },
      },

      {
        $project: {
          _id: 0,
          team: '$_id.team',
          season_no: '$_id.season_no',
          competition: '$_id.competition',
          played: 1,
          win: 1,
          loss: 1,
        },
      },

      { $sort: { win: -1, loss: 1, team: 1 } },
    ]);

    res.json(rows);
  } catch (e) {
    console.error('seasonRecords error:', e);
    res.status(500).json({ error: e.message });
  }
};

const ALIAS_CANON = {
  uea: 'uea', eua: 'uea', aue: 'uea', eau: 'uea', ue: 'uea',
  admu: 'admu', adu: 'adu', dls: 'dls', dlsu: 'dls', feu: 'feu',
  nu: 'nu', upd: 'upd', up: 'upd', ust: 'ust'
};
const canon = (s='') => ALIAS_CANON[(s||'').toLowerCase()] || (s||'').toLowerCase();
const aliasBucket = (code) => {
  const c = canon(code);
  
  if (c === 'uea') return ['uea', 'eua', 'aue', 'eau', 'ue', 'red warriors'];
  if (c === 'dls') return ['dls', 'dlsu', 'green spikers'];
  if (c === 'upd') return ['upd', 'up', 'fighting maroons'];
  if (c === 'ust') return ['ust', 'golden spikers'];
  if (c === 'feu') return ['feu', 'tamaraws'];
  if (c === 'adm') return ['adm', 'admu', 'adu', 'blue eagles'];
  if (c === 'adu') return ['adu', 'admu', 'adm', 'soaring falcons'];
  if (c === 'nu') return ['nu', 'nui', 'bulldogs'];
  
  return [c];
};

export const seasonTeamSummary = async (req, res) => {
  try {
    const teamRaw = req.query.team || req.query.affiliation || req.query.name;
    const seasonNo = Number(req.query.season);
    const competition = (req.query.competition || 'UAAP').toUpperCase();
    const mode = (req.query.mode || 'game').toLowerCase();

    if (!teamRaw || Number.isNaN(seasonNo)) {
      return res.status(400).json({ error: "team and season are required" });
    }
    const aliases = aliasBucket(teamRaw);

    const rows = await Match.aggregate([
      { $match: { season_no: seasonNo, competition, mode } },
      { $addFields: {
          homeL: { $toLower: "$home" },
          guestL:{ $toLower: "$guest" }
      }},
      { $match: { $or: [ { homeL: { $in: aliases } }, { guestL: { $in: aliases } } ] } },

      { $addFields: {
          homeWinSet:  { $gt: ["$home_points", "$guest_points"] },
          guestWinSet: { $gt: ["$guest_points", "$home_points"] },
          teamPtsFor: {
            $cond: [
              { $in: ["$homeL", aliases] }, "$home_points",
              { $cond: [ { $in: ["$guestL", aliases] }, "$guest_points", 0 ] }
            ]
          },
          teamPtsAgainst: {
            $cond: [
              { $in: ["$homeL", aliases] }, "$guest_points",
              { $cond: [ { $in: ["$guestL", aliases] }, "$home_points", 0 ] }
            ]
          }
      }},
  
      { $group: {
          _id: "$match_id",
          season_no: { $first: "$season_no" },
          competition: { $first: "$competition" },
          home: { $first: "$homeL" },
          guest: { $first: "$guestL" },
          hSetWins: { $sum: { $cond: ["$homeWinSet", 1, 0] } },
          gSetWins: { $sum: { $cond: ["$guestWinSet", 1, 0] } },
          teamSetWins: { $sum: {
            $cond: [
              { $in: ["$homeL", aliases] }, { $cond: [ "$homeWinSet", 1, 0 ] },
              { $cond: [ { $in: ["$guestL", aliases] }, { $cond: [ "$guestWinSet", 1, 0 ] }, 0 ] }
            ]
          }},
          teamSetLoss: { $sum: {
            $cond: [
              { $in: ["$homeL", aliases] }, { $cond: [ "$guestWinSet", 1, 0 ] },
              { $cond: [ { $in: ["$guestL", aliases] }, { $cond: [ "$homeWinSet", 1, 0 ] }, 0 ] }
            ]
          }},
          ptsFor: { $sum: "$teamPtsFor" },
          ptsAgainst: { $sum: "$teamPtsAgainst" }
      }},

      { $addFields: {
          winner: {
            $switch: {
              branches: [
                { case: { $gt: ["$hSetWins", "$gSetWins"] }, then: "$home" },
                { case: { $gt: ["$gSetWins", "$hSetWins"] }, then: "$guest" }
              ],
              default: null
            }
          },
          teamInHome: { $in: ["$home", aliases] },
          teamInGuest:{ $in: ["$guest", aliases] }
      }},
      { $addFields: {
          teamWonMatch: {
            $cond: [
              { $ne: ["$winner", null] },
              { $eq: ["$winner", { $cond: [ "$teamInHome", "$home", "$guest" ] }] },
              null
            ]
          }
      }},

      { $group: {
          _id: null,
          season_no: { $first: seasonNo },
          competition: { $first: competition },
          played: { $sum: 1 },
          win: { $sum: { $cond: [ { $eq: ["$teamWonMatch", true] }, 1, 0 ] } },
          loss:{ $sum: { $cond: [ { $eq: ["$teamWonMatch", false] }, 1, 0 ] } },
          setsWon: { $sum: "$teamSetWins" },
          setsLost:{ $sum: "$teamSetLoss" },
          pointsFor: { $sum: "$ptsFor" },
          pointsAgainst: { $sum: "$ptsAgainst" }
      }},

      { $project: {
          _id: 0,
          team: canon(teamRaw),
          competition: 1,
          season_no: 1,
          played: 1, win: 1, loss: 1,
          setsWon: 1, setsLost: 1,
          pointsFor: 1, pointsAgainst: 1
      }}
    ]);

    res.json(rows[0] || {
      team: canon(teamRaw), competition, season_no: seasonNo,
      played: 0, win: 0, loss: 0, setsWon: 0, setsLost: 0, pointsFor: 0, pointsAgainst: 0
    });
  } catch (e) {
    console.error("seasonTeamSummary error:", e);
    res.status(500).json({ error: e.message });
  }
};

export const createAthlete = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      position,
      jersey_no,
      age,
      height,
      weight,
      status,
      captaincy,
      handed,
      season,
      team_id,
      gender,
    } = req.body || {};

    const nOrNull = (v) => {
      if (v == null || v === "" || v === "—" || v === "-") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const sOrNull = (v) => {
      const s = String(v ?? "").trim();
      return s ? s : null;
    };

    if (!first_name && !last_name) {
      return res.status(400).json({ message: "First or last name is required" });
    }

    const teamIdNum = Number(team_id);
    if (!Number.isFinite(teamIdNum) || teamIdNum <= 0) {
      return res.status(400).json({ message: "team_id (positive number) is required" });
    }

    const teamDoc = await Teams.findOne({ team_id: teamIdNum }).lean();
    if (!teamDoc) {
      return res.status(400).json({ message: `No team found for team_id=${teamIdNum}` });
    }
    const affiliationKey = String(teamDoc.affiliation || "").toLowerCase().trim();

    // DUPLICATE CHECKS
    const jerseyNo = nOrNull(jersey_no)
    if(jerseyNo != null){
      const jerseyTaken = await Athlete.exists({
        team_id: teamIdNum,
        jersey_no: jerseyNo
      })

      if(jerseyTaken){
        return res.status(409).json({
          message: `Jersey #${jerseyNo} is already used by another player in this team.`
        })
      }
    }
    
    if(sOrNull(first_name) && sOrNull(last_name)){
      const nameTaken = await Athlete.exists({
        team_id: teamIdNum,
        first_name: { $regex: new RegExp(`^${sOrNull(first_name)}$`, "i") },
        last_name: { $regex: new RegExp(`^${sOrNull(last_name)}$`, "i") }
      });
      
      if (nameTaken) {
        return res.status(409).json({ 
          message: `Player '${first_name} ${last_name}' already exists in this team.` 
        });
      }
    }

    if(sOrNull(email)){
      const emailTaken = await PlayerProfile.exists({ 
        email: { $regex: new RegExp(`^${sOrNull(email)}$`, "i") } 
      });
      if (emailTaken) {
        return res.status(409).json({ 
          message: `The email address '${email}' is already registered.` 
        });
      }
    }

    if(sOrNull(phone)){
      const phoneTaken = await PlayerProfile.exists({ contact: sOrNull(phone) });
      if (phoneTaken) {
        return res.status(409).json({ 
          message: `The phone number '${phone}' is already registered.` 
        });
      }
    }

    const POS = ["S", "OH", "OP", "OS", "MB", "L", ""];
    const pos = (position || "").toUpperCase();
    if (pos && !POS.includes(pos)) {
      return res.status(400).json({ message: `Invalid position: ${position}` });
    }

    const GENDER_CANON = (val) => {
      const s = String(val ?? "").trim().toLowerCase();
      if (s === "male" || s === "m") return "M";
      if (s === "female" || s === "f") return "F";
      return null;
    };
    const genderCanon = GENDER_CANON(gender);
    if (!genderCanon) {
      return res.status(400).json({ message: "Invalid gender. Use Male/Female (or M/F)." });
    }

    const CAP = ["None", "Captain", "Co-Captain"];
    const cap = CAP.includes(captaincy) ? captaincy : "None";

    // 🔥 Only validate jersey if it's not null/empty
    /*const jerseyNum = nOrNull(jersey_no);
    if (jerseyNum != null) {
      await assertJerseyFree(teamIdNum, jerseyNum);
    }*/

    const last = await Athlete.findOne().sort({ player_id: -1 }).select("player_id");
    const nextId = (last?.player_id ?? 0) + 1;

    const athleteDoc = await Athlete.create({
      player_id: nextId,
      first_name: sOrNull(first_name),
      last_name : sOrNull(last_name),
      position  : pos || "",
      jersey_no : jerseyNo,
      age       : nOrNull(age),
      height    : nOrNull(height),
      weight    : nOrNull(weight),
      status    : status ? [status] : ["Active"],
      captaincy : cap,
      team_id   : teamIdNum,
      team      : affiliationKey,
      gender    : genderCanon,
    });

    await PlayerProfile.findOneAndUpdate(
      { entity_type: "athlete", entity_id: nextId },
      {
        $set: {
          height:   nOrNull(height),
          weight:   nOrNull(weight),
          handed:   sOrNull(handed),
          status:   status ?? "Active",
          season:   nOrNull(season),
          contact:  sOrNull(phone),
          email:    sOrNull(email),
          captaincy: cap,
          gender:    genderCanon,
        },
      },
      { upsert: true, new: true }
    );

    // Sync captaincy to Teams model
    if (cap === "Captain" || cap === "Co-Captain") {
      const fullName = `${sOrNull(last_name) || ""}, ${sOrNull(first_name) || ""}`.trim();
      const updateField = cap === "Captain" ? "captain" : "co_captain";
      
      await Teams.updateOne(
        { team_id: teamIdNum },
        { $set: { [updateField]: fullName } }
      );
    }

    return res.status(201).json({
      message: "Athlete created",
      athlete: athleteDoc,
    });
  } catch (err) {
    console.error("createAthlete error:", err);
    // Generic error fallback
    return res.status(500).json({ 
      message: err.message || "Server error creating athlete" 
    });
  }
};

export const updateAthlete = async (req, res) => {
  try {
    const body = req.body || {};
    const {
      player_id,
      first_name,
      last_name,
      position,
      jersey_no,
      age,
      team,    
      team_id,    
      height,
      weight,
      status,
      handed,
      season,
      email,
      phone,
      captaincy,
    } = body;

    if (player_id == null || player_id === "") {
      return res.status(400).json({ message: "player_id is required" });
    }
    const id = Number(player_id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "player_id must be a number" });
    }

    const current = await Athlete.findOne({ player_id: id }).lean();
    if (!current) {
      return res.status(404).json({ message: "Athlete not found" });
    }

    const nNum = (v) => {
      if (v == null) return null;
      const s = String(v).trim();
      if (s === "" || s === "—" || s === "-") return null;
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    };
    const nStr = (v) =>
      v === "" || v === "—" || v == null ? undefined : String(v).trim();

    const POS = ["S", "OH", "OP", "OS", "MB", "L", ""];
    const pos = (position || "").toUpperCase();
    if (pos && !POS.includes(pos)) {
      return res.status(400).json({ message: `Invalid position: ${position}` });
    }

    const STATUS = ["Active", "Playing", "Injured", "Inactive", "Released"];
    const statusNorm =
      typeof status === "string" && STATUS.includes(status) ? status : undefined;

    const CAPTAINCY = ["None", "Captain", "Co-Captain"];
    const captaincyNorm =
      typeof captaincy === "string" && CAPTAINCY.includes(captaincy)
        ? captaincy
        : undefined;

    const athleteSet = {};
    if (nStr(first_name) !== undefined) athleteSet.first_name = nStr(first_name);
    if (nStr(last_name)  !== undefined) athleteSet.last_name  = nStr(last_name);
    if (pos !== undefined)              athleteSet.position   = pos;
    if (nNum(age)        !== null)      athleteSet.age        = nNum(age);
    if (nNum(height)     !== null)      athleteSet.height     = nNum(height);
    if (nNum(weight)     !== null)      athleteSet.weight     = nNum(weight);
    if (statusNorm)                      athleteSet.status     = [statusNorm];
    if (captaincyNorm)                   athleteSet.captaincy  = captaincyNorm;

    let targetTeamId = current.team_id;
    let teamChanged = false;

    if (team_id !== undefined) {
      const tid = nNum(team_id);
      if (!tid || tid <= 0) {
        return res.status(400).json({ message: "team_id must be a positive number" });
      }

      const teamDoc = await Teams.findOne({ team_id: tid }).lean();
      if (!teamDoc) {
        return res.status(400).json({ message: `No team found for team_id=${tid}` });
      }

      targetTeamId = tid;
      teamChanged = (Number(current.team_id) !== Number(tid));

      const affLower = String(teamDoc.affiliation || "").toLowerCase().trim();
      athleteSet.team_id = tid;
      athleteSet.team    = affLower;
    } else if (nStr(team) !== undefined) {
      athleteSet.team = nStr(team).toLowerCase();
    }

    if (teamChanged) {
      const existingJersey = current.jersey_no;
      if (existingJersey != null && existingJersey !== "" && existingJersey !== "—") {
        const jerseyNum = Number(existingJersey);
        if (Number.isFinite(jerseyNum)) {
          await assertJerseyFree(targetTeamId, jerseyNum, id);
        }
      }
    }

    if (jersey_no !== undefined) {
      if (!Number.isFinite(Number(targetTeamId))) {
        return res.status(400).json({ message: "Cannot validate jersey: missing team_id on athlete" });
      }
      
      const nextJersey = nNum(jersey_no);
      
      if (nextJersey != null) {
        await assertJerseyFree(targetTeamId, nextJersey, id);
      }
      
      athleteSet.jersey_no = nextJersey;
    }

    if (Object.keys(athleteSet).length) {
      await Athlete.updateOne({ player_id: id }, { $set: athleteSet });
    }

    const profileSet = {
      height:  nNum(height),
      weight:  nNum(weight),
      handed:  nStr(handed) ?? null,
      status:  statusNorm ?? null,
      season:  nNum(season),
      contact: nStr(phone) ?? null,
      email:   nStr(email) ?? null,
      captaincy: captaincyNorm ?? null,
    };

    await PlayerProfile.findOneAndUpdate(
      { entity_type: "athlete", entity_id: id },
      { $set: profileSet },
      { upsert: true, new: true }
    );

    if (captaincyNorm !== undefined) {
      const updatedFirstName = athleteSet.first_name || current.first_name;
      const updatedLastName = athleteSet.last_name || current.last_name;
      const fullName = `${updatedLastName || ""}, ${updatedFirstName || ""}`.trim();
      const oldFullName = `${current.last_name || ""}, ${current.first_name || ""}`.trim();
      const teamIdToUpdate = targetTeamId || current.team_id;

      if (teamIdToUpdate) {
        if (current.captaincy !== "None") {
          await Teams.updateOne(
            { 
              team_id: current.team_id,
              $or: [
                { captain: oldFullName },
                { co_captain: oldFullName }
              ]
            },
            { 
              $set: { 
                ...(current.captaincy === "Captain" && { captain: null }),
                ...(current.captaincy === "Co-Captain" && { co_captain: null })
              } 
            }
          );
        }

        if (captaincyNorm === "Captain") {
          await Teams.updateOne(
            { team_id: teamIdToUpdate },
            { $set: { captain: fullName } }
          );
        } else if (captaincyNorm === "Co-Captain") {
          await Teams.updateOne(
            { team_id: teamIdToUpdate },
            { $set: { co_captain: fullName } }
          );
        } else if (captaincyNorm === "None") {
          await Teams.updateOne(
            { 
              team_id: teamIdToUpdate,
              $or: [
                { captain: fullName },
                { captain: oldFullName },
                { co_captain: fullName },
                { co_captain: oldFullName }
              ]
            },
            { 
              $set: { 
                captain: null,
                co_captain: null 
              } 
            }
          );
        }
      }
    }

    return res.json({ message: "Athlete updated" });
  } catch (e) {
    console.error("updateAthlete error:", e);
    const msg = e?.message || "Server error updating athlete";
    const code = /Jersey #\d+ is already taken/.test(msg) ? 409 : 500;
    return res.status(code).json({ message: msg });
  }
};
export const deleteAthlete = async (req, res) => {
  try {
    const raw =
      req.params?.player_id ??
      req.query?.player_id ??
      req.body?.player_id;

    if (raw == null || raw === "") {
      return res.status(400).json({ message: "player_id is required" });
    }
    const id = Number(raw);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "player_id must be a number" });
    }

    const removed = await Athlete.findOneAndDelete({ player_id: id }).lean();
    await PlayerProfile.deleteOne({ entity_type: "athlete", entity_id: id });

    if (!removed) {
      return res.status(404).json({ message: "Athlete not found" });
    }

    // 🔥 Remove from Teams captaincy if applicable
    if (removed.team_id && removed.captaincy && removed.captaincy !== "None") {
      const fullName = `${removed.last_name || ""}, ${removed.first_name || ""}`.trim();
      
      const updateFields = {};
      if (removed.captaincy === "Captain") {
        updateFields.captain = null;
      } else if (removed.captaincy === "Co-Captain") {
        updateFields.co_captain = null;
      }

      if (Object.keys(updateFields).length > 0) {
        await Teams.updateOne(
          { 
            team_id: removed.team_id,
            $or: [
              { captain: fullName },
              { co_captain: fullName }
            ]
          },
          { $set: updateFields }
        );
      }
    }

    return res.json({ message: "Athlete deleted", player_id: id });
  } catch (e) {
    console.error("deleteAthlete error:", e);
    return res.status(500).json({ message: `Server error deleting athlete: ${e.message}` });
  }
};

export const createTryout = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      team_id,                
      position_pref = "",
      tryout_status = "Draft",
      age,
      email,
      phone,
      height,
      weight,
      handed,
      season,
      status = null,
      affiliation,          
      gender,               
    } = req.body || {};

    const toNum = (v) => {
      const s = String(v ?? '').trim();
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    };
    const toStr = (v) => {
      const s = String(v ?? '').trim();
      return s || null;
    };
    const GENDER_CANON = (v) => {
      const s = String(v ?? '').trim().toLowerCase();
      if (!s) return null;
      if (s === 'm' || s === 'male') return 'M';
      if (s === 'f' || s === 'female') return 'F';
      return null;
    };

    if (!first_name?.trim() || !last_name?.trim()) {
      return res.status(400).json({ message: "First name and last name are required" });
    }
    if (!String(email || '').trim()) return res.status(400).json({ message: "Email is required" });
    if (!String(phone || '').trim()) return res.status(400).json({ message: "Phone is required" });

    const teamIdNum = Number(team_id);
    if (!Number.isFinite(teamIdNum) || teamIdNum <= 0) {
      return res.status(400).json({ message: "team_id (positive number) is required" });
    }

    const teamDoc = await Teams.findOne({ team_id: teamIdNum }).lean();
    if (!teamDoc) {
      return res.status(400).json({ message: `No team found for team_id=${teamIdNum}` });
    }
    const affiliationKey = String(teamDoc.affiliation || affiliation || 'dls').toLowerCase().trim();

    // DUPLICATE CHECKS
    const nameTaken = await Tryout.exists({
      team_id: teamIdNum,
      first_name: { $regex: new RegExp(`^${toStr(first_name)}$`, "i") },
      last_name:  { $regex: new RegExp(`^${toStr(last_name)}$`, "i") }
    });
    if (nameTaken) {
      return res.status(409).json({ 
        message: `A tryout for '${first_name} ${last_name}' already exists in this team.` 
      });
    }

    const emailTaken = await PlayerProfile.exists({ 
      email: { $regex: new RegExp(`^${emailStr}$`, "i") } 
    });
    if (emailTaken) {
      return res.status(409).json({ 
        message: `The email address '${emailStr}' is already registered.` 
      });
    }

    const phoneTaken = await PlayerProfile.exists({ contact: phoneStr });
    if (phoneTaken) {
      return res.status(409).json({ 
        message: `The phone number '${phoneStr}' is already registered.` 
      });
    }

    const POS  = ["S", "OH", "OP", "OS", "MB", "L", ""];
    const STAT = ["Draft", "Selected", "Rejected"];

    const posNorm = (toStr(position_pref) ?? "").toUpperCase();
    if (!POS.includes(posNorm)) {
      return res.status(400).json({ message: `Invalid position_pref: "${position_pref}"` });
    }
    const ts = toStr(tryout_status) ?? "Draft";
    const capTS = ts.charAt(0).toUpperCase() + ts.slice(1).toLowerCase();
    const statNorm = STAT.includes(capTS) ? capTS : "Draft";

    const ageNum    = toNum(age);
    const heightNum = toNum(height);
    const weightNum = toNum(weight);
    const seasonNum = toNum(season);

    const genderCanon = GENDER_CANON(gender);
    if (!genderCanon) {
      return res.status(400).json({ message: 'Gender (M/F or Male/Female) is required' });
    }

    const last = await Tryout.findOne().sort({ tryout_id: -1 }).select("tryout_id").lean();
    const nextId = (last?.tryout_id ?? 0) + 1;

    const ACTOR_USER_ID =
      req.user?.user_id != null ? Number(req.user.user_id)
      : req.headers['x-actor-user-id'] != null ? Number(req.headers['x-actor-user-id'])
      : null;

    let boundUserId = null;
    if (Number.isFinite(ACTOR_USER_ID)) {
      const actorUser = await User.findOne({ user_id: ACTOR_USER_ID }).lean();
      if (actorUser && String(actorUser.role || '').toLowerCase() === 'tryout') {
        boundUserId = ACTOR_USER_ID;
      }
    }

    const tryoutPayload = {
      tryout_id: nextId,
      first_name: toStr(first_name),
      last_name : toStr(last_name),
      position_pref: posNorm,
      tryout_status: statNorm,
      age: ageNum,
      email:  toStr(email),
      phone:  toStr(phone),
      height: heightNum,
      weight: weightNum,
      handed: toStr(handed),
      season: seasonNum,
      team_id: teamIdNum,
      affiliation: affiliationKey,
      gender: genderCanon,          
      ...(boundUserId ? { user_id: boundUserId } : {}),
    };

    const doc = await Tryout.create(tryoutPayload);

    await PlayerProfile.findOneAndUpdate(
      { entity_type: "tryout", entity_id: nextId },
      {
        $set: {
          height:  heightNum,
          weight:  weightNum,
          handed:  toStr(handed),
          status:  status ? toStr(status) : statNorm,
          season:  seasonNum,
          contact: toStr(phone),
          email:   toStr(email),
          captaincy: "None",
          gender: genderCanon,       
        },
      },
      { upsert: true, new: true }
    );

    return res.status(201).json({ message: "Tryout created", tryout: doc });
  } catch (e) {
    const msg = e?.message || "Server error creating tryout";
    console.error("createTryout error:", e);
    if (/required|Invalid position_pref|Invalid tryout_status|team_id|Gender/i.test(msg)) {
      return res.status(400).json({ message: msg });
    }
    if (e.code === 11000) {
      return res.status(409).json({ message: "Duplicate entry found." });
    }
    return res.status(500).json({ message: "Server error creating tryout", detail: msg });
  }
};

export const updateTryout = async (req, res) => {
  try {
    const {
      tryout_id, first_name, last_name,
      team, affiliation, position_pref, tryout_status,
      email, phone, height, weight, handed, season,
      age, 
    } = req.body || {};

    if (tryout_id == null) return res.status(400).json({ message: "tryout_id is required" });

    const setTryout = {
      ...(first_name != null && { first_name }),
      ...(last_name  != null && { last_name }),
      ...(team       != null && { team }),
      ...(affiliation!= null && { affiliation }),
      ...(position_pref != null && { position_pref }),
      ...(tryout_status != null && { tryout_status }),
    };

    if (age != null) {
      const ageNum = Number(String(age).trim());
      if (!Number.isFinite(ageNum) || ageNum < 0) {
        return res.status(400).json({ message: "Age must be a non-negative number" });
      }
      setTryout.age = ageNum;
    }

    await Tryout.updateOne({ tryout_id: Number(tryout_id) }, { $set: setTryout });

    await PlayerProfile.findOneAndUpdate(
      { entity_type: "tryout", entity_id: Number(tryout_id) },
      {
        $set: {
          email:   email ?? null,
          contact: phone ?? null,
          height:  height != null && height !== '' ? Number(height) : null,
          weight:  weight != null && weight !== '' ? Number(weight) : null,
          handed:  handed ?? null,
          season:  season != null && season !== '' ? Number(season) : null,
          status:  tryout_status ?? null,
        }
      },
      { upsert: true, new: true }
    );

    res.json({ message: "Tryout updated" });
  } catch (e) {
    console.error("updateTryout error:", e);
    res.status(500).json({ message: `Server error updating tryout: ${e.message}` });
  }
};


export const promoteTryoutToAthlete = async (req, res) => {
  const { tryout_id, team: teamOverride, position: posOverride, jersey_no, captaincy } = req.body || {};
  if (tryout_id == null) return res.status(400).json({ message: "tryout_id is required" });

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const tr = await Tryout.findOne({ tryout_id: Number(tryout_id) }).session(session);
      if (!tr) throw new Error("Tryout not found");

      const tProfile = await PlayerProfile.findOne({
        entity_type: "tryout",
        entity_id: Number(tryout_id),
      }).session(session);

      const GENDER_CANON = (v) => {
        const s = String(v ?? "").trim().toLowerCase();
        if (s === "male" || s === "m") return "M";
        if (s === "female" || s === "f") return "F";
        return null;
      };
      const toNumOrNull = (v) => {
        if (v == null) return null;
        const s = String(v).trim();
        if (s === "" || s === "—" || s === "-") return null;
        const n = Number(s);
        return Number.isFinite(n) ? n : null;
      };
      const toStrOrNull = (v) => (v == null || String(v).trim() === "" || v === "—" ? null : String(v).trim());

      const lastAthlete = await Athlete.findOne().sort({ player_id: -1 }).session(session);
      const newPlayerId = lastAthlete ? lastAthlete.player_id + 1 : 1;

      const POS = ["S","OH","OP","OS","MB","L",""];
      const positionNorm = (posOverride ?? tr.position_pref ?? "").toUpperCase();
      const safePosition = POS.includes(positionNorm) ? positionNorm : "";

      const CAP = ["None","Captain","Co-Captain"];
      const capNorm = CAP.includes(captaincy) ? captaincy : "None";

      const teamKey = String(
        teamOverride ?? tr.affiliation ?? tr.team ?? 'dls'
      ).toLowerCase();

      let teamIdNum = toNumOrNull(tr.team_id);
      if (!teamIdNum) {
        const teamDoc = await Teams.findOne({ affiliation: teamKey }).session(session).lean();
        if (!teamDoc) throw new Error(`No team found for affiliation="${teamKey}"`);
        teamIdNum = Number(teamDoc.team_id);
      }
      if (!Number.isFinite(teamIdNum) || teamIdNum <= 0) {
        throw new Error("Resolved team_id is invalid");
      }

      const genderCanon = GENDER_CANON(tProfile?.gender ?? tr?.gender);
      if (!genderCanon) {
        throw new Error('Gender is required to promote (expected "M/F" or "Male/Female").');
      }

      if (jersey_no != null && jersey_no !== "") {
        await assertJerseyFree(teamIdNum, jersey_no);
      }

      const [athleteDoc] = await Athlete.create([{
        player_id:  newPlayerId,
        user_id:    tr.user_id ?? null,
        first_name: tr.first_name,
        last_name:  tr.last_name,
        team_id:    teamIdNum,
        team:       teamKey,
        position:   safePosition,
        captaincy:  capNorm,
        jersey_no:  jersey_no != null && jersey_no !== "" ? Number(jersey_no) : null,
        height:     toNumOrNull(tProfile?.height),
        weight:     toNumOrNull(tProfile?.weight),
        age:        tr.age != null ? Number(tr.age) : null,
        status:     ["Active"],
        gender:     genderCanon,
      }], { session });

      const profilePayload = {
        entity_type: "athlete",
        entity_id: newPlayerId,
        height: toNumOrNull(tProfile?.height),
        weight: toNumOrNull(tProfile?.weight),
        handed: toStrOrNull(tProfile?.handed),
        status: "Active",
        season: toNumOrNull(tProfile?.season),
        contact: toStrOrNull(tProfile?.contact),
        email: toStrOrNull(tProfile?.email),
        captaincy: CAP.includes(tProfile?.captaincy) ? tProfile.captaincy : capNorm,
        gender: genderCanon,
      };

      await PlayerProfile.updateOne(
        { entity_type: "athlete", entity_id: newPlayerId },
        { $set: profilePayload },
        { upsert: true, session }
      );

      await Tryout.deleteOne({ tryout_id: Number(tryout_id) }, { session });
      if (tProfile) {
        await PlayerProfile.deleteOne({ entity_type: "tryout", entity_id: Number(tryout_id) }, { session });
      }

      const ACTOR_USER_ID =
        req.user?.user_id != null ? Number(req.user.user_id)
        : req.headers['x-actor-user-id'] != null ? Number(req.headers['x-actor-user-id'])
        : null;

      if (tr.user_id != null) {
        const targetUserId = Number(tr.user_id);
        if (!(ACTOR_USER_ID != null && targetUserId === ACTOR_USER_ID)) {
          const targetUser = await User.findOne({ user_id: targetUserId }).session(session);
          if (targetUser) {
            const roleLower = String(targetUser.role || "").trim().toLowerCase();
            const forbidden = new Set(["coach", "admin", "assistant coach"]);
            const isTryout = roleLower === "tryout";
            if (isTryout && !forbidden.has(roleLower)) {
              await User.updateOne(
                { user_id: targetUserId },
                { $set: { role: "Athlete" } },
                { session }
              );
            }
          }
        }
      }

      res.status(200).json({
        message: "Promoted",
        athlete: {
          player_id: athleteDoc.player_id,
          first_name: athleteDoc.first_name,
          last_name: athleteDoc.last_name,
          team: athleteDoc.team,
          position: athleteDoc.position,
          age: athleteDoc.age,
        }
      });
    });
  } catch (err) {
    console.error("promoteTryoutToAthlete error:", err);
    const msg = err?.message || "Internal server error";
    const code = /Jersey #\d+ is already taken/.test(msg) ? 409 : 500;
    res.status(code).json({ message: msg });
  } finally {
    session.endSession();
  }
};



export const deleteTryout = async (req, res) => {
  try {
    const raw =
      req.params?.tryout_id ??
      req.query?.tryout_id ??
      req.body?.tryout_id;

    if (raw == null || raw === "") {
      return res.status(400).json({ message: "tryout_id is required" });
    }
    const id = Number(raw);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "tryout_id must be a number" });
    }

    const removed = await Tryout.findOneAndDelete({ tryout_id: id }).lean();
    await PlayerProfile.deleteOne({ entity_type: "tryout", entity_id: id });

    if (!removed) {
      return res.status(404).json({ message: "Tryout not found" });
    }
    return res.json({ message: "Tryout deleted", tryout_id: id });
  } catch (e) {
    console.error("deleteTryout error:", e);
    return res.status(500).json({ message: `Server error deleting tryout: ${e.message}` });
  }
};

export const listPracticeTeams = async (req, res) => {
  try {
    const teams = await PracticeTeam
      .find({}, "team_name official_team_name affiliation roster team_ref")
      .populate("team_ref", "team_id affiliation name") 
      .lean();

    const data = teams.map(t => ({
      _id: t._id,
      team_name: t.team_name,
      official_team_name: t.official_team_name,
      affiliation: t.affiliation,
      team_id: t.team_ref?.team_id ?? null,   
      players: Array.isArray(t.roster) ? t.roster.length : 0,
    }));

    res.json(data);
  } catch (e) {
    console.error("listPracticeTeams error:", e);
    res.status(500).json({ error: e.message });
  }
};


export const getPracticeTeamById = async (req, res) => {
  try {
    const id = req.params?.id || req.query?.id;
    if (!id) return res.status(400).json({ message: "id is required" });

    const team = await PracticeTeam
      .findById(id)
      .populate("team_ref", "team_id affiliation name")
      .lean();

    if (!team) return res.status(404).json({ message: "Practice team not found" });

    res.json({
      ...team,
      team_id: team.team_ref?.team_id ?? null, 
    });
  } catch (e) {
    console.error("getPracticeTeamById error:", e);
    res.status(500).json({ error: e.message });
  }
};


export const createPracticeTeam = async (req, res) => {
  try {
    const {
      team_name,
      official_team_name,
      affiliation,
      season,              
      notes,
      roster = [],
      team_id,            
    } = req.body || {};

    if (!team_name?.trim())          return res.status(400).json({ message: "team_name is required" });
    if (!official_team_name?.trim()) return res.status(400).json({ message: "official_team_name is required" });

    let teamDoc = null;

    if (team_id != null) {
      const tid = Number(team_id);
      if (Number.isFinite(tid) && tid > 0) {
        teamDoc = await Teams.findOne({ team_id: tid }).lean();
      }
    }

    if (!teamDoc) {
      teamDoc =
        (await Teams.findOne({ affiliation: affiliation }).lean()) ||
        (await Teams.findOne({ name: official_team_name }).lean());
    }

    if (!teamDoc) {
      return res.status(400).json({
        message:
          "No Team found to attach as team_ref. Make sure you pass a valid team_id or create an official team first.",
      });
    }

    const mappedRoster = [];
    for (const r of roster) {
      let athleteObjectId = null;

      if (r.athlete_id) {
        athleteObjectId = r.athlete_id;
      } else if (r.player_id != null) {
        const a = await Athlete.findOne({ player_id: Number(r.player_id) })
          .select("_id")
          .lean();
        if (a) athleteObjectId = a._id;
      }

      if (!athleteObjectId) continue;

      mappedRoster.push({
        athlete: athleteObjectId,
        jersey_no: r.jersey_no ?? null,
        position: (r.position || "").toUpperCase(),
        status: r.status || "Active",
      });
    }

    const doc = await PracticeTeam.create({
      team_name: team_name.trim(),
      official_team_name: official_team_name.trim(),
      affiliation: (affiliation || "").trim() || null,
      team_ref: teamDoc._id,   
      roster: mappedRoster,
      notes: notes?.trim() || null,
    });

    await PracticeTeam.refreshSnapshots(doc._id);

    return res.status(201).json({
      message: "Practice team created",
      id: doc._id,
      team_id: teamDoc.team_id,      
    });
  } catch (e) {
    console.error("createPracticeTeam error:", e);
    return res.status(500).json({
      message: "Server error creating practice team",
      detail: e?.message,
    });
  }
};


export const updatePracticeTeam = async (req, res) => {
  try {
    const {
      team_id,              
      team_name,
      official_team_name,
      affiliation,
      season,               
      notes,
      roster = [],
    } = req.body || {};

    if (!team_id) {
      return res.status(400).json({ message: "team_id is required" });
    }

    const set = {};

    if (typeof team_name === "string" && team_name.trim()) {
      set.team_name = team_name.trim();
    }

    if (typeof official_team_name === "string" && official_team_name.trim()) {
      set.official_team_name = official_team_name.trim();
    }

    if (typeof affiliation === "string") {
      set.affiliation = affiliation.trim() || null;
    }

    if (typeof notes === "string") {
      set.notes = notes.trim() || null;
    }

    if (season !== undefined && season !== null && String(season).trim() !== "") {
      const seasonNum = Number(String(season).trim());
      if (Number.isFinite(seasonNum) && seasonNum > 0) {
        set.season = seasonNum;
      }
    }

    if (Array.isArray(roster)) {
      const mappedRoster = [];

      for (const r of roster) {
        let athleteObjectId = null;

        if (r.athlete_id) {
          athleteObjectId = r.athlete_id;
        }
        else if (r.player_id != null) {
          const a = await Athlete.findOne({ player_id: Number(r.player_id) })
            .select("_id")
            .lean();
          if (a) athleteObjectId = a._id;
        }

        if (!athleteObjectId) continue;

        mappedRoster.push({
          athlete: athleteObjectId,
          jersey_no: r.jersey_no ?? null,
          position: (r.position || "").toUpperCase(),
          status: r.status || "Active",
        });
      }

      set.roster = mappedRoster;
    }

    const updated = await PracticeTeam.findByIdAndUpdate(
      team_id,
      { $set: set },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Practice team not found" });
    }

    if (typeof PracticeTeam.refreshSnapshots === "function") {
      await PracticeTeam.refreshSnapshots(updated._id);
    }

    res.json({ message: "Practice team updated", id: updated._id });
  } catch (e) {
    console.error("updatePracticeTeam error:", e);
    res.status(500).json({
      message: "Server error updating practice team",
      detail: e?.message,
    });
  }
};


export const deletePracticeTeam = async (req, res) => {
  try {
    const teamId =
      req.body?.team_id ||
      req.query?.team_id ||
      req.params?.team_id;

    if (!teamId) return res.status(400).json({ message: "team_id is required" });

    const removed = await PracticeTeam.findByIdAndDelete(teamId).lean();
    if (!removed) return res.status(404).json({ message: "Practice team not found" });

    res.json({ message: "Practice team deleted", id: teamId });
  } catch (e) {
    console.error("deletePracticeTeam error:", e);
    res.status(500).json({ message: "Server error deleting practice team", detail: e?.message });
  }
};

async function getNextTeamId() {
  const last = await Teams.findOne({}, { team_id: 1 }).sort({ team_id: -1 }).lean();
  return (last?.team_id || 0) + 1;
}

export const createTeam = async (req, res) => {
  try {
    const {
      name,
      affiliation,
      type,
      captain,
      co_captain,
      roster = [],
      gender,
    } = req.body || {};

    if (!name || !affiliation) {
      return res.status(400).json({ message: "Missing name or affiliation" });
    }

    const escapeRegex = (string) => {
      return String(string).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    };

    const nameClean = String(name).trim();
    const affClean = String(affiliation || "").trim();

    // DUPLICATE CHECKS
    const duplicate = await Teams.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(nameClean)}$`, "i") },
      affiliation: { $regex: new RegExp(`^${escapeRegex(affClean)}$`, "i") }, 
    }).lean();

    if (duplicate) {
      return res.status(409).json({ 
        message: `The team '${nameClean}' already exists for ${affiliation}.` 
      });
    }

    const affLower = (typeof canon === 'function' ? canon(affClean) : affClean.toLowerCase());
    
    const team_id = await getNextTeamId();

    const mode =
      String(type || "").toUpperCase() === "PRACTICE"
        ? "practice"
        : "game";

    const genderCanon = GENDER_CANON(gender);
    if (!genderCanon) {
      return res.status(400).json({
        message: "Invalid gender. Use Male/Female (or M/F).",
      });
    }

    const teamDoc = await Teams.create({
      team_id,
      mode,
      affiliation: affLower,
      name: String(name).trim(),
      captain: captain || null,
      co_captain: co_captain || null,
      gender: genderCanon,
    });

    const actorRole = String(
      req.user?.role ??
      req.headers["x-actor-role"] ??
      ""
    ).trim().toLowerCase();

    const actorUserIdRaw =
      req.user?.user_id ??
      req.headers["x-actor-user-id"];

    const coachUserId = Number(actorUserIdRaw);

    if (actorRole === "coach" && Number.isFinite(coachUserId)) {
      const mergeIds = (existing) => {
        const out = [];
        const addVal = (v) => {
          if (v == null) return;
          if (Array.isArray(v)) {
            v.forEach(addVal);
            return;
          }
          const n = Number(v);
          if (Number.isFinite(n) && !out.includes(n)) out.push(n);
        };
        addVal(existing);
        addVal(team_id);
        return out;
      };

      const [userDoc, coachDoc] = await Promise.all([
        User.findOne({ user_id: coachUserId }).lean(),
        Coach.findOne({ user_id: coachUserId }).lean(),
      ]);

      const newUserTeamIds  = mergeIds(userDoc?.details?.team_id);
      const newCoachTeamIds = mergeIds(coachDoc?.team_id);

      await User.updateOne(
        { user_id: coachUserId },
        {
          $addToSet: { "details.teams_handled": team_id },
          $set: { "details.team_id": newUserTeamIds },
        }
      );

      await Coach.updateOne(
        { user_id: coachUserId },
        {
          $addToSet: { teams_handled: team_id },
          $set: { team_id: newCoachTeamIds }, 
        }
      );
    }

    const safeRoster = Array.isArray(roster) ? roster : [];

    for (const r of safeRoster) {
      const playerIdNum =
        r.player_id != null && r.player_id !== ""
          ? Number(r.player_id)
          : null;

      const athleteQuery = {};
      if (Number.isFinite(playerIdNum)) {
        athleteQuery.player_id = playerIdNum;
      } else if (r.athlete_id) {
        athleteQuery._id = r.athlete_id;
      }

      if (!Object.keys(athleteQuery).length) continue;

      const athlete = await Athlete.findOne(athleteQuery);
      if (!athlete) continue;

      let jerseyNo =
        r.jersey_no !== undefined && r.jersey_no !== null
          ? r.jersey_no
          : athlete.jersey_no;

      if (
        jerseyNo !== null &&
        jerseyNo !== undefined &&
        jerseyNo !== "" &&
        jerseyNo !== "—"
      ) {
        await assertJerseyFree(team_id, jerseyNo, athlete.player_id);
        athlete.jersey_no = Number(jerseyNo);
      }

      if (r.position) {
        athlete.position = String(r.position).toUpperCase();
      }

      const statusStr =
        typeof r.status === "string" && r.status.trim()
          ? r.status.trim()
          : null;
      if (statusStr) {
        athlete.status = [statusStr];
      } else if (!athlete.status || !athlete.status.length) {
        athlete.status = ["Active"];
      }

      if (r.captaincy) {
        athlete.captaincy = r.captaincy;
      }

      athlete.team_id = team_id;
      athlete.team = affLower;

      await athlete.save();

      const primaryStatus = Array.isArray(athlete.status)
        ? athlete.status[0]
        : athlete.status || "Active";

      await PlayerProfile.findOneAndUpdate(
        { entity_type: "athlete", entity_id: athlete.player_id },
        {
          $set: {
            status: primaryStatus || "Active",
            captaincy: athlete.captaincy || "None",
          },
        },
        { upsert: true, new: true }
      );
    }

    return res.json({
      message: "Team created.",
      team_id,
    });
  } catch (err) {
    console.error("createTeam error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: String(err.message) });
  }
};


async function getLatestSeasonForAff(aff) {
  if (!aff) return null;
  const esc = String(aff).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = await Match.find(
    { $or: [{ home: new RegExp(`^${esc}$`, "i") }, { guest: new RegExp(`^${esc}$`, "i") }] },
    { season_no: 1, match_no: 1, date: 1 }
  )
    .sort({ season_no: -1, match_no: -1, date: -1 })
    .limit(1)
    .lean();
  return m?.[0]?.season_no ?? null;  
}

export async function assistantCoaches(req, res) {
  try {
    const affRaw = (req.query.aff || req.query.affiliation || '').trim();
    if (!affRaw) return res.json([]); 
    const aff = affRaw.toLowerCase();

    const coaches = await AssistantCoach.find(
      { affiliation: { $elemMatch: { $regex: new RegExp(`^${aff}$`, 'i') } } },
      { _id: 0, asst_coach_id: 1, first_name: 1, last_name: 1, affiliation: 1 }
    )
      .sort({ last_name: 1, first_name: 1 })
      .lean();

    res.json(coaches || []);
  } catch (e) {
    console.error('assistantCoaches error:', e);
    res.status(500).json({ error: 'Failed to fetch assistant coaches' });
  }
}

function canEditTeam(req, aff) {
  const role = String(req.headers['x-actor-role'] || '').toLowerCase();
  const actorAff = String(req.headers['x-actor-affiliation'] || '').toLowerCase();
  const target = String(aff || '').toLowerCase();
  if (!role || !actorAff) return false;
  if (role === 'admin') return true;              
  if (role === 'coach') return actorAff === target; 
  return false;
}

export async function setAssistants(req, res) {
  try {
    const { affiliation, team_id, names } = req.body || {};
    if (!affiliation || !Array.isArray(names)) {
      return res.status(400).json({ message: 'affiliation and names[] are required' });
    }

    if (!canEditTeam(req, affiliation)) {
      return res.status(403).json({ message: 'Not allowed to edit this team' });
    }

    const filter = {
      affiliation: String(affiliation).toLowerCase(),
    };

    if (team_id != null) {
      const tid = Number(team_id);
      if (Number.isFinite(tid)) {
        filter.team_id = tid;
      }
    }

    const result = await Teams.updateMany(filter, { $set: { assistants: names } });

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'No matching team found to update assistants' });
    }

    return res.json({ message: 'Assistants updated' });
  } catch (e) {
    console.error('setAssistants error:', e);
    return res.status(500).json({ message: 'Server error setting assistants' });
  }
}


export const updateTeamMeta = async (req, res) => {
  try {
    const {
      team_id,
      affiliation,
      new_affiliation,
      new_name,
      captain,
      co_captain,
    } = req.body || {};

    const actorRole = String(req.headers["x-actor-role"] || "").toLowerCase();
    const actorAff  = String(req.headers["x-actor-affiliation"] || "").toLowerCase();

    if (!["coach", "admin"].includes(actorRole)) {
      return res
        .status(403)
        .json({ error: "Only coaches or admins may update team metadata." });
    }

    const targetAff = String(affiliation || "").toLowerCase();
    if (actorRole === "coach" && actorAff && targetAff && actorAff !== targetAff) {
      return res
        .status(403)
        .json({ error: "Coaches may only edit teams within their affiliation." });
    }

    const lookup = {};
    if (team_id == null) {
      return res.status(400).json({ error: "team_id is required." });
    }

    const tid = Number(team_id);
    if (!Number.isFinite(tid)) {
      return res.status(400).json({ error: "team_id must be a valid number." });
    }

lookup.team_id = tid;

    const team = await Teams.findOne(lookup);
    if (!team) {
      return res.status(404).json({ error: "Team not found." });
    }

    const oldAff = String(team.affiliation || "").toLowerCase();

    if (new_name) {
      team.name = String(new_name).trim();
    }
    if (new_affiliation) {
      team.affiliation = String(new_affiliation).toLowerCase().trim();
    }
    if (captain !== undefined) {
      team.captain = captain;
    }
    if (co_captain !== undefined) {
      team.co_captain = co_captain;
    }

    await team.save();

    if (
      new_affiliation &&
      oldAff &&
      oldAff !== String(new_affiliation).toLowerCase().trim()
    ) {
      const newAff = String(new_affiliation).toLowerCase().trim();

      await Athlete.updateMany(
        { team_id: team.team_id },
        { $set: { team: newAff } }
      );

      await PracticeTeam.updateMany(
        { team_ref: team._id },
        { $set: { affiliation: newAff } }
      );

      const ACTOR_USER_ID =
        req.user?.user_id != null ? Number(req.user.user_id)
        : req.headers["x-actor-user-id"] != null
          ? Number(req.headers["x-actor-user-id"])
          : null;

      if (actorRole === "coach" && Number.isFinite(ACTOR_USER_ID)) {
        await User.updateOne(
          { user_id: ACTOR_USER_ID, affiliation: oldAff },
          { $set: { affiliation: newAff } }
        );
      }
    }

    return res.json({
      success: true,
      team: {
        team_id: team.team_id,
        name: team.name,
        affiliation: team.affiliation,
        captain: team.captain || null,
        co_captain: team.co_captain || null,
      },
    });
  } catch (e) {
    console.error("updateTeamMeta error:", e);
    return res.status(500).json({ error: "Server error" });
  }
};



export async function setRoster(req, res) {
  try {
    const { affiliation, add = [], remove = [] } = req.body || {};
    if (!affiliation)
      return res.status(400).json({ message: 'affiliation is required' });

    if (!canEditTeam(req, affiliation))
      return res.status(403).json({ message: 'Not allowed to edit this team' });

    const aff = String(affiliation).toLowerCase();

    if (Array.isArray(add) && add.length) {
      await Athlete.updateMany(
        { player_id: { $in: add.map(Number) } },
        { $set: { team: aff } }
      );
    }

    if (Array.isArray(remove) && remove.length) {
      await Athlete.updateMany(
        { player_id: { $in: remove.map(Number) }, team: aff },
        { $set: { team: null } }
      );
    }

    return res.json({ message: 'Roster updated' });
  } catch (e) {
    console.error('setRoster error:', e);
    return res.status(500).json({ message: 'Server error updating roster' });
  }
}

export const getAthletesByTeamId = async (req, res) => {
  try {
    const teamId = Number(req.query.team_id);
    if (!teamId) return res.status(400).json({ message: "team_id is required" });

    const athletes = await Athlete.find({ team_id: teamId })
      .sort({ last_name: 1 })
      .lean();

    const ids = athletes.map(a => a.player_id);
    const profileMap = await loadProfilesMap("athlete", ids);

    const data = athletes.map(a => ({
      ...a,
      type: "athlete",
      profile: toSafeProfile(profileMap[a.player_id]),
    }));

    res.json(data);
  } catch (e) {
    console.error("getAthletesByTeamId error:", e);
    res.status(500).json({ error: e.message });
  }
};

export const getTryoutsByTeamId = async (req, res) => {
  try {
    const teamId = Number(req.query.team_id);
    if (!teamId) return res.json([]); 

    const tryouts = await Tryout.find({ team_id: teamId })
      .sort({ last_name: 1 })
      .lean();

    const ids = tryouts.map(t => t.tryout_id);
    const profileMap = await loadProfilesMap("tryout", ids);

    const data = tryouts.map(t => ({
      ...t,
      type: "tryout",
      profile: toSafeProfile(profileMap[t.tryout_id]),
    }));

    res.json(data);
  } catch (e) {
    console.error("getTryoutsByTeamId error:", e);
    res.status(500).json({ error: e.message });
  }
};

export const getAllPlayersByTeamId = async (req, res) => {
  try {
    const teamId = Number(req.query.team_id);
    if (!teamId) return res.status(400).json({ message: "team_id is required" });

    const [athletes, tryouts] = await Promise.all([
      Athlete.find({ team_id: teamId }).sort({ last_name: 1 }).lean(),
      Tryout.find({ team_id: teamId }).sort({ last_name: 1 }).lean(),
    ]);

    const athleteIds = athletes.map(a => a.player_id);
    const tryoutIds  = tryouts.map(t => t.tryout_id);

    const [athProfileMap, trProfileMap] = await Promise.all([
      loadProfilesMap("athlete", athleteIds),
      loadProfilesMap("tryout", tryoutIds),
    ]);

    const athletesWithProfile = athletes.map(a => ({
      ...a,
      type: "athlete",
      profile: toSafeProfile(athProfileMap[a.player_id]),
    }));

    const tryoutsWithProfile = tryouts.map(t => ({
      ...t,
      type: "tryout",
      profile: toSafeProfile(trProfileMap[t.tryout_id]),
    }));

    res.json({ athletes: athletesWithProfile, tryouts: tryoutsWithProfile });
  } catch (e) {
    console.error("getAllPlayersByTeamId error:", e);
    res.status(500).json({ error: e.message });
  }
};

export const myPlayers = async (req, res) => {
  try {
    const ACTOR_USER_ID =
      req.user?.user_id != null ? Number(req.user.user_id)
      : req.headers['x-actor-user-id'] != null ? Number(req.headers['x-actor-user-id'])
      : req.query?.user_id != null ? Number(req.query.user_id)
      : null;

    if (!Number.isFinite(ACTOR_USER_ID)) {
      return res.status(400).json({ message: "user_id is required" });
    }

    const coachDoc = await Coach.findOne({ user_id: ACTOR_USER_ID }).lean();
    if (!coachDoc) {
      return res.json({ athletes: [], tryouts: [] });
    }

    const idSet = new Set();

    const maybeAdd = (v) => {
      if (v == null) return;

      if (typeof v === 'object' && v.team_id != null) {
        v = v.team_id;
      }

      const n = Number(v);
      if (Number.isFinite(n) && n > 0) idSet.add(n);
    };

    if (Array.isArray(coachDoc.team_id)) {
      coachDoc.team_id.forEach(maybeAdd);
    } else {
      maybeAdd(coachDoc.team_id);
    }

    if (Array.isArray(coachDoc.teams_handled)) {
      coachDoc.teams_handled.forEach(maybeAdd);
    }

    const teamIds = [...idSet];
    if (!teamIds.length) {
      return res.json({ athletes: [], tryouts: [] });
    }

    const [athletes, tryouts] = await Promise.all([
      Athlete.find({ team_id: { $in: teamIds } }).sort({ last_name: 1 }).lean(),
      Tryout.find({ team_id: { $in: teamIds } }).sort({ last_name: 1 }).lean(),
    ]);

    const athleteIds = athletes.map(a => a.player_id);
    const tryoutIds  = tryouts.map(t => t.tryout_id);

    const [athProfileMap, trProfileMap] = await Promise.all([
      loadProfilesMap("athlete", athleteIds),
      loadProfilesMap("tryout", tryoutIds),
    ]);

    const athletesWithProfile = athletes.map(a => ({
      ...a,
      type: "athlete",
      profile: toSafeProfile(athProfileMap[a.player_id]),
    }));

    const tryoutsWithProfile = tryouts.map(t => ({
      ...t,
      type: "tryout",
      profile: toSafeProfile(trProfileMap[t.tryout_id]),
    }));

    res.json({ athletes: athletesWithProfile, tryouts: tryoutsWithProfile });
  } catch (e) {
    console.error("myPlayers error:", e);
    res.status(500).json({ error: e.message });
  }
};


export async function deleteTeam(req, res) {
  try {
    const rawId =
      req.body?.team_id ??
      req.query?.team_id ??
      req.params?.team_id;

    const teamId = Number(rawId);
    if (!Number.isFinite(teamId) || teamId <= 0) {
      return res
        .status(400)
        .json({ message: "team_id is required and must be a positive number." });
    }

    const actorRoleRaw = String(req.header("x-actor-role") || "").trim();
    const actorRole = actorRoleRaw.toLowerCase();
    const allowedRoles = new Set(["coach", "assistant coach", "admin"]);

    if (!allowedRoles.has(actorRole)) {
      return res.status(403).json({
        message: `You are not allowed to delete teams (role: "${actorRoleRaw || "unknown"}").`,
      });
    }

    const team = await Teams.findOne({ team_id: teamId }).lean();
    if (!team) {
      return res.status(404).json({ message: "Team not found." });
    }

    const actorAff = String(req.header("x-actor-affiliation") || "")
      .trim()
      .toLowerCase();
    const targetAff = String(team.affiliation || "")
      .trim()
      .toLowerCase();

    if (actorRole === "coach" && actorAff && targetAff && actorAff !== targetAff) {
      return res.status(403).json({
        message: "Coaches may only delete teams within their affiliation.",
      });
    }

    await Athlete.updateMany(
      { team_id: teamId },
      {
        $set: {
          team_id: null,     
          team: null,        
          captaincy: "None", 
        },
      }
    );

    await PracticeTeam.updateMany(
      { team_ref: team._id },
      { $set: { team_ref: null } }
    );

    await Coach.updateMany(
      {
        $or: [
          { team_id: teamId },
          { team_id: { $elemMatch: { $eq: teamId } } },
          { teams_handled: teamId },
          { teams_handled: String(teamId) },
        ],
      },
      {
        $pull: {
          team_id: teamId,
          teams_handled: { $in: [teamId, String(teamId)] },
        },
      }
    );

    await User.updateMany(
      {
        $or: [
          { "details.team_id": teamId },
          { "details.teams_handled": teamId },
          { "details.teams_handled": String(teamId) },
        ],
      },
      {
        $pull: {
          "details.team_id": teamId,
          "details.teams_handled": { $in: [teamId, String(teamId)] },
        },
      }
    );

    await Teams.deleteOne({ team_id: teamId });

    return res.json({
      ok: true,
      message: "Team deleted successfully.",
      team_id: teamId,
    });
  } catch (err) {
    console.error("deleteTeam error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
}

export const getPlayerSeasonStats = async (req, res) => {
  try {
    const { jersey_no, season_no } = req.query;

    if (!jersey_no) {
      return res.status(400).json({ 
        message: "jersey_no is required" 
      });
    }

    const jerseyNum = Number(jersey_no);

    if (!Number.isFinite(jerseyNum)) {
      return res.status(400).json({ 
        message: "jersey_no must be a valid number" 
      });
    }

    const matchFilter = {};
    let matches = [];

    if (season_no) {
      const seasonNum = Number(season_no);
      if (Number.isFinite(seasonNum)) {
        matchFilter.season_no = seasonNum;
        matches = await Match.find(matchFilter).distinct('match_no');
      }
    }

    const eventFilter = { jersey_no: jerseyNum };
    if (matches.length > 0) {
      eventFilter.match_no = { $in: matches };
    }

    console.log('Searching for events:', eventFilter);

    const result = await StatsEntry.aggregate([
      {
        $match: eventFilter
      },
      {
        $group: {
          _id: null,
          matches_played: { $addToSet: "$match_no" },
          sets_played: { $addToSet: { match: "$match_no", set: "$set_no" } },
          
          aces: {
            $sum: {
              $cond: [{ $eq: ["$action", "serve"] }, 1, 0]
            }
          },
          
          kills: {
            $sum: {
              $cond: [{ $eq: ["$action", "spike"] }, 1, 0]
            }
          },
          
          blocks: {
            $sum: {
              $cond: [{ $eq: ["$action", "block"] }, 1, 0]
            }
          },
          
          digs: {
            $sum: {
              $cond: [{ $eq: ["$action", "dig"] }, 1, 0]
            }
          },
          
          sets: {
            $sum: {
              $cond: [{ $eq: ["$action", "set"] }, 1, 0]
            }
          },
          
          receives: {
            $sum: {
              $cond: [{ $eq: ["$action", "receive"] }, 1, 0]
            }
          },
          
          errors: {
            $sum: {
              $cond: [{ $eq: ["$outcome", "error"] }, 1, 0]
            }
          },
          
          total_actions: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          matches_played: { $size: "$matches_played" },
          sets_played: { $size: "$sets_played" },
          aces: 1,
          kills: 1,
          blocks: 1,
          digs: 1,
          sets: 1,
          receives: 1,
          errors: 1,
          total_actions: 1
        }
      }
    ]);

    const stats = result[0] || {
      matches_played: 0,
      sets_played: 0,
      total_actions: 0,
      aces: 0,
      kills: 0,
      blocks: 0,
      digs: 0,
      sets: 0,
      receives: 0,
      errors: 0,
    };

    console.log('Stats result:', stats);

    res.json({
      jersey_no: jerseyNum,
      season_no: season_no || 'all',
      ...stats
    });

  } catch (e) {
    console.error("getPlayerSeasonStats error:", e);
    res.status(500).json({ 
      message: "Error fetching player stats", 
      error: e.message 
    });
  }
};

export const seasonTeamSummaryByTeamId = async (req, res) => {
  try {
    const teamId = Number(req.query.team_id);
    const seasonNo = Number(req.query.season);
    const competition = (req.query.competition || 'UAAP').toUpperCase();
    const mode = (req.query.mode || 'game').toLowerCase();

    console.log('🔍 REQUEST PARAMS:', { teamId, seasonNo, competition, mode });

    if (!teamId || Number.isNaN(seasonNo)) {
      return res.status(400).json({ error: "team_id and season are required" });
    }

    const team = await Teams.findOne({ team_id: teamId }).lean();
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    console.log('🔍 FOUND TEAM:', { 
      team_id: team.team_id, 
      name: team.name, 
      affiliation: team.affiliation,
      gender: team.gender 
    });

    const aliases = aliasBucket(team.affiliation);
    console.log('🔍 ALIASES:', aliases);

    // Count raw matches before aggregation
    const rawMatchCount = await Match.countDocuments({
      season_no: seasonNo,
      competition,
      mode,
      $or: [
        { home: { $in: aliases } },
        { guest: { $in: aliases } }
      ]
    });
    console.log('🔍 RAW MATCH COUNT (sets):', rawMatchCount);

    const rows = await Match.aggregate([
      { $match: { season_no: seasonNo, competition, mode } },
      { $addFields: {
          homeL: { $toLower: "$home" },
          guestL:{ $toLower: "$guest" }
      }},
      { $match: { $or: [ { homeL: { $in: aliases } }, { guestL: { $in: aliases } } ] } },

      { $addFields: {
          isPending: {
            $or: [
              { $eq: ["$result", "pending"] },
              { $and: [
                { $eq: ["$home_points", 0] },
                { $eq: ["$guest_points", 0] }
              ]}
            ]
          },
          homeWinSet:  { $gt: ["$home_points", "$guest_points"] },
          guestWinSet: { $gt: ["$guest_points", "$home_points"] },
          teamPtsFor: {
            $cond: [
              { $in: ["$homeL", aliases] }, "$home_points",
              { $cond: [ { $in: ["$guestL", aliases] }, "$guest_points", 0 ] }
            ]
          },
          teamPtsAgainst: {
            $cond: [
              { $in: ["$homeL", aliases] }, "$guest_points",
              { $cond: [ { $in: ["$guestL", aliases] }, "$home_points", 0 ] }
            ]
          }
      }},
  
      { $group: {
          _id: "$match_id",
          season_no: { $first: "$season_no" },
          competition: { $first: "$competition" },
          home: { $first: "$homeL" },
          guest: { $first: "$guestL" },
          isPending: { $first: "$isPending" },
          hSetWins: { $sum: { $cond: ["$homeWinSet", 1, 0] } },
          gSetWins: { $sum: { $cond: ["$guestWinSet", 1, 0] } },
          teamSetWins: { $sum: {
            $cond: [
              { $in: ["$homeL", aliases] }, { $cond: [ "$homeWinSet", 1, 0 ] },
              { $cond: [ { $in: ["$guestL", aliases] }, { $cond: [ "$guestWinSet", 1, 0 ] }, 0 ] }
            ]
          }},
          teamSetLoss: { $sum: {
            $cond: [
              { $in: ["$homeL", aliases] }, { $cond: [ "$guestWinSet", 1, 0 ] },
              { $cond: [ { $in: ["$guestL", aliases] }, { $cond: [ "$homeWinSet", 1, 0 ] }, 0 ] }
            ]
          }},
          ptsFor: { $sum: "$teamPtsFor" },
          ptsAgainst: { $sum: "$teamPtsAgainst" }
      }},

      { $addFields: {
          winner: {
            $cond: [
              "$isPending",
              null,
              {
                $switch: {
                  branches: [
                    { case: { $gt: ["$hSetWins", "$gSetWins"] }, then: "$home" },
                    { case: { $gt: ["$gSetWins", "$hSetWins"] }, then: "$guest" }
                  ],
                  default: null
                }
              }
            ]
          },
          teamInHome: { $in: ["$home", aliases] },
          teamInGuest:{ $in: ["$guest", aliases] }
      }},
      
      { $addFields: {
          teamWonMatch: {
            $cond: [
              { $ne: ["$winner", null] },
              { $eq: ["$winner", { $cond: [ "$teamInHome", "$home", "$guest" ] }] },
              null
            ]
          }
      }},

      { $group: {
          _id: null,
          season_no: { $first: seasonNo },
          competition: { $first: competition },
          played: { $sum: 1 },
          pending: { $sum: { $cond: ["$isPending", 1, 0] } },
          win: { $sum: { $cond: [ { $eq: ["$teamWonMatch", true] }, 1, 0 ] } },
          loss:{ $sum: { $cond: [ { $eq: ["$teamWonMatch", false] }, 1, 0 ] } },
          setsWon: { $sum: "$teamSetWins" },
          setsLost:{ $sum: "$teamSetLoss" },
          pointsFor: { $sum: "$ptsFor" },
          pointsAgainst: { $sum: "$ptsAgainst" }
      }},

      { $project: {
          _id: 0,
          team_id: teamId,
          competition: 1,
          season_no: 1,
          played: 1,
          pending: 1,
          win: 1,
          loss: 1,
          setsWon: 1,
          setsLost: 1,
          pointsFor: 1,
          pointsAgainst: 1
      }}
    ]);

    console.log('✅ FINAL RESULT:', rows[0]);

    res.json(rows[0] || {
      team_id: teamId,
      competition,
      season_no: seasonNo,
      played: 0,
      pending: 0,
      win: 0,
      loss: 0,
      setsWon: 0,
      setsLost: 0,
      pointsFor: 0,
      pointsAgainst: 0
    });
  } catch (e) {
    console.error("❌ seasonTeamSummaryByTeamId error:", e);
    res.status(500).json({ error: e.message });
  }
};

export const updateTeamNotes = async (req, res) => {
  try {
    const { team_id, notes } = req.body;

    if (!team_id) {
      return res.status(400).json({ message: "team_id is required" });
    }

    if (notes !== undefined && notes !== null && typeof notes !== "string") {
      return res.status(400).json({ message: "Invalid notes format" });
    }
    
    const team = await Teams.findOne({ team_id });
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    team.notes = notes ?? null;

    await team.save();

    res.json({
      message: "Team notes updated successfully",
      team: {
        team_id: team.team_id,
        name: team.name,
        affiliation: team.affiliation,
        notes: team.notes, 
      },
    });
  } catch (error) {
    console.error("updateTeamNotes error:", error);
    res.status(500).json({ message: "Server error updating team notes", error: error.message });
  }
};

export const coachTeamsForUI = async (req, res) => {
  try {
    const ACTOR_USER_ID =
      req.user?.user_id != null ? Number(req.user.user_id)
      : req.headers["x-actor-user-id"] != null ? Number(req.headers["x-actor-user-id"])
      : req.query?.user_id != null ? Number(req.query.user_id)
      : null;

    if (!Number.isFinite(ACTOR_USER_ID)) {
      return res.status(400).json({ message: "user_id is required" });
    }

    const coachDoc = await Coach.findOne({ user_id: ACTOR_USER_ID }).lean();
    if (!coachDoc) return res.json([]);

    const idSet = new Set();

    const addNum = (v) => {
      if (v == null) return;
      const n = Number(
        typeof v === "object" && v.team_id != null ? v.team_id : v
      );
      if (Number.isFinite(n) && n > 0) idSet.add(n);
    };

    if (Array.isArray(coachDoc.team_id)) coachDoc.team_id.forEach(addNum);
    else addNum(coachDoc.team_id);

    if (Array.isArray(coachDoc.teams_handled)) coachDoc.teams_handled.forEach(addNum);

    const teamIds = [...idSet];
    if (!teamIds.length) return res.json([]);

    const teams = await Teams.find({ team_id: { $in: teamIds } }).lean();

    const payload = teams.map(t => ({
      id: t.team_id,
      name: t.name,
      affiliation: t.affiliation,
    }));

    return res.json(payload);
  } catch (e) {
    console.error("coachTeamsForUI error:", e);
    return res.status(500).json({ message: "Server error", error: String(e.message) });
  }
};