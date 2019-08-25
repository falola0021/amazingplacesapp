var mongoose = require("mongoose");

//setting up a schema
var placeSchema = new mongoose.Schema({
  name: String,
  image: String,
  imageId : String,
  price: String,
  description:String,
  site: String,
  location:String,
  createdAt: { type: Date, default: Date.now },
  lat: Number,
  lng:Number,
  author:{
    id:{
      type: mongoose.Schema.Types.ObjectId,
      ref:"User"
  },
  username: String
  },
  comments:[
    {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Comment"
    
    }
    ]
});

// create a model
module.exports = mongoose.model("Place", placeSchema);









