import DrillSession from "../models/drill-session.js";

export const createDrillSession = async (req, res) => {
  try {
    console.log(
      "REQ BODY (drill session) >>>",
      JSON.stringify(req.body, null, 2)
    );

    const { team, drills } = req.body;

    if (!team) {
      return res.status(400).json({
        success: false,
        message: "team is required",
      });
    }

    if (!Array.isArray(drills) || drills.length === 0) {
      return res.status(400).json({
        success: false,
        message: "drills array is required",
      });
    }

    const sessionDoc = new DrillSession({
      team,
      drills,
    });

    const saved = await sessionDoc.save();

    return res.json({
      success: true,
      data: saved,
    });
  } catch (err) {
    console.error("Error creating drill session:", err);
    return res.status(500).json({
      success: false,
      message: "Server error creating drill session",
    });
  }
};

export const getDrillSessionsByTeam = async (req, res) => {
  try {
    const { team } = req.params;

    const sessions = await DrillSession.find({ team })
      .sort({ createdAt: -1 })
      .limit(20);

    return res.json({
      success: true,
      data: sessions,
    });
  } catch (err) {
    console.error("Error fetching drill sessions:", err);
    return res.status(500).json({
      success: false,
      message: "Server error fetching drill sessions",
    });
  }
};
