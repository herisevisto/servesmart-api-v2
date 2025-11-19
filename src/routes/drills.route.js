import express from "express";
import {
  getAllDrills,
  getDrillById,
  createDrill,
  updateDrill,
} from "../controllers/drills.ctrl.js";

const router = express.Router();

// GET /api/drills
// POST /api/drills
router.route("/")
  .get(getAllDrills)
  .post(createDrill);

// GET /api/drills/:id
// PUT /api/drills/:id
router.route("/:id")
  .get(getDrillById)
  .put(updateDrill);

export default router;
