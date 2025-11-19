import express from "express"
import jwt from "jsonwebtoken"
import User from "../models/user.model.js";
import { getUserDetailsByRole, getTeamsHandle } from "../controllers/user.ctrl.js";
import bcrypt from "bcryptjs";
import athletesModel from "../models/athletes.model.js";
import asstCoachModel from "../models/asst-coach.model.js";
import coachesModel from "../models/coaches.model.js";
import tryoutsModel from "../models/tryouts.model.js";

const router = express.Router()

const generateToken = (userId) => {
    return jwt.sign({userId}, process.env.JWT_SECRET, {expiresIn: "15d"});
}

router.post("/register", async (req, res) => {
    try {
        const { firstName, lastName, email, password, confirmPassword, role } = req.body;

        // console.log("📥 Register request body:", { firstName, lastName, email, password, confirmPassword, role});

        if (!firstName || !lastName || !email || !password || !confirmPassword || !role) {
        return res.status(400).json({ message: "All fields are required." });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match." });
        }

        // check if email exists
        const existingUser = await User.findOne({email});
        if(existingUser){
            return res.status(400).json({message: "Email already in use."});
        }

        // get latest user_id (add +1)
        const lastUser = await User.findOne().sort({user_id: -1});
        const newUserId = lastUser ? lastUser.user_id + 1 : 1;

       
        const newUser = new User({
            user_id: newUserId,
            first_name: firstName,
            last_name: lastName,
            email,
            password,
            role, 
        })

        await newUser.save();

        // registering the roles
        switch(role.toLowerCase()) {
            case "athlete":
                const lastPlayer = await athletesModel.findOne().sort({player_id:-1}); // sort in descending order so the document with highest player_id comes first
                const newPlayerId = lastPlayer ? lastPlayer.player_id + 1 : 1;

                await new athletesModel({
                    player_id: newPlayerId,
                    user_id: newUser.user_id,
                    first_name: firstName,
                    last_name: lastName,
                    // team: "", // apply default
                    // position: "", //will be updated later
                    status: ["Active"],
                    // jersey_no: null // apply default
                    // height: null, // apply default
                    // weight: null, // apply default
                }).save();
                break;
            
            case "assistant coach":
                const lastAsst = await asstCoachModel.findOne().sort({ asst_coach_id: -1 });
                const newAsstId = lastAsst ? lastAsst.asst_coach_id + 1 : 1;
                console.log("Last assistant coach found:", lastAsst); 

                await new asstCoachModel({
                    asst_coach_id: newAsstId,
                    user_id: newUser.user_id,
                    first_name: firstName,
                    last_name: lastName,
                    // affiliation: [], // apply default
                    // teams_handled: [], // apply default
                }).save();
                break;

            case "coach":
                const lastCoach = await coachesModel.findOne().sort({ coach_id: -1 });
                const newCoachId = lastCoach ? lastCoach.coach_id + 1 : 1;

                await new coachesModel({
                    coach_id: newCoachId,
                    user_id: newUser.user_id,
                    first_name: firstName,
                    last_name: lastName,
                    // affiliation: [], // apply default
                    // teams_handled: [], // apply default
                }).save();
                break;

            case "tryout":
                const lastTryout = await tryoutsModel.findOne().sort({ tryout_id: -1 });
                const newTryoutId = lastTryout ? lastTryout.tryout_id + 1 : 1;
                
                await new tryoutsModel({
                    tryout_id: newTryoutId,
                    user_id: newUser.user_id,
                    first_name: firstName, 
                    last_name: lastName,
                    // team: "", // will be updated later
                    // position_pref: "", // will be updated later
                    tryout_status: "Draft",
                }).save();
                break;
            
            default:
                console.warn("Unknown role, no additional entry created");
                break;
        }

        // generate JWT
        const token = generateToken(newUser._id);

        // check if user exists
        const user = await User.findOne({email: email.trim().toLowerCase()});
        if(!user) return res.status(400).json({message: "User does not exist."});

        // Fetch role-specific details
        const roleDetails = await getUserDetailsByRole(user.role, user.user_id);


        res.status(201).json({
            token,
            user: {
                id: newUser._id,
                user_id: newUser.user_id,
                firstName: newUser.first_name,
                lastName: newUser.last_name,
                email: newUser.email,
                role: newUser.role,
                details: roleDetails,  // role-specific details
            },
            });
    } catch (e) {
        console.error("Register error:", e);
        res.status(500).json({ message: "Internal server error." });
    }
});

router.post("/login", async (req, res) => {
    try {
        const {email, password} = req.body;

        if(!email || !password) return res.status(400).json({message: "All fields are required"});

        // check if user exists
        const user = await User.findOne({email: email.trim().toLowerCase()});
        if(!user) return res.status(400).json({message: "User does not exist."});

        // check if password is correct
        const isPasswordCorrect = await bcrypt.compare(password.trim(), user.password);
        if (!isPasswordCorrect)
        return res.status(400).json({ message: "Invalid Credentials" });
        // generate token
        const token = generateToken(user._id);

        // clean mongo documents
        function cleanDocu(doc){
            if(!doc) return {};
            const { _id, __v, ...rest } = doc.toObject(); // remove Mongo internal fields
            return rest;
        }

        // Fetch role-specific details
        const roleDetails = await getUserDetailsByRole(user.role, user.user_id);

        res.status(200).json({
            token,
            user: {
                id: user.user_id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                details: roleDetails,  // role-specific details
            }
        })

    } catch (e) {
        console.log("Error in login route", e);
        res.status(500).json({ message: "Internal server error"});
    }
});

router.get(":/id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id).lean();
        if (!user) return res.status(404).json({ message: "User not found" });

        // user details
        const details = await getUserDetailsByRole(user.role, user.user_id);
        res.status(200).json({
        ...user,
        details
        });
    } catch (e) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
})

export default router;