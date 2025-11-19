import TeamReport from "../../models/team-reports.model.js";
import PlayerReport from "../../models/player-reports.model.js";

/* ============================================================
  GET ALL TEAMS
=============================================================== */
export const getAllTeamsReport = async (req, res) => {
  try {
    const teams = await TeamReport.distinct("team");
    res.json(teams);
  } catch (err) {
    console.error("Error fetching teams:", err);
    res.status(500).json({ message: "Failed to fetch teams." });
  }
};

/* ============================================================
   GET ALL TEAM SEASONS (GLOBAL)
=============================================================== */
export const getAllTeamSeasons = async (req, res) => {
  try {
    const seasons = await TeamReport.distinct("season_no");
    res.json(seasons.sort((a, b) => b - a));
  } catch (err) {
    console.error("Error fetching team seasons:", err);
    res.status(500).json({ message: "Failed to fetch team seasons." });
  }
};

/* ============================================================
   ✅ GET SEASONS FOR A SPECIFIC TEAM
=============================================================== */
export const getSeasonsByTeam = async (req, res) => {
  try {
    const { team } = req.params;

    if (!team) {
      return res.status(400).json({ message: "Team name is required." });
    }

    const seasons = await TeamReport.find({
      team: new RegExp(`^${team}$`, "i"),
    }).distinct("season_no");

    res.json(seasons.sort((a, b) => a - b));
  } catch (err) {
    console.error("Error fetching team seasons:", err);
    res.status(500).json({ message: "Failed to fetch team seasons." });
  }
};

/* ============================================================
   ✅ GET MATCHES FOR SPECIFIC TEAM + SEASON
=============================================================== */
export const getMatchesByTeamSeason = async (req, res) => {
  try {
    const { team, season } = req.params;

    if (!team || !season) {
      return res
        .status(400)
        .json({ message: "Team and season are required." });
    }

    const matches = await TeamReport.find({
      team: new RegExp(`^${team}$`, "i"),
      season_no: parseInt(season, 10),
    }).distinct("game_no");

    res.json(matches.sort((a, b) => a - b));
  } catch (err) {
    console.error("Error fetching matches:", err);
    res.status(500).json({ message: "Failed to fetch matches." });
  }
};

/* ============================================================
    GET ALL PLAYER SEASONS
=============================================================== */
export const getAllPlayerSeasons = async (req, res) => {
  try {
    const seasons = await PlayerReport.distinct("season_no");
    res.json(seasons.sort((a, b) => b - a));
  } catch (err) {
    console.error("Error fetching player seasons:", err);
    res.status(500).json({ message: "Failed to fetch player seasons." });
  }
};

/* ============================================================
   GET ALL MATCH NUMBERS (GLOBAL)
=============================================================== */
export const getAllMatchNumbers = async (req, res) => {
  try {
    const matches = await TeamReport.distinct("game_no");
    res.json(matches.sort((a, b) => a - b));
  } catch (err) {
    console.error("Error fetching match numbers:", err);
    res.status(500).json({ message: "Failed to fetch match numbers." });
  }
};

/* ============================================================
 SEARCH PLAYER BY NAME
=============================================================== */
export const searchPlayerReport = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.length < 2) return res.json([]);

    const regex = new RegExp(query, "i");
    const players = await PlayerReport.find({
      $or: [{ first_name: regex }, { last_name: regex }],
    })
      .limit(15)
      .select("first_name last_name position season_no");

    res.json(players);
  } catch (err) {
    console.error("Error searching player:", err);
    res.status(500).json({ message: "Failed to search players." });
  }
};
/* ============================================================
   GET SEASONS FOR SPECIFIC PLAYER
=============================================================== */
export const getSeasonsByPlayer = async (req, res) => {
  try {
    const { playerName } = req.params;

    if (!playerName) {
      return res.status(400).json({ message: "Player name is required." });
    }

    const regex = new RegExp(playerName, "i");

    // Match by first_name, last_name, or full name
    const seasons = await PlayerReport.find({
      $or: [
        { first_name: regex },
        { last_name: regex },
        { $expr: { $regexMatch: { input: { $concat: ["$first_name", " ", "$last_name"] }, regex: playerName, options: "i" } } }
      ],
    }).distinct("season_no");

    res.json(seasons.sort((a, b) => a - b));
  } catch (err) {
    console.error("Error fetching player seasons:", err);
    res.status(500).json({ message: "Failed to fetch player seasons." });
  }
};

/* ============================================================
   GET MATCHES FOR SPECIFIC PLAYER + SEASON
=============================================================== */
export const getMatchesByPlayerSeason = async (req, res) => {
  try {
    const { playerName, season } = req.params;

    if (!playerName || !season) {
      return res.status(400).json({ message: "Player name and season are required." });
    }

    const regex = new RegExp(playerName, "i");

    const matches = await PlayerReport.find({
      season_no: parseInt(season, 10),
      $or: [
        { first_name: regex },
        { last_name: regex },
        { $expr: { $regexMatch: { input: { $concat: ["$first_name", " ", "$last_name"] }, regex: playerName, options: "i" } } }
      ],
    }).distinct("game_no");

    res.json(matches.sort((a, b) => a - b));
  } catch (err) {
    console.error("Error fetching player matches:", err);
    res.status(500).json({ message: "Failed to fetch player matches." });
  }
};
