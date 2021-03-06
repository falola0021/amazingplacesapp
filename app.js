require("dotenv").config();

var  express               = require("express");
var  app                   = express();
var  bodyParser            = require("body-parser");
var  mongoose              = require("mongoose");
var  methodOverride        = require("method-override");
var  flash                 = require("connect-flash");
app.locals.moment          = require('moment');

var   seedDB               =  require("./seeds")
var  commentRoutes         = require("./routes/comments");
var  placeRoutes           = require("./routes/places");
var  authRoutes            = require("./routes/auth");
var  landingRoutes         = require("./routes/landing");
var  reviewRoutes          = require("./routes/reviews");



var  passport              = require("passport");
var  User                  = require("./models/user");
var  LocalStrategy         = require("passport-local");
var  passportLocalMongoose = require("passport-local-mongoose");

    
// mongoose.connect("mongodb://localhost:27017/beautifulPlaces", {useNewUrlParser: true},function(err) {
//                 if (err) { return console.error('mongoose not connecting')}
//                 });
 
// assign mongoose promise library and connect to database
mongoose.Promise = global.Promise;

const databaseUri = "mongodb+srv://falola0021:dna0021@cluster0-vrmni.mongodb.net/places-app?retryWrites=true&w=majority";

mongoose.connect(databaseUri, {useNewUrlParser: true})
      .then(() => console.log(`Database connected`))
      .catch(err => console.log(`Database connection error: ${err.message}`));


mongoose.set("useCreateIndex", true) ;  //this is used to remove deprecation warning           

app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public")); 
app.use(methodOverride("_method"));
app.use(bodyParser.urlencoded({extended : true}));
app.use(flash());

//seedDB();

//PASSPORT CONFIGURATION
app.use(require("express-session")({ //require inline exp session
        secret: "be rich forever", //used to encode and decode data during session (it's encrypted)
        resave: false,          // required
        saveUninitialized: false   //required
        }));

// code to set up passport to work in our app -> THESE TWO METHODS/LINES ARE REQUIRED EVERY TIME
app.use(passport.initialize());
app.use(passport.session());

//plugins from passportlocalmongoose in user.js file
passport.use(new LocalStrategy(User.authenticate())); //creating new local strategy with user authenticate from passport-local-mongoose
passport.serializeUser(User.serializeUser()); //responsible for encoding it, serializing data and putting it back into session
passport.deserializeUser(User.deserializeUser()); //responsible for reading session, taking data from session that is encoded and unencoding it

//show logged in user
app.use(function (req , res , next){
    res.locals.currentUser    = req.user;
    res.locals.error          = req.flash("error");
    res.locals.success        = req.flash("success")
    next();
    });

app.use(commentRoutes);
app.use(placeRoutes);
app.use(authRoutes);
app.use(landingRoutes);
app.use("/places/:id/reviews", reviewRoutes);

const port = process.env.PORT || 3000;

app.listen( port , function(){ console.log("app is working");});
