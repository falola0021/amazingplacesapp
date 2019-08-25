var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

var UserSchema = new mongoose.Schema({
    username: {type:String, unique:true , required:true},
    password: String,
    image: String,
    bio:String,
    avatar:String,
    firstName: String,
    lastName: String,
    email: {type:String, unique:true , required:true},
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    isAdmin: {type: Boolean, default: false}
});

UserSchema.plugin(passportLocalMongoose); //takes required PLM package and adds methods from PLM to UserSchema and allows user auth

module.exports = mongoose.model("User", UserSchema);