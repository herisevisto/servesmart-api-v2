import express from "express";

import { getAllMatches, getLatestMatch, getAllDLSUMatches, getAllGameMatch, getAllPracticeMatch, 
    getAllTeams, 
    getAthletesByAffiliation,
    getTryoutsByAffiliation,
    getAllPlayersByAffiliation,
    searchPlayer,
    searchTeam,
    getTeamsByAffiliation,
    getUnivGameMatch,
    getUnivPracticeMatch,
  allAthletes,
  allTryouts,
  teamsForUI,
  teamDetail,    
  playerCount,
  seasonRecords,
  seasonTeamSummary,
  createAthlete,      
  updateAthlete,
  deleteAthlete,
  createTryout,  
  updateTryout,
  promoteTryoutToAthlete,
  deleteTryout,  
  listPracticeTeams,
  getPracticeTeamById,
  createPracticeTeam,  
  updatePracticeTeam,
  deletePracticeTeam,
  createTeam,
  assistantCoaches,
  setAssistants,
  updateTeamMeta,
  setRoster,
  getAthletesByTeamId,
  getTryoutsByTeamId,
  getAllPlayersByTeamId,
  myPlayers,
  deleteTeam,
  getPlayerSeasonStats,
  seasonTeamSummaryByTeamId,
  updateTeamNotes
   
} from "../controllers/stats.ctrl.js";
import {  } from "../controllers/user.ctrl.js";
import { getSeasonReports, getSeasonReportById } from "../controllers/reports/season.ctrl.js";
import { getTeamReports, getTeamReportById , updateTeamReportNotes, getPlayersByTeamReportId, updateTeamReportsFromPlayers, getSeasonTeamEfficiency} from "../controllers/reports/team.ctrl.js";
import { getPlayerReports, getPlayerReportById, updatePlayerReportNotes, updatePlayerReportsFromEvents } from "../controllers/reports/player.ctrl.js";
import { compareTeams, comparePlayers } from "../controllers/reports/comparison.ctrl.js";
import { checkRole } from '../middleware/roleCheck.js';  

import {
  getAllTeamsReport,
  getAllTeamSeasons,
  getAllPlayerSeasons,
  getAllMatchNumbers,
  searchPlayerReport,
  getSeasonsByTeam,
  getMatchesByTeamSeason,
  getSeasonsByPlayer,
  getMatchesByPlayerSeason
} from "../controllers/reports/dropdowns.ctrl.js";


const router = express.Router()

router.get("/matches", getAllMatches);

// Get the latest match
// this is being used in dashboard; feel free to use this as needed
router.get("/latestMatch", getLatestMatch);

router.get("/dlsuMatches", getAllDLSUMatches);
router.get("/gameMatches", getAllGameMatch);

router.get("/univGameMatches", getUnivGameMatch);
router.get("/univPracticeMatches", getUnivPracticeMatch);
router.get("/practiceMatches", getAllPracticeMatch);
router.get("/allTeams", getAllTeams);

router.get("/allTeamsbyAffiliation", getTeamsByAffiliation);
router.get("/allAthletes", getAthletesByAffiliation);
router.get("/allAthletesByAffiliation", getAthletesByAffiliation);
router.get("/tryoutsByAffiliation", getTryoutsByAffiliation);
router.get("/allPlayers", getAllPlayersByAffiliation);
router.get("/searchPlayer", searchPlayer);
router.get("/searchTeam", searchTeam);
router.get("/playerDetail", /* ADD CTRL */);

// (Removed duplicate placeholder for /teamDetail; real route is defined below)

// start of esco's routers

router.get("/seasonReports", getSeasonReports);
router.get("/seasonReports/:reportId", getSeasonReportById);

router.get("/teamReports", getTeamReports);
router.get("/teamReports/season-efficiency", getSeasonTeamEfficiency);
router.get("/teamReports/:teamReportId/players", getPlayersByTeamReportId);
router.get("/teamReports/:reportId", getTeamReportById);
router.patch("/teamReports/:reportId", updateTeamReportNotes);
router.patch("/update-team-reports/:matchNo", updateTeamReportsFromPlayers);

router.get("/playerReports", getPlayerReports);
router.get("/playerReports/:reportId", getPlayerReportById);
router.patch("/playerReports/:reportId", updatePlayerReportNotes);
router.patch("/update-player-reports/:matchNo", updatePlayerReportsFromEvents);

// ========== COMPARISON ROUTES ==========
router.get("/compare/team", compareTeams);
router.get("/compare/player", comparePlayers);

// ========== NEW DROPDOWN ROUTES ==========
// Dropdown Routes
router.get("/dropdown/teams", getAllTeamsReport);
router.get("/dropdown/seasons/teams", getAllTeamSeasons);
router.get("/dropdown/seasons/players", getAllPlayerSeasons);
router.get("/dropdown/matches", getAllMatchNumbers);
router.get("/dropdown/players", searchPlayerReport);
router.get("/dropdown/player-seasons/:playerName", getSeasonsByPlayer);
router.get("/dropdown/player-matches/:playerName/:season", getMatchesByPlayerSeason);
// NEW dynamic routes (specific team + season based)
router.get("/dropdown/seasons/:team", getSeasonsByTeam);
router.get("/dropdown/matches/:team/:season", getMatchesByTeamSeason);

router.get("/searchReport", /* ADD CTRL */);

router.get("/allAthletes", allAthletes);
router.get("/allTryouts",  allTryouts);
router.get("/teamsForUI", teamsForUI);
router.get("/teamDetail", teamDetail);
router.get("/playerCount", playerCount);
router.get("/seasonRecords", seasonRecords);
router.get("/seasonTeamSummary", seasonTeamSummary);
router.get("/seasonTeamSummaryByTeamId", seasonTeamSummaryByTeamId)
router.post('/createAthlete', createAthlete); 
router.put("/updateAthlete", updateAthlete);
router.delete("/deleteAthlete", deleteAthlete); 
router.post('/createTryout',  createTryout);
router.put('/updateTryout', updateTryout);
router.post("/promoteTryoutToAthlete", promoteTryoutToAthlete);
router.delete("/deleteTryout", deleteTryout);
router.get("/practice-teams",     listPracticeTeams);
router.get("/practice-teams/:id", getPracticeTeamById);
router.get("/getPracticeTeamById", getPracticeTeamById);
router.post("/createPracticeTeam", createPracticeTeam);
router.put("/updatePracticeTeam", updatePracticeTeam);
router.delete("/deletePracticeTeam", deletePracticeTeam);
router.post("/createTeam", createTeam);
router.get("/assistantCoaches", assistantCoaches);
router.post("/setAssistants", setAssistants);
router.patch("/updateTeamMeta", updateTeamMeta);
router.post("/setRoster", setRoster);

router.get("/athletesByTeamId", getAthletesByTeamId);
router.get("/tryoutsByTeamId", getTryoutsByTeamId);
router.get("/playersByTeamId", getAllPlayersByTeamId);
router.get("/myPlayers", myPlayers);
router.delete('/deleteTeam', deleteTeam);
router.get("/playerSeasonStats", getPlayerSeasonStats);
router.put('/update-team-notes', updateTeamNotes);

export default router;
