import Athlete from "../models/athletes.model.js";
import Coach from "../models/coaches.model.js";
import AsstCoach from "../models/asst-coach.model.js";
import Tryout from "../models/tryouts.model.js";
import Teams from "../models/teams.model.js"

export async function getTeamsHandle(affiliatedTo) {
  return await Teams.findOne({affiliation: affiliatedTo})  
}

export async function getAthleteByUserId(userId) {
  return await Athlete.findOne({ user_id: userId });
}

export async function getCoachByUserId(userId) {
  return await Coach.findOne({ user_id: userId });
}

export async function getAsstCoachByUserId(userId) {
  return await AsstCoach.findOne({ user_id: userId });
}

export async function getTryoutByUserId(userId) {
  return await Tryout.findOne({ user_id: userId });
}

function cleanDocument(doc) {
  if (!doc) return {};
  const obj = typeof doc.toObject === "function" ? doc.toObject() : doc;
  const { _id, __v, ...rest } = obj;
  return rest;
}

export async function getUserDetailsByRole(role, userId) {
  console.log("ROLE: ", role)
  console.log("USER: ", userId)
  let roleDoc;
  let affiliatedTo;

  switch (role) {
    case "Athlete":
      const athlete = await getAthleteByUserId(userId);
      affiliatedTo = await getTeamsHandle(athlete.team);
      roleDoc = {
        ...athlete.toObject(),
        team: affiliatedTo ? affiliatedTo.name : null,
      }
      break;
    case "Coach":
      roleDoc = await getCoachByUserId(userId);
      break;
    case "Assistant Coach":
      roleDoc = await getAsstCoachByUserId(userId);
      break;
    case "Tryout":
      const tryout = await getTryoutByUserId(userId);
      affiliatedTo = await getTeamsHandle(tryout.team);
      roleDoc = {
        ...tryout.toObject(),
        team: affiliatedTo ? affiliatedTo.name : "",
      }
      break;
    default:
      console.warn("⚠️ Unknown role:", role);
      return {};
  }

  const cleaned = cleanDocument(roleDoc);

  return cleaned;
}
