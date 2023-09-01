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
    filename : String,
    contentType: String
  }
});

// reviews
const reviewSchema = new schema({
    title: String,
    content : String    
  });
// videos
const videoSchema = new schema({
  title: String,
  description: String,
  filename: String,
  uploadDate: { type: Date, default: Date.now }
  
});
// photo

// courses
const coursesSchema = new schema({
    courseName: String,
    fees :Number,
    reviews: [reviewSchema],
    
      videos: [videoSchema],
      average_rating : {
        type: Number,
        min: 0,
        max: 5,
      },
      description : String,
      classs : String,
      teacher: { type: schema.Types.ObjectId, ref: 'tutor' },
      teacher_name : String
    
  });
//   Notification

const notifySchema = new schema({
    message : String,
    read : Boolean
});
// Transaction
const transactionSchema = new schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'course' },
  paymentId: String,
  std: { type: mongoose.Schema.Types.ObjectId, ref: 'student' },
  stdName: String,
 
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
      filename : String,
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
  photo: {
    filename : String,
    contentType: String
  },
  about : String
});

// schema
const courseDB = mongoose.model("course",coursesSchema);
const  story = mongoose.model("story",storySchema);
// Apply passport-local-mongoose to the tutor and student models
tutorSchema.plugin(passportLocalMongoose);
studentSchema.plugin(passportLocalMongoose);

// Create the tutor and student models
const tutor = mongoose.model("tutor",tutorSchema);
const student = mongoose.model("student" , studentSchema);
const videos = mongoose.model("videos" , videoSchema);

const transaction = mongoose.model("transaction" , transactionSchema);
const notification = mongoose.model("notification" , notifySchema);
const review = mongoose.model("review" , reviewSchema);

module.exports = {
    courseDB,    story,tutor,student,transaction,notification,review,videos
    // Add other exported functions as needed
  };
