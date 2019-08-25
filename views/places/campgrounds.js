var express= require("express");
var router= express.Router();
var Campground = require("../models/campground");

// INDEX ROUTE:show all campgrounds
router.get("/campgrounds" , function (req , res ){
    
 //get all campgrounds from database
      Campground.find({}, function(err,allCampgrounds){
      if(err){console.log(err);
     } else{ res.render("campgrounds/index" , {campgrounds:allCampgrounds});
     }
 });
 });
   
   //CREATE ROUTE:add new campground to database
router.post("/campgrounds" ,isLoggedIn, function (req , res ){
  //get data from form and add to campground array
   var name = req.body.name;
    var image = req.body.image;
    var description = req.body.description;
    var newCampgrounds = {name : name , image : image , description : description};
 
 //create a new campground and save to database
     Campground.create(newCampgrounds,function(err,newlyCreated){
         if(err){console.log(err);
        }
       else{ //redirect to the campground page
            res.redirect("/campgrounds");
        }
    });
    
   
   
});

//NEW:show form to create new campground
router.get("/campgrounds/new" ,isLoggedIn, function (req , res ){

    res.render("campgrounds/new");
});

//SHOW ROUTE:show more infomation about clicked item
router.get("/campgrounds/:id" , function (req , res ){
    //find the campground with provided  ID
    Campground.findById( req.params.id).populate("comments").exec(function(err,foundCampground){
         if(err){console.log(err);
        }
       else{ 
           console.log(foundCampground);
      //render show template with that campground
           res.render("campgrounds/show", {campground:foundCampground});
            
        }
});
});

//middleware
function isLoggedIn(req, res, next) { //next is the next thing that needs to be called.
    if (req.isAuthenticated()){
        return next();
    }
    res.redirect("/login");
}

module.exports = router;