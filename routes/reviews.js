var express = require("express");
var router = express.Router({mergeParams: true});
var Place = require("../models/place");
var Review = require("../models/review");

// Reviews Index
router.get("/", function (req, res) {
    Place.findById(req.params.id).populate({
        path: "reviews",
        options: {sort: {createdAt: -1}} // sorting the populated reviews array to show the latest first
    }).exec(function (err, place) {
        if (err || !place) {
            req.flash("error", err.message);
            return res.redirect("back");
        }
        res.render("reviews/index", {place: place});
    });
});

// Reviews New
router.get("/new", isLoggedIn, checkReviewExistence, function (req, res) {
    // middleware.checkReviewExistence checks if a user already reviewed the campground, only one review per user is allowed
    Place.findById(req.params.id, function (err, place) {
        if (err) {
            req.flash("error", err.message);
            return res.redirect("back");
        }
        res.render("reviews/new", {place: place});

    });
});

// Reviews Create
router.post("/", isLoggedIn, checkReviewExistence, function (req, res) {
    //lookup place using ID
    Place.findById(req.params.id).populate("reviews").exec(function (err, place) {
        if (err) {
            req.flash("error", err.message);
            return res.redirect("back");
        }
        Review.create(req.body.review, function (err, review) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            //add author username/id and associated place to the review
            review.author.id = req.user._id;
            review.author.username = req.user.username;
            review.place = place;
            //save review
            review.save();
            place.reviews.push(review);
            // calculate the new average review for the place
            place.rating = calculateAverage(place.reviews);
            //save place
            place.save();
            req.flash("success", "Your review has been successfully added.");
            res.redirect('/places/' + place._id);
        });
    });
});

// Reviews Edit
router.get("/:review_id/edit", checkReviewOwnership, function (req, res) {
    Review.findById(req.params.review_id, function (err, foundReview) {
        if (err) {
            req.flash("error", err.message);
            return res.redirect("back");
        }
        res.render("reviews/edit", {place_id: req.params.id, review: foundReview});
    });
});

// Reviews Update
router.put("/:review_id", checkReviewOwnership, function (req, res) {
    Review.findByIdAndUpdate(req.params.review_id, req.body.review, {new: true}, function (err, updatedReview) {
        if (err) {
            req.flash("error", err.message);
            return res.redirect("back");
        }
        Place.findById(req.params.id).populate("reviews").exec(function (err, place) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            // recalculate place average
            place.rating = calculateAverage(place.reviews);
            //save changes
            place.save();
            req.flash("success", "Your review was successfully edited.");
            res.redirect('/places/' + place._id);
        });
    });
});

// Reviews Delete
router.delete("/:review_id", checkReviewOwnership, function (req, res) {
    Review.findByIdAndRemove(req.params.review_id, function (err) {
        if (err) {
            req.flash("error", err.message);
            return res.redirect("back");
        }
        Place.findByIdAndUpdate(req.params.id, {$pull: {reviews: req.params.review_id}}, {new: true}).populate("reviews").exec(function (err, place) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            // recalculate place average
            place.rating = calculateAverage(place.reviews);
            //save changes
            place.save();
            req.flash("success", "Your review was deleted successfully.");
            res.redirect("/places/" + req.params.id);
        });
    });
});

function calculateAverage(reviews) {
    if (reviews.length === 0) {
        return 0;
    }
    var sum = 0;
    reviews.forEach(function (element) {
        sum += element.rating;
    });
    return sum / reviews.length;
}



//middleware
function isLoggedIn(req, res, next) { 
    //next is the next thing that needs to be called.
    if (req.isAuthenticated()){
        return next();
    }
      req.flash("error", "You need to be logged in to do that");
     return res.redirect("/login");
}
  
//middleware for review checkingowership existence
function checkReviewOwnership(req, res, next) {
    if(req.isAuthenticated()){
        Review.findById(req.params.review_id, function(err, foundReview){
            if(err || !foundReview){
                res.redirect("back");
            }  else {
                // does user own the comment?
                if(foundReview.author.id.equals(req.user._id)) {
                    next();
                } else {
                    req.flash("error", "You don't have permission to do that");
                    res.redirect("back");
                }
            }
        });
    } else {
        req.flash("error", "You need to be logged in to do that");
        res.redirect("back");
    }
};

function checkReviewExistence(req, res, next) {
    if (req.isAuthenticated()) {
        Place.findById(req.params.id).populate("reviews").exec(function (err, foundPlace) {
            if (err || !foundPlace) {
                req.flash("error", "Place not found.");
                res.redirect("back");
            } else {
                // check if req.user._id exists in foundPlace.reviews
                var foundUserReview = foundPlace.reviews.some(function (review) {
                    return review.author.id.equals(req.user._id);
                });
                if (foundUserReview) {
                    req.flash("error", "You already wrote a review.");
                    return res.redirect("/places/" + foundPlace._id);
                }
                // if the review was not found, go to the next middleware
                next();
            }
        });
    } else {
        req.flash("error", "You need to login first.");
        res.redirect("back");
    }
};

module.exports = router;