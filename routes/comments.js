var express= require("express");
var router= express.Router();
var Place = require("../models/place");
var Comment = require("../models/comment");


//"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
 //COMMENT ROUTE
 //""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
 
 
 router.get("/places/:id/comments/new" ,isLoggedIn, function(req ,res){
    //find place by id
    Place.findById(req.params.id , function(err,place){
        if(err){console.log(err);        
        } else{res.render("comments/new" , {place:place});
            
        }
        
    });
});

router.post("/places/:id/comments",isLoggedIn, function(req , res){
    Place.findById(req.params.id , function(err, place){
    if(err){
        req.flash("error", "something went wrong");
  
       return  res.redirect("/places");
    }   else { 
       
        Comment.create(req.body.comment , function(err, comment){
            if(err){console.log(err);
                
            }else {
                //add username and id to comment
                comment.author.id = req.user._id;
                comment.author.username = req.user.username;
                //save comment
                comment.save();
                place.comments.push(comment);
                place.save();
                req.flash("success", "successfully added comment");
              return  res.redirect("/places/" + place._id);
            }
        }) ;
    }
    
    });
});

//comment EDIT ROUTE
router.get("/places/:id/comments/:comment_id/edit" , checkCommentOwnership, function (req , res ){
    
    Comment.findById(req.params.comment_id, function (err, foundComment){
        if (err) {
            res.redirect("back")
         }else{
   res.render("comments/edit",{place_id:req.params.id , comment:foundComment});
         };
   });
  });

//COMMENT UPDATE ROUTE.....this is also part of the comment edit route
router.put("/places/:id/comments/:comment_id",checkCommentOwnership, function(req , res){
    //using sanitize
   //  req.body.campground.body = req.sanitize(req.body.campground.body);
 Comment.findByIdAndUpdate(req.params.comment_id , req.body.comment , function(err , updatedComment){
    if(err){
        res.redirect("back");
    }  else{
        res.redirect("/places/" + req.params.id);
    }
 });
});
 //COMMENT DELETE ROUTE

 router.delete("/places/:id/comments/:comment_id",checkCommentOwnership, function(req , res){
    
     Comment.findByIdAndRemove(req.params.comment_id, function (err){
         if(err){
             res.redirect("/back");
            }   else{
                req.flash("success", "comment removed");
           return res. redirect("/places/" + req.params.id);
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
    
    
    function checkCommentOwnership(req, res, next){
    
        //if user is logged in
        if(req.isAuthenticated()){
            Comment.findById(req.params.comment_id, function (err, foundComment){
        if(err){
            res.redirect("back");
        } else{
        //does user own the comment?
        if(foundComment.author.id.equals(req.user._id)|| req.user.isAdmin){
           next() ;
        }   else{
            req.flash("error", "You dont have permission to do that");
           return res.redirect("back");
        }
        }
         
        });
            
        }else{
            req.flash("error", "You need to be logged in to do that");
           return res.redirect("back");
        }
    }
    

module.exports = router;