import mongoose from "mongoose";
import Match from "../../models/match.model.js";
import Team from "../../models/teams.model.js";

// =======================================================
// ✅ GET all season reports (grouped by match_no + gender)
// =======================================================
export const getSeasonReports = async (req, res) => {
  try {
    // Fetch all matches (newest match first, sets ascending)
    const allMatches = await Match.find().sort({ match_no: -1, set: 1 });

    if (allMatches.length === 0) {
      return res.json([]);
    }

    // Group matches by match_no AND gender
    const grouped = {};
    for (const m of allMatches) {

      // Skip match if result is "pending" 
      if (m.result === "pending") continue;

      // Composite key: same match_no but different gender -> separate group
      const key = `${m.match_no}-${m.gender}`;

      if (!grouped[key]) {
        grouped[key] = {
          _id: m._id,
          game_no: m.match_no,
          season_no: m.season_no,
          mode: m.mode,
          competition: m.competition,
          gender: m.gender, // gender tied to this group
          teams: { home: m.home, guest: m.guest },
          set_scores: [],
          createdAt: m.createdAt,
        };
      }

      grouped[key].set_scores.push({
        set_no: m.set,
        home_points: m.home_points,
        guest_points: m.guest_points,
      });
    }

    // Compute winner, pending status, etc.
    const finalReports = Object.values(grouped)
      .map((report) => {
        const homeSetWins = report.set_scores.filter(
          (s) => s.home_points > s.guest_points
        ).length;
        const guestSetWins = report.set_scores.filter(
          (s) => s.guest_points > s.home_points
        ).length;

        const isPending =
          report.set_scores.every(
            (s) =>
              (s.home_points === 0 && s.guest_points === 0) ||
              isNaN(s.home_points) ||
              isNaN(s.guest_points)
          ) || report.set_scores.length === 0;

        report.winner = isPending
          ? "pending"
          : homeSetWins > guestSetWins
          ? "home"
          : guestSetWins > homeSetWins
          ? "guest"
          : "draw";

        return report;
      })
      // Sort by game_no desc (optionally you could also sort by gender)
      .sort((a, b) => b.game_no - a.game_no);

    res.json(finalReports);
  } catch (err) {
    console.error("getSeasonReports error:", err.message);
    res.status(500).json({ error: "Failed to fetch season reports." });
  }
};

// =======================================================
// ✅ GET single season report (no mixed genders)
// =======================================================
export const getSeasonReportById = async (req, res) => {
  try {
    let reportId = req.params.reportId.trim();
    let targetMatchNo;
    let targetGender; // we'll use this when possible

    // Determine if param is ObjectId or plain number
    if (mongoose.Types.ObjectId.isValid(reportId)) {
      // If it's an ObjectId, we can get BOTH match_no and gender
      const doc = await Match.findById(reportId);
      if (!doc) return res.status(404).json({ error: "Match not found" });

      // If result is pending, do not show this match
      if (doc.result === "pending") return res.json(null);

      targetMatchNo = doc.match_no;
      targetGender = doc.gender; // 👈 critical: lock to same gender
    } else if (!isNaN(reportId)) {
      // If it's just a number, we only know match_no
      targetMatchNo = Number(reportId);
      // Optional: read gender from query if frontend sends it
      // e.g. /reports/1?gender=M
      if (req.query.gender) {
        targetGender = req.query.gender;
      }
    } else {
      return res.status(400).json({ error: "Invalid reportId format" });
    }

    // Build filter: always filter by match_no, and ALSO by gender if we know it
    const matchFilter = { match_no: targetMatchNo };
    if (targetGender) {
      matchFilter.gender = targetGender;
    }

    // Fetch all sets for this match (and gender if specified)
    const sets = await Match.find(matchFilter).sort({ set: 1 });

    if (!sets.length) {
      return res.status(404).json({ error: "Report not found" });
    }

    const base = sets[0];

    const report = {
      _id: base._id,
      game_no: base.match_no,
      season_no: base.season_no,
      mode: base.mode,
      competition: base.competition,
      gender: base.gender, // correct gender for this report
      teams: { home: base.home, guest: base.guest },
      set_scores: sets.map((s) => ({
        set_no: s.set,
        home_points: s.home_points,
        guest_points: s.guest_points,
      })),
      createdAt: base.createdAt,
    };

    const homeSetWins = report.set_scores.filter(
      (s) => s.home_points > s.guest_points
    ).length;
    const guestSetWins = report.set_scores.filter(
      (s) => s.guest_points > s.home_points
    ).length;

    const isPending =
      report.set_scores.every(
        (s) =>
          (s.home_points === 0 && s.guest_points === 0) ||
          isNaN(s.home_points) ||
          isNaN(s.guest_points)
      ) || report.set_scores.length === 0;

    report.winner = isPending
      ? "pending"
      : homeSetWins > guestSetWins
      ? "home"
      : guestSetWins > homeSetWins
      ? "guest"
      : "draw";

    res.json(report);
  } catch (err) {
    console.error("getSeasonReportById error:", err.message);
    res.status(400).json({ error: "Invalid ObjectId or match_no" });
  }
};
