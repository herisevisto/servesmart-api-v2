import Drill from "../models/drill.js";

export const getAllDrills = async (req, res) => {
  try {
    const drills = await Drill.find().sort({ createdAt: 1 });
    return res.json({
      success: true,
      data: drills,
    });
  } catch (err) {
    console.error("getAllDrills error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error fetching drills",
    });
  }
};

export const getDrillById = async (req, res) => {
  try {
    const { id } = req.params;
    const drill = await Drill.findById(id);
    if (!drill) {
      return res.status(404).json({
        success: false,
        message: "Drill not found",
      });
    }
    return res.json({
      success: true,
      data: drill,
    });
  } catch (err) {
    console.error("getDrillById error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error fetching drill",
    });
  }
};

export const createDrill = async (req, res) => {
  try {
    const { name, type, defaultSecs, checklist } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "name is required",
      });
    }

    const drillDoc = new Drill({
      name,
      type,
      defaultSecs,
      checklist,
    });

    const saved = await drillDoc.save();

    return res.json({
      success: true,
      data: saved,
    });
  } catch (err) {
    console.error("createDrill error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error creating drill",
    });
  }
};

export const updateDrill = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, defaultSecs, checklist } = req.body;

    const updated = await Drill.findByIdAndUpdate(
      id,
      {
        name,
        type,
        defaultSecs,
        checklist,
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Drill not found",
      });
    }

    return res.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    console.error("updateDrill error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error updating drill",
    });
  }
};
