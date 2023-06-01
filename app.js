//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const app = express();
// upload files
const multer  = require('multer')
const upload = multer({ dest: 'uploads/' });

// Import the crypto module
const crypto = require('crypto');
const nodemailer = require('nodemailer');


// Function to generate a reset token
function generateResetToken() {
  const token = crypto.randomBytes(20).toString('hex');
  return token;
}

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

const { courseDB, story,tutor,student,transaction,notification,review,videos } = require('./db');



// Configure passport
app.use(session({
  secret: "keyboard cat",
  resave: false,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

// Configure passport for Tutor authentication
passport.use("tutor", new LocalStrategy(tutor.authenticate()));

// Configure passport for Student authentication
passport.use("student", new LocalStrategy(student.authenticate()));

// Serialize and deserialize user
passport.serializeUser(function(user, done) {
  done(null, user.id);
});
passport.deserializeUser(async function(id, done) {
  try {
    let user;
    user = await tutor.findById(id);
    if (user) {
      return done(null, user);
    } else {
      user = await student.findById(id);
      return done(null, user);
    }
  } catch (err) {
    return done(err);
  }
});


app.use(function(req, res, next) {
  res.locals.user = req.user; // Assuming req.user contains the authenticated user object
  next();
});
// home page
app.get("/",function(req,res){
    // let msg = "";
    res.render("index", {msg : ""});
  
 
});


// login

var login_msg="";
// Login page
app.get("/login", function(req, res) {
  res.render("login",{msg:""});
});

app.post("/login", function(req, res, next) {
  const { username, password, db } = req.body;
  
  // Use a conditional statement to handle different authentication strategies based on the selected option
  if (db === "tutor") {
    passport.authenticate("tutor", function(err, user, info) {
      // Handle authentication logic for tutor
      if (err) {
        return next(err);
      }
      if (!user) {
        // Authentication failed
        return res.render("login", { msg: "Invalid email or password" });
      }
      req.logIn(user, function(err) {
        if (err) {
          return next(err);
        }
        // Authentication successful
        return res.redirect("/tutor-profile");
      });
    })(req, res, next);
  } else if (db === "student") {
    passport.authenticate("student", function(err, user, info) {
      // Handle authentication logic for student
      if (err) {
        return next(err);
      }
      if (!user) {
        // Authentication failed
        return res.render("login", { msg: "Invalid email or password" });
      }
      req.logIn(user, function(err) {
        if (err) {
          return next(err);
        }
        // Authentication successful
        return res.redirect("/student-profile");
      });
    })(req, res, next);
  } else {
    // Invalid selection, handle error or redirect to an error page
    res.redirect("/login");
  }
});






// Profile page
app.get("/student-profile", function(req, res) {
  if (req.isAuthenticated()&& req.user.role === 'student') {
    res.render("student-profile", { user: req.user ,message:""});
  } else {
    res.redirect("/login");
  }
});
app.get("/tutor-profile", function(req, res) {
  if (req.isAuthenticated()&& req.user.role === 'tutor') {
    res.render("tutor-profile", { user: req.user ,message:""});
  } else {
    res.redirect("/login");
  }
});

// Logout route
app.get("/logout", function(req, res) {
  
  req.logout(function(err) {
    if (err) { return next(err); }
    req.session.destroy(function(errr) {
      if (errr) {
        console.error("Error destroying session:", errr);
      }
      res.redirect("/"); // Redirect to the home page
  });
  
    
  });
});
app.post("/tutor-profile", async function(req, res) {
  // Check if user is authenticated
  if (req.isAuthenticated() && req.user.role === 'tutor') {
    // Get the updated profile data from the request body
    const { name, email, mobile, bank_ac, ifsc, upi_id } = req.body;

    try {
      // Find the user by their id and update their profile information
      const updatedUser = await tutor.findOneAndUpdate(
        { _id: req.user._id },
        { name, email, mobile, bank_Ac: bank_ac, ifsc, upi_id },
        { new: true }
      );

      console.log("Profile updated successfully");
      res.render('tutor-profile', { user: updatedUser, message: "Profile updated successfully" });
    } catch (err) {
      console.error("Error updating profile:", err);
      res.render('tutor-profile', { user: req.user, message: "Not updated." });
    }
  }else {
    res.redirect("/login");
  }
});


// Update profile route
app.post("/student-profile", async function(req, res) {
  // Check if user is authenticated
  if (req.isAuthenticated() && req.user.role === 'student') {
    // Get the updated profile data from the request body
    const { name, email, mobile, degree } = req.body;

    try {
      // Find the user by their id and update their profile information
      const updatedUser = await student.findOneAndUpdate({ _id: req.user._id }, { name, email, mobile, degree }, { new: true });

      console.log("Profile updated successfully");
      res.render('student-profile', { user: updatedUser, message: "Profile updated successfully" });
    } catch (err) {
      console.error("Error updating profile:", err);
      res.render('student-profile', { user: req.user, message: "Not updated." });
    }
  } else {
    res.redirect("/login");
  }
});




// student signup
var student_msg="";


app.get("/studentSignUp",function (req,res) {
  res.render("studentSignUp",{msg : student_msg});
});
// Tutor signup route
app.post("/studentSignUp",function(req,res){
  const { username,name, email, mobile,degree,dob, password, confirm_password } = req.body;

  // Check if password and confirm_password match
  if (password !== confirm_password) {
    res.render("studentSignUp",{ msg: "Password and confirm password do not match" });
  }
  console.log(name);
  // Create a new student object
  const newstudent = new student({
    username,    name,    email,    mobile,    dob, degree
  });

    async function save(){   // Save the student to the database
    try {
      await student.register(newstudent, password);
  
      console.log("Student registered successfully:");
      res.redirect("/login");
    } catch (err) {
      console.error("Error registering Student:", err);
      res.render( "studentSignUp",{msg: "Enter Unique Username" });
    }}
    save();
    
  });


// tuttor_signup
var msg = "";
app.get("/signupasatutor",function (req,res) {
  res.render("tuttor_signup",{msg : msg});
});
// Tutor signup route
app.post("/tuttor_signup", function(req, res) {
  const { username,name, email, mobile, bank_Ac, ifsc, upi_id, password, confirm_password } = req.body;

  // Check if password and confirm_password match
  if (password !== confirm_password) {
    res.render("tuttor_signup",{ msg: "Password and confirm password do not match" });

  }
  console.log(req.body.name);

console.log("tutor");
  // Create a new tutor object
  const newTutor = new tutor({
    username,    name,    email,    mobile,    bank_Ac,    ifsc,    upi_id
  });

    async function save(){   // Save the tutor to the database
    try {
      await tutor.register(newTutor, password);
  
      console.log("Tutor registered successfully:");
      res.redirect("/login");
      
    } catch (err) {
      console.error("Error registering tutor:", err);
      res.render( "tuttor_signup",{msg: "Enter Unique Username" });
      
    }}
    save();
    
  });
  
  function sendResetPasswordEmail(email, resetToken) {
    // Implementation for sending the password reset email
    // Use a library or service to send the email
    // You can use nodemailer, SendGrid, or any other email service of your choice
  
    // Example using nodemailer
    const transporter = nodemailer.createTransport({
      // Configure the transporter settings
      // SMTP settings or other service-specific settings
    });
  
    const mailOptions = {
      from: 'aman7869211@gmail.com',
      to: email,
      subject: 'Password Reset',
      text: `Dear User,\n\nYou have requested to reset your password. Please click on the following link to reset your password: ${resetToken}`,
    };
  
    transporter.sendMail(mailOptions, function(error, info) {
      if (error) {
        console.error('Error sending password reset email:', error);
      } else {
        console.log('Password reset email sent:', info.response);
      }
    });
  }
  
  // Forgot password page
app.get("/forgotPassword", function(req, res) {
  res.render("forgotPassword",{message:""});
});
// Forgot password form submission
app.post("/forgotPassword", function(req, res) {
  const { email , db} = req.body;

  // Find the user by their email
  if (db === "student") {
    student.findOne({ email })
      .exec()
      .then(foundUser => {
        if (!foundUser) {
          return res.render("forgotPassword", { message: "User not found", error: "" });
        }
  
        // Generate a unique token for password reset
        const resetToken = generateResetToken();
  
        // Set the reset token and expiry in the user object
        foundUser.resetPasswordToken = resetToken;
        foundUser.resetPasswordExpires = Date.now() + 3600000; // Token expires in 1 hour
  
        // Save the updated user object
        return foundUser.save();
      })
      .then(savedUser => {
        // Send a password reset email to the user
        sendResetPasswordEmail(savedUser.email, savedUser.resetPasswordToken);
  
        res.render("forgotPassword", { message: "Password reset email sent" });
      })
      .catch(err => {
        console.error("Error finding user:", err);
        res.status(500).json({ error: "Failed to reset password" });
      });
  }
  
  

else{
  tutor.findOne({ email })
  .exec()
  .then(foundUser => {
    if (!foundUser) {
      return res.render("forgotPassword", { message: "User not found", error: "" });
    }

    // Generate a unique token for password reset
    const resetToken = generateResetToken();

    // Set the reset token and expiry in the user object
    foundUser.resetPasswordToken = resetToken;
    foundUser.resetPasswordExpires = Date.now() + 3600000; // Token expires in 1 hour

    // Save the updated user object
    return foundUser.save();
  })
  .then(savedUser => {
    // Send a password reset email to the user
    sendResetPasswordEmail(savedUser.email,savedUser. resetToken);

    res.render("forgotPassword", { message: "Password reset email sent" });
  })
  .catch(err => {
    console.error("Error finding user:", err);
    res.status(500).json({ error: "Failed to reset password" });
  });

}
});
// Password reset page
app.get("/resetPasswordT/:token", function(req, res) {
  const { token } = req.params;

  // Find the user by the reset token and check the token expiry
  tutor.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } }, function(err, foundUser) {
    if (err) {
      console.error("Error finding user:", err);
      return res.render("/resetPasswordT/"+token,{ error: "Failed to reset password" });
    }

    if (!foundUser) {
      return res.render("resetPassword", { error: "Invalid or expired reset token" });
    }

    res.render("resetPassword", { token });
  });
});
app.get("/resetPasswordS/:token", function(req, res) {
  const { token } = req.params;

  // Find the user by the reset token and check the token expiry
  student.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } }, function(err, foundUser) {
    if (err) {
      console.error("Error finding user:", err);
      return res.status(500).json({ error: "Failed to reset password" });
    }

    if (!foundUser) {
      return res.render("resetPassword", { message: "Invalid or expired reset token" });
    }

    res.render("resetPassword", { token });
  });
});
// Password reset form submission
app.post("/resetPassword/:token", function(req, res) {
  const { token } = req.params;
  const { password, confirmPassword } = req.body;

  // Find the user by the reset token and check the token expiry
  tutor.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } }, function(err, foundUser) {
    if (err) {
      console.error("Error finding user:", err);
      return res.status(500).json({ error: "Failed to reset password" });
    }

    if (!foundUser) {
      return res.render("resetPassword", { message: "Invalid or expired reset token" });
    }

    // Check if the new password and confirm password match
    if (password !== confirmPassword) {
      return res.render("resetPassword", { token, message: "New password and confirm password do not match" });
    }

    // Update the user's password
    foundUser.password = bcrypt.hashSync(password, 10);
    foundUser.resetPasswordToken = undefined;
    foundUser.resetPasswordExpires = undefined;
    // Save the updated user object
foundUser.save(function(err) {
  if (err) {
    console.error("Error saving user:", err);
    return res.status(500).json({ error: "Failed to reset password" });
  }

  res.render("resetPassword", { message: "Password reset successful" });
});
});
});




// tutor course manager
app.get('/managecourses',function(req,res){
  if (req.isAuthenticated()&& req.user.role === 'tutor') {
    res.render("managecourses",{msg:"",courses:req.user.course});
  }
  else{
    res.redirect("login");
  }
});
// courses 
app.get('/course/:param',function(req,res){
  if (req.isAuthenticated()&& req.user.role === 'tutor') {
    const id = req.params.param;
courseDB.findById(id)
  .then(course => {
    // console.log(course);
    res.render("updateCourse", { msg: "", course: course });
  })
  .catch(err => {
    console.error(err);
    res.status(404).send("Course not found");
  });

  }
  else{
    res.redirect("/login");
  }
  
});
// post request of Updatecoursesapp.post('/course/:param', async function(req, res) {
  app.post('/course/:param',async function(req, res) {
    if (req.isAuthenticated() && req.user.role === 'tutor') {
      const courseId = req.params.param;
      const { courseName, fees, description, classs } = req.body;
      
      console.log(courseName, fees, description, classs);
     
      
      try {
        // Update the course data in the database or any other storage
        const updatedCourse = await courseDB.findOneAndUpdate({ _id: courseId }, { courseName, fees, description, classs}, { new: true });
  
        if (updatedCourse) {
          // Redirect to the updated course page or any other desired destination
          res.redirect(`/course/${updatedCourse._id}`);
        } else {
          res.status(404).send('Course not found');
        }
      } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred while updating the course.');
      }
    } else {
      res.redirect('/login');
    }
  });
  
// video library
app.get('/videolibrary/:param',async function(req,res){
  if(req.isAuthenticated() && req.user.role === 'tutor'){
    const courseId = req.params.param;
    try {   
      const course = await courseDB.findById(courseId);
      const videos = course.videos; // Assuming 'videos' is the array field in the 'courses' schema
      console.log(videos);
      console.log(videos.length);
      res.render('videolibrary',{videos:videos});
    } catch (error) {
      res.status(500).json({ error: 'Error retrieving videos from video library' });
    }
  } else {
    res.redirect('/login');
  }
  
});
app.post('/videolibrary/:param', upload.single('video'), async (req, res) => {
  if(req.isAuthenticated() && req.user.role === 'tutor'){
    const courseId = req.params.param;
  try {
    // Process form data and uploaded video
    const { courseId, title, description, filename, contentType } = req.body;
    const videoData = req.file;

    // Find the course by ID
    const course = await Course.findById(courseId);

    // Create a new video object with the received data
    const newVideo = {
      title,
      description,
      filename,
      contentType,
      uploadDate: Date.now(),
      data: videoData.buffer
    };

    // Push the new video into the videos array of the course
    course.videos.push(newVideo);

    // Save the course with the updated videos array
    await course.save();

    // Redirect to the video library or display a success message
    res.redirect('/videolibrary');
  } catch (error) {
    console.error('Error uploading video:', error);
    // Handle the error and display an error message
    res.render('error', { error: 'Error uploading video' });
  }
}else{
  res.redirect('/login');
}
});

// buy
app.post('/buy',function(req,res){
  const id = req.body.courseId;
  console.log(id);
  tutor.find({_id:id}).then(result=>{
    console.log(result.length);
    res.render('checkout',{ person: result[0]});
  });
});


// Success Stories page
app.get("/successstories",function(req,res){
    story.find({}).then( result =>{

        res.render("successstories",{stories:result});
    });
});

// routing to post

app.get("/post/:param",function(req,res){
  
  async function post(){
  await story.find({_id:req.params.param}).then(
    result => {
      res.render("post",{data:result[0]});
    }
  );}
  post();

  
  });

// Paid Courses
app.get("/courses/:param",function(req,res){
  const param = req.params.param;
  console.log(param);
  
    course.find().then(result=>{
      res.render('course',{course:result});
    });
  
});

// add courses`
app.get('/addcourses',function(req,res){
  if (req.isAuthenticated()&& req.user.role === 'tutor') {
  res.render('addcourse');
  }else{
  res.redirect("/login");

  }
});
app.post('/addcourses',function(req,res){
  if (req.isAuthenticated()&& req.user.role === 'tutor') {
    const { courseName, fees, classs, description } = req.body;
  
  const addCourse = new courseDB({
    courseName, fees, classs, description });
  addCourse.save().then(savedCourse => {
    // Course saved successfully
    // console.log("Course saved:", savedCourse);

    // Update the tutor's course array
    return tutor.findOneAndUpdate(
      { _id: req.user._id },
      { $push: { course: savedCourse } },
      { new: true }
    );
  })
  .then(updatedTutor => {
    // Tutor updated with the new course
    // console.log("Tutor updated:", updatedTutor);

    // Redirect or send response indicating success
    res.redirect("/addcourses");
  })
  .catch(error => {
    // Handle the error
    console.error("Error adding course:", error);
    res.status(500).send("Failed to add course.");
  });

}else{
  res.redirect("/login");
}
});



app.get('/addstories',function(req,res){
  res.render('addstories');
});
app.post('/addstories',function(req,res){
  const title = req.body.title;
  const author = req.body.author;
  const content = req.body.content;

  const addStory = new story({
    title: title,
    author : author,
    content: content
  });
  addStory.save();
  res.redirect('/addstories');
});

//writereview

  app.get('/writereview',function(req,res){
    res.render('review');
  });
// help

app.get('/helpcenter',function(req,res){
  res.render('help');
});

//search 
app.post('/search',function(req,res){
  console.log(_.lowerCase(req.body.cours));
  tutor.find({ courseName : req.body.cours}).then(result=>{
    console.log(result.length);
    if(result.length===0){
      res.render('index', {msg:"No such Course."})
    }
    else{
    res.render('searchcourse',{course:result});
  }
});
});

//HOD
let hod28, hod32, hod42, hod106;

hod28 = {
  name: 'Ashay Jain',
  department: 'Creative Arts and Design',
  photo : '205121028',
  email: 'dr.ashay@urbanpro.edu',
  phone: '555-1234',
  bio: 'Ashay Jain is the Head of the Creative Arts and Design Department at UrbanPro.',
  work: [
      {
          position: 'Associate Professor',
          company: 'Oxford University',
          years: '2010-2022'
      },
      {
          position: 'Assistant Professor',
          company: 'Canbridge University',
          years: '2005-2010'
      },
      {
          position: 'Postdoctoral Researcher',
          company: 'Hyderabad Research Institute',
          years: '2002-2005'
      }
  ]
};

hod32 = {
  name: 'Avish Mittal',
  department: 'Technology and Programming',
  photo : '205121032',
  email: 'Dr.mittal@urban.edu',
  phone: '555-1235',
  bio: 'Avish Mittal is the Head of the Technology and Programming Department at Example University.',
  work: [
      {
          position: 'Associate Professor',
          company: 'Banaras Hindu University',
          years: '2012-2022'
      },
      {
          position: 'Assistant Professor',
          company: 'Jawaharlal Nehru  University',
          years: '2007-2012'
      },
      {
          position: 'Postdoctoral Researcher',
          company: 'Bodh Gaya  Research Institute',
          years: '2004-2007'
      }
  ]
};


hod42 = {
  name: 'Harshit Sharma',
  department: 'Creative Arts and Design',
  photo : '205121042',
  email: 'dr.harshit@urbanpro.edu',
  phone: '555-1236',
  bio: 'Harshit Sharma is the Head of the Business and Entrepreneurship Department at UrbanPro.',
  work: [
      {
          position: 'Associate Professor',
          company: 'Oxford University',
          years: '2010-2022'
      },
      {
          position: 'Assistant Professor',
          company: 'Canbridge University',
          years: '2005-2010'
      },
      {
          position: 'Postdoctoral Researcher',
          company: 'Hyderabad Research Institute',
          years: '2002-2005'
      }
  ]
};

hod106 = {
  name: 'Yashita Khandelwal',
  department: 'Marketing and Sales',
  photo : '205121106',
  email: 'Dr.yashita@urban.edu',
  phone: '555-1235',
  bio: 'Yashita Khandelwal is the Head of the Marketing and Sales Department at Example University.',
  work: [
      {
          position: 'Associate Professor',
          company: 'Banaras Hindu University',
          years: '2012-2022'
      },
      {
          position: 'Assistant Professor',
          company: 'Jawaharlal Nehru  University',
          years: '2007-2012'
      },
      {
          position: 'Postdoctoral Researcher',
          company: 'Bodh Gaya  Research Institute',
          years: '2004-2007'
      }
  ]
};

// hod ejs
app.get('/hod/:id', (req, res) => {

  const id = req.params.id;
  // console.log(id);
  let hod;
  if(id==='32') hod=hod32;
  else if(id==='28') hod=hod28;
  else if(id==='42') hod=hod42;
  else hod=hod106;

  console.log(hod);
  // render the profile page with the HOD information
  res.render('hod', { hod: hod });
});



app.listen(3000, function() {
  console.log("Server started on port 3000");
});


