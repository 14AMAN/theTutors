const express = require("express");
const app = express();
const _ = require("lodash");

const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const mongoose = require("mongoose");

// connection
mongoose.connect("mongodb://127.0.0.1:27017/UrbanProDB",{
  
useNewUrlParser: true,
useUnifiedTopology: true
})
.then(() => console.log('Database connected successfully'))
.catch((err) => console.error('Database connection error: ', err));

const schema = mongoose.Schema;

// stories
const storySchema = new schema({
  title : String,
  name : String,
  content : String,
  photo: {
    data: Buffer,
    contentType: String
  }
});

// reviews
const reviewSchema = new schema({
    title: String,
    content : String    
  });

// courses
const coursesSchema = new schema({
    courseName: String,
    fees :Number,
    reviews: [reviewSchema],
    ratings: {
        type: {
          fiveStar: { type: Number, default: 0 },
          fourStar: { type: Number, default: 0 },
          threeStar: { type: Number, default: 0 },
          twoStar: { type: Number, default: 0 },
          oneStar: { type: Number, default: 0 }
        },
        default: {
          fiveStar: 0,
          fourStar: 0,
          threeStar: 0,
          twoStar: 0,
          oneStar: 0
        }
      },
      videos: [
        {
          title: String,
          description: String,
          filename: String,
          contentType: String,
          uploadDate: { type: Date, default: Date.now }
        }
      ],
      average_rating : {
        type: Number,
        min: 0,
        max: 5,
      },
      description : String,
      classs : String
  
    
  });
//   Notification

const notifySchema = new schema({
    message : String,
    read : Boolean
});
// Transaction
const transactionSchema = new schema({
    
    course : coursesSchema,
    
    tutor : String,
    amount : Number
});

  // students
const studentSchema = new schema({
    name: String,
    mobile : Number,
    email : String,
    password: String,
    username:String ,
    role: {
      type: String,
      default: "student"
    }
    ,
    photo: {
        data: Buffer,
        contentType: String
      },
      degree: String,
      dob : Date,
      purchasedCourse : [coursesSchema],
      notification : [notifySchema],
      wishlist : [coursesSchema],
      transaction : [transactionSchema]
  });
  
// tutors
const tutorSchema = new schema({
  username:String,
  name : String,
  role: {
    type: String,
    default: "tutor"
  }
  ,
  mobile : Number,
  email : String,
  password : String,
  bank_Ac : Number,
  ifsc : String,
  upi_id : String,
  course :[coursesSchema],
  student : [studentSchema],
  photo: {
    data: Buffer,
    contentType: String
  }
});

// schema
const course = mongoose.model("course",coursesSchema);
const  story = mongoose.model("story",storySchema);
// Apply passport-local-mongoose to the tutor and student models
tutorSchema.plugin(passportLocalMongoose);
studentSchema.plugin(passportLocalMongoose);

// Create the tutor and student models
const tutor = mongoose.model("tutor",tutorSchema);
const student = mongoose.model("student" , studentSchema);

const transaction = mongoose.model("transaction" , transactionSchema);
const notification = mongoose.model("notification" , notifySchema);
const review = mongoose.model("review" , reviewSchema);

module.exports = {
    course,    story,tutor,student,transaction,notification,review
    // Add other exported functions as needed
  };
