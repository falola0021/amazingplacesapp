var express     = require("express");
var router      = express.Router();
var passport    = require("passport");
var User        = require("../models/user");
var Place       = require("../models/place");
var async       = require("async");
var nodemailer  = require("nodemailer");
var crypto      = require("crypto");
var multer = require('multer');

/* Image Upload */
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
      callback(null, Date.now() + file.originalname);
  }
});

var imageFilter = function (req, file, cb) {
  // accept image files only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
      return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};

var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary');

cloudinary.config({ 
  cloud_name: 'adedayo',  
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

//AUTHENTIFICATION ROUTES

/// show register form
router.get("/register", function(req, res){
    res.render("register", {page: 'register'}); 
 });
 
 //handle sign up logic
     router.post("/register", function(req, res){
        var newUser = new User({
            username: req.body.username,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            avatar: req.body.avatar,
            password: req.body.password,
            bio: req.body.bio
            
            });
       
        if(req.body.adminCode === 'falola0021') {
       newUser.isAdmin = true;
      }
     User.register(newUser, req.body.password, function(err, user){
         if(err){
             console.log(err);
             return res.render("register", {error: err.message});
          }else{
           //log the user in
            passport.authenticate("local")(req, res, function(){ 
              //logs the user in and takes care of everything in session and runs serializeuser method
            req.flash("success", "Welcome to Beautiful Places in Lagos " + user.username);
            return res.redirect("/places");
        });
      }
    });
  })
   
// LOGIN ROUTES

//show login form
router.get("/login", function(req, res){
    res.render("login", {page: 'login'}); 
 });
//login logic
router.post("/login", passport.authenticate("local", { //used inside app.post as (middleware - code that runs before final callback)
        successRedirect: "/places",
        failureRedirect: "/login",
    }), function(req, res){
});
//logout
router.get("/logout", function(req, res){
    req.logout(); //logs them out via passport
    req.flash("success", "You are logged out! ");
    return res.redirect("/places");
});

function isLoggedIn(req, res, next) { //next is the next thing that needs to be called.
    if (req.isAuthenticated()){
        return next();
    }
        res.redirect("/login");
}

// forgot password
router.get('/forgot', function(req, res) {
    res.render('forgot');
  });
  
  router.post('/forgot', function(req, res, next) {
    async.waterfall([
      function(done) {
        crypto.randomBytes(20, function(err, buf) {
          var token = buf.toString('hex');
          done(err, token);
        });
      },
      function(token, done) {
        User.findOne({ email: req.body.email }, function(err, user) {
          if (!user) {
            req.flash('error', 'No account with that email address exists.');
            return res.redirect('/forgot');
          }
  
          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  
          user.save(function(err) {
            done(err, token, user);
          });
        });
      },
      function(token, user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: 'Gmail', 
          auth: {
            user: 'falola0021@gmail.com',
            pass:  process.env.GMAILPW   
          }
        });
        var mailOptions = {
          to: user.email,
          from: 'falola0021@gmail.com',
          subject: 'Beautiful places Password Reset',
          text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            'http://' + req.headers.host + '/reset/' + token + '\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n'
        };
        smtpTransport.sendMail(mailOptions, function(err) {
          console.log('mail sent');
          req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
          done(err, 'done');
        });
      }
    ], function(err) {
      if (err) return next(err);
      res.redirect('/forgot');
    });
  });
  
  router.get('/reset/:token', function(req, res) {
    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
      if (!user) {
        req.flash('error', 'Password reset token is invalid or has expired.');
        return res.redirect('/forgot');
      }
      res.render('reset', {token: req.params.token});
    });
  });
  
  router.post('/reset/:token', function(req, res) {
    async.waterfall([
      function(done) {
        User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
          if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('back');
          }
          if(req.body.password === req.body.confirm) {
            user.setPassword(req.body.password, function(err) {
              user.resetPasswordToken = undefined;
              user.resetPasswordExpires = undefined;
  
              user.save(function(err) {
                req.logIn(user, function(err) {
                  done(err, user);
                });
              });
            })
          } else {
              req.flash("error", "Passwords do not match.");
              return res.redirect('back');
          }
        });
      },
      function(user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: 'Gmail', 
          auth: {
            user: 'falola0021@gmail.com',
            pass: process.env.GMAILPW
          }
        });
        var mailOptions = {
          to: user.email,
          from: 'falola0021@mail.com',
          subject: 'Your password has been changed',
          text: 'Hello,\n\n' +
            'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
        };
        smtpTransport.sendMail(mailOptions, function(err) {
          req.flash('success', 'Success! Your password has been changed.');
          done(err);
        });
      }
    ], function(err) {
      res.redirect('/places');
    });
  });

//USERS PROFILE ROUTE
router.get("/users/:id", function(req, res){
    User.findById(req.params.id, function(err , foundUser){
        if(err){
            req.flash("err" , "something went wrong");
            res.redirect("/places");
        }
        Place.find().where("author.id").equals(foundUser._id).exec( function (err,places){
            if(err){
                req.flash("err" , "something went wrong");
                res.redirect("/places");
            }
        
        res.render("users/profile" , {profile:foundUser, places:places});
    })
    });
 });

   module.exports = router;