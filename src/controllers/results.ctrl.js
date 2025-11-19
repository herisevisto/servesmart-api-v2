import MatchResult from "../models/match-result.model.js";
import TeamSummary from "../models/team-summary.model.js";

const toInt = (v) => (v === undefined ? undefined : Number(v));

const winPct = (r) =>
  (Number(r.total_matches_played) > 0
    ? Number(r.matches_won) / Number(r.total_matches_played)
    : 0);

const pointsDiff = (r) =>
  Number(r.points_scored || 0) - Number(r.points_allowed || 0);

const setsDiff = (r) =>
  Number(r.sets_won || 0) - Number(r.sets_lost || 0);

export const getMatchResults = async (req, res) => {
  try {
    const { team, opponent, competition, wl, match_id } = req.query;
    const season = toInt(req.query.season);

    const q = {};
    if (team)        q.team = new RegExp(`^${team}$`, "i");
    if (opponent)    q.opponent = new RegExp(`^${opponent}$`, "i");
    if (competition) q.competition = new RegExp(`^${competition}$`, "i");
    if (wl)          q.wl = wl.toUpperCase();
    if (season)      q.season = season;
    if (match_id)    q.match_id = Number(match_id);

    const rows = await MatchResult.find(q)
      .sort({ season: -1, match_id: 1 })
      .lean();

    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const upsertMatchResultsBulk = async (req, res) => {
  try {
    const docs = Array.isArray(req.body) ? req.body : [];
    if (!docs.length) return res.status(400).json({ error: "Body must be a non-empty array." });

    const ops = docs.map(d => ({
      updateOne: {
        filter: { team: String(d.team).toLowerCase(), match_id: Number(d.match_id) },
        update: { $set: d },
        upsert: true
      }
    }));

    const result = await MatchResult.bulkWrite(ops, { ordered: false });
    res.json({ ok: true, result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getTeamSummary = async (req, res) => {
  try {
    const { team, competition, season } = req.query;
    const q = {};
    if (team)        q.team = new RegExp(`^${team}$`, "i");
    if (competition) q.competition = new RegExp(`^${competition}$`, "i");
    if (season)      q.season = new RegExp(`^${season}$`, "i");

    const rows = await TeamSummary.find(q)
      .sort({ season: 1, team: 1 })
      .lean();

    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const upsertTeamSummaryBulk = async (req, res) => {
  try {
    const docs = Array.isArray(req.body) ? req.body : [];
    if (!docs.length) return res.status(400).json({ error: "Body must be a non-empty array." });

    const ops = docs.map(d => ({
      updateOne: {
        filter: {
          team: String(d.team).toLowerCase(),
          competition: d.competition,
          season: d.season
        },
        update: { $set: d },
        upsert: true
      }
    }));

    const result = await TeamSummary.bulkWrite(ops, { ordered: false });
    res.json({ ok: true, result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getStandings = async (req, res) => {
  try {
    const competition = (req.query.competition || "UAAP").trim();
    const season = (req.query.season || "").trim();
    if (!season) return res.status(400).json({ error: "season is required" });

    const rows = await TeamSummary.find({ competition, season }).lean();

    const enriched = rows.map((r) => ({
      ...r,
      win_pct: winPct(r),
      points_diff: pointsDiff(r),
      sets_diff: setsDiff(r),
    }));

    enriched.sort(
      (a, b) =>
        b.win_pct - a.win_pct ||
        b.matches_won - a.matches_won ||
        b.points_diff - a.points_diff ||
        b.sets_diff - a.sets_diff ||
        a.team.localeCompare(b.team)
    );

    const standings = enriched.map((r, i) => ({ rank: i + 1, ...r }));
    res.json(standings);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getStandingForTeam = async (req, res) => {
  try {
    const team = (req.params.team || "").toLowerCase().trim();
    const competition = (req.query.competition || "UAAP").trim();
    const season = (req.query.season || "").trim();
    if (!team || !season)
      return res.status(400).json({ error: "team and season are required" });

    const rows = await TeamSummary.find({ competition, season }).lean();
    if (!rows.length) return res.json(null);

    const enriched = rows.map((r) => ({
      ...r,
      win_pct: winPct(r),
      points_diff: pointsDiff(r),
      sets_diff: setsDiff(r),
    }));

    enriched.sort(
      (a, b) =>
        b.win_pct - a.win_pct ||
        b.matches_won - a.matches_won ||
        b.points_diff - a.points_diff ||
        b.sets_diff - a.sets_diff ||
        a.team.localeCompare(b.team)
    );

    const index = enriched.findIndex((r) => String(r.team).toLowerCase() === team);
    if (index === -1) return res.json(null);

    res.json({ rank: index + 1, ...enriched[index] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};