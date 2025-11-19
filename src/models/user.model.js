import mongoose from "mongoose";
import bcrypt from "bcryptjs"

const userSchema = new mongoose.Schema({
    user_id:     { type: Number, required: true, unique: true },
    last_name:   { type: String, required: true, trim: true },
    first_name:  { type: String, required: true, trim: true },
    email:       { type: String, required: true, unique: true, lowercase: true },
    password:    { type: String, required: true },
    role:        { type: String, enum: ["Athlete", "Coach", "Admin", "Tryout", "Assistant Coach"], 
    required: true },
    created_at:  { type: Date, default: Date.now }
}, { collection: "users" });

// has pw before saving user to db
userSchema.pre("save", async function(next) {
    if(!this.isModified("password")) return next();
    if (typeof this.password !== "string") return next(new Error("Password must be a string"));

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    
    next()
})

// compare password
userSchema.methods.comparePassword = async function (userPassword) {
    return await bcrypt.compare(userPassword, this.password);
}

const User = mongoose.model("User", userSchema);
export default User;