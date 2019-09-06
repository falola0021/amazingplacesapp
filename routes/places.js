var express     = require("express");
var router      = express.Router();
var passport    = require("passport");
var User        = require("../models/user");
var Place       = require("../models/place");
var Review = require("../models/review");
var NodeGeocoder = require('node-geocoder');
var request = require("request");
var multer = require('multer');


/*======================================================
                    VARIABLES
=======================================================*/

var options = {
    provider: 'google',
    httpAdapter: 'https',
    apiKey: process.env.GEOCODER_API_KEY,
    formatter: null
  };
   
  var geocoder = NodeGeocoder(options);
  
  /*======================================================
                      FUNCTIONS
  =======================================================*/
  
  /* Fuzzy Search */
  function escapeRegex(text) {
      return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
  };
  
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
  
  /*======================================================
                      PLACE ROUTES
  =======================================================*/
  
  /* INDEX - show all places */
  router.get("/places", function(req, res){
    
    //pagination
    var perPage = 9;
    var pageQuery = parseInt(req.query.page);
    var pageNumber = pageQuery ? pageQuery : 1;
     
    //fuzzy search
    var noMatch = null;
  
      if(req.query.search){
          const regex = new RegExp(escapeRegex(req.query.search), 'gi');
          
          /* Search for name */
          Place.find({name: regex}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function(err, allPlaces){
            Place.countDocuments({name: regex}).exec(function (err, count) {
            if(err){
            console.log(err);
              } else {
                  if(allPlaces.length < 1) {
                      noMatch = "No place match that query, please try again.";
                  }
                  /* console.log(allPlaces); List of all places from db */
                  res.render("places/index", {
                      places: allPlaces, 
                      page: 'places',
                       noMatch: noMatch,
                       current: pageNumber,
                       pages: Math.ceil(count / perPage),
                       search: req.query.search
                    });
                }
            });
        });
              
      } else {
          /* Get all places from the db */

          Place.find({}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, allPlaces) {
            Place.countDocuments().exec(function (err, count) {
                if (err) {
                    console.log(err);
                } else {
                    res.render("places/index", {
                        places: allPlaces,
                        noMatch: noMatch,
                        search: false,
                         page: 'places',
                        current: pageNumber,
                        pages: Math.ceil(count / perPage)
                    });
                }
            });
        });
    }
});







//           Place.find({}, function(err, allPlaces){
//               if(err){
//                   console.log(err);
//               } else {
//                   /* console.log(allPlaces); List of all places from db */
//                   res.render("places/index", {places: allPlaces, page: 'places', noMatch: noMatch});
//               }
//           });
//       }
  
//   });
  
  /* CREATE - add new place to database */
  router.post("/places", isLoggedIn, upload.single("image"), function(req, res) {
    // get data from form and add to places array
    var name = req.body.place.name;
    var description = req.body.place.description;
    var author = {
        id: req.user._id,
        username: req.user.username
    };
    var price = req.body.place.price;
    var site =req.body.place.site;
    
  
    geocoder.geocode(req.body.location, function (err, data) {
      if (err || !data.length) {
          console.log(err);
          req.flash('error', 'Invalid address');
          return res.redirect('back');
      } 
      // add cloudinary url for the image to the place object under image property
      cloudinary.v2.uploader.upload(req.file.path, function(err, result) {
          if(err) {
              req.flash("error", err.message);
              return res.redirect("back");
          }
          var image = result.secure_url;
          var imageId = result.public_id;
  
  
          var lat = data[0].latitude;
          var lng = data[0].longitude;
          var location = data[0].formattedAddress;
          var newPlace = {
              name: name,
              image: image,
              imageId: imageId,
              site:site,
              description: description,
              price:price,
              author:author,
              location: location,
              lat: lat,
              lng: lng
          };
      
          // Create a new place and save to DB
          Place.create(newPlace, function(err, newlyCreated){
              if(err){
                  req.flash("error", err.message);
                  return res.redirect("back");
              } else {
                  //redirect back to places page
                  console.log(newlyCreated);
                  res.redirect("/places/" + newlyCreated._id);
              }
          });
      });
  
    });
  
  });
  
  /* NEW - form to create new place */
  router.get("/places/new", isLoggedIn, function(req, res){
      res.render("places/new");
  });
  

// SHOW - shows more info about one place
router.get("/places/:id", function (req, res) {
    //find the place with provided ID
    Place.findById(req.params.id).populate("comments likes").populate({
        path: "reviews",
        options: {sort: {createdAt: -1}}
    }).exec(function (err, foundPlace) {
        if (err) {
            console.log(err);
        } else {
            //render show template with that place
            res.render("places/show", {place: foundPlace});
        }
    });
});


  
  /* EDIT */
  router.get("/places/:id/edit", checkPlaceOwnership, function(req, res){
      Place.findById(req.params.id, function(err, foundPlace){
          if(err){
              req.flash("error", "place not found");
              res.redirect("/places");
              console.log(err);
          } else {
              res.render("places/edit", {place: foundPlace});
          }
      });
  });
  
  /* UPDATE */
  router.put("/places/:id", checkPlaceOwnership, upload.single("image"), function(req, res){
  
    geocoder.geocode(req.body.location, function (err, data) {
      if (err || !data.length) {
        console.log(err);
        req.flash('error', 'Invalid address');
        return res.redirect('back');
      }
  
      Place.findById(req.params.id, async function(err, place){
          if(err){
              req.flash("error", err.message);
              res.redirect("back");
          } else {
              if(req.file) {
                  try {
                      await cloudinary.v2.uploader.destroy(place.imageId);
                      var result = await cloudinary.v2.uploader.upload(req.file.path);
                      place.image = result.secure_url;
                      place.imageId = result.public_id;
                  } catch(err) {
                      req.flash("error", err.message);
                      return res.redirect("back");
                  }
              }
  
              place.lat         = data[0].latitude;
              place.lng         = data[0].longitude;
              place.location    = data[0].formattedAddress;
              place.name        = req.body.place.name;
              place.price       = req.body.place.price;
              place.description = req.body.place.description;
              place.site = req.body.place.site;
              
              place.save();
              req.flash("success", "Successfully Updated place!");
              res.redirect("/places/" + place._id);
          }
      });
    });
   
  });
  



// DESTROY PLACE ROUTE
router.delete("/places/:id", checkPlaceOwnership, function (req, res) {
    Place.findById(req.params.id, async  function (err, place) {
        if (err) {
            req.flash("error", "place not found");
            res.redirect("/places");
        } else {
            try {
                 await cloudinary.v2.uploader.destroy(place.imageId);
                                  place.remove();
                                  req.flash('success', 'place deleted successfully!');
                                  res.redirect('/places');
                              } catch(err) {
                                  if(err) {
                                    req.flash("error", err.message);
                                    return res.redirect("back");
                                  }
                                }
            // deletes all comments associated with the place
            Comment.remove({"_id": {$in: place.comments}}, function (err) {
                if (err) {
                    console.log(err);
                    return res.redirect("/places");
                }
                // deletes all reviews associated with the campground
                Review.remove({"_id": {$in: place.reviews}}, function (err) {
                    if (err) {
                        console.log(err);
                        return res.redirect("/places");
                    }
                    //  delete the campground
                    place.remove();
                    req.flash("success", "Place deleted successfully!");
                    res.redirect("/places");
                });
            });
        }
    });
});

  // place Like Route
router.post("/places/:id/like", isLoggedIn, function (req, res) {
    Place.findById(req.params.id, function (err, foundPlace) {
        if (err) {
            console.log(err);
            return res.redirect("/places");
        }

        // check if req.user._id exists in foundPlace.likes
        var foundUserLike = foundPlace.likes.some(function (like) {
            return like.equals(req.user._id);
        });

        if (foundUserLike) {
            // user already liked, removing like
            foundPlace.likes.pull(req.user._id);
        } else {
            // adding the new user like
            foundPlace.likes.push(req.user);
        }

        foundPlace.save(function (err) {
            if (err) {
                console.log(err);
                return res.redirect("/places");
            }
            return res.redirect("/places/" + foundPlace._id);
        });
    });
});



  //middleware
  function isLoggedIn(req, res, next) { 
    //next is the next thing that needs to be called.
    if (req.isAuthenticated()){
        return next();
    }
      req.flash("error", "You need to be logged in to do that");
     return res.redirect("/login");
}
  //checkownership
   function checkPlaceOwnership(req, res, next){
    //if user is logged in
    if(req.isAuthenticated()){
       Place.findById(req.params.id, function (err, foundPlace){
    if(err){
        req.flash("error", "Place not found");
        res.redirect("/places");
     } else{
    //does user own the place?
    if(foundPlace.author.id.equals(req.user._id) || req.user.isAdmin){
       next() ;
     }else{
           req.flash("error", "You dont have the permission to do that");
            return res.redirect("back");
        }
      }
})
       }else{
        res.redirect("back");
       }
}
  
  module.exports = router;


