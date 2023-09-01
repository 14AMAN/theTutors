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
const CryptoJS = require('crypto-js');
const app = express();
// upload files
const multer  = require('multer')
// environment varibale
const dotenv = require('dotenv');
dotenv.config(); // Load environment variables from .env file

// razorpay
const Razorpay = require('razorpay');

// // async-await
// const util = require('util');
// const decryptAsync = util.promisify(decrypt);

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

// const multer = require('multer');

const storage = multer.diskStorage({
  destination: 'public/uploads/',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = uniqueSuffix + '-' + file.originalname;
    cb(null, filename);
  }
});

const upload = multer({ storage: storage });


const { 
  courseDB, story,tutor,student,transaction,notification,review,videos } = require('./db');



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
    if(req.user)
    console.log(req.user.name);
    res.render("index", {msg : "",tutor1:req.user});
  
 
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
    console.log(req.user.role);
    const { name, email, about,mobile, bank_ac, ifsc, upi_id } = req.body;

    try {
      // Find the user by their id and update their profile information
      const updatedUser = await tutor.findOneAndUpdate(
        { _id: req.user._id },
        { name, email,about, mobile, bank_Ac: bank_ac, ifsc, upi_id },
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
  const { username,name,about, email, mobile, bank_Ac, ifsc, upi_id, password, confirm_password } = req.body;

  // Check if password and confirm_password match
  if (password !== confirm_password) {
    res.render("tuttor_signup",{ msg: "Password and confirm password do not match" });

  }else{
  console.log(req.body.name);

console.log("tutor");
  // Create a new tutor object
  const newTutor = new tutor({
    username,    name, about,    email,    mobile,    bank_Ac,    ifsc,    upi_id
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
  }
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
  if (req.isAuthenticated()) {
    // console.log(req.user.course);
    if(req.user.role === 'tutor'){
    res.render("managecourses",{msg:"",courses:req.user.course});
    }
    else if(req.user.role === 'student'){
    res.render("managecourses",{msg:"",courses:req.user.purchasedCourse});

    }
  }
  else{
    res.redirect("login");
  }
});
// courses 
app.get('/course/:param',function(req,res){
  if (req.isAuthenticated()) {
    const id = req.params.param;
courseDB.findById(id)
  .then(course => {
    // console.log(course);
    if(req.user.role === 'tutor'){
    res.render("updateCourse", { msg: "", course: course });
    }
    if(req.user.role === 'student'){   
                
        res.render("boughtCourses",{videos:course.videos,id:id});
    }
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
  // update must be done to tutor as wel as course
  app.post('/course/:param',async function(req, res) {
    if (req.isAuthenticated() && req.user.role === 'tutor') {
      const courseId = req.params.param;
      const TutorId = req.user._id;
      const { courseName, fees, description, classs } = req.body;
      
      // console.log(courseName, fees, description, classs);
     
      
      try {
        // Update the course data in the database or any other storage
        const updatedCourse = await courseDB.findOneAndUpdate({ _id: courseId }, { courseName, fees, description, classs}, { new: true });
        const updatedTutor = await tutor.findOneAndUpdate(
          { _id: TutorId, 'course._id': courseId },
          {
            $set: {
              'course.$.courseName': courseName,
              'course.$.fees': fees,
              'course.$.description': description,
              'course.$.classs': classs
            }
          },
          { new: true }
        );
      
        // console.log(updatedTutor);
  
        if (updatedCourse && updatedTutor) {
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
    const id = req.params.param;
    courseDB.findById(id).then(course=>{
    res.render("videolibrary",{videos:course.videos,id:id});   
});
} else {
    res.redirect('/login');
  }
  
});
app.post('/videolibrary/:param', upload.single('video'), async (req, res) => {
  if (req.isAuthenticated() && req.user.role === 'tutor') {
    const courseId = req.params.param;
    try {
      // Process form data and uploaded video
      const { title, description } = req.body;
      
      const filename = req.file.filename;
      

      const course = await courseDB.findById(courseId);


      // Create a new video object with the received data
      const newVideo = new videos({
        title,
        description,
        filename,
        uploadDate: Date.now()
      });

      // Push the new video into the videos array of the course
      course.videos.push(newVideo);

      // Save the tutorDB
      await course.save();

      // Redirect to the video library or display a success message
      res.redirect(`/videolibrary/${courseId}`);
    } catch (error) {
      console.error('Error uploading video:', error);
      // Handle the error and display an error message
      res.status(500).json({ error: 'Error uploading video' });
    }
  } else {
    res.redirect('/login');
  }
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
  // new course added in course then pushed in tutors.
  const addCourse = new courseDB({
    courseName, fees, classs, description,teacher:req.user._id ,  teacher_name: req.user.name });
  addCourse.save().then(savedCourse => {
    
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

// Views Courses to students

app.get("/courses/:param",function(req,res){
  let param = req.params.param;
  let msg=""
  let msgUn=""
  if(param.length > 2){
    if(param[2]==='1'){
      msg = "Transaction Successful"
    }
    else{
      msgUn = "Transaction Unsuccessful"
    }
    if(param[1] === " ") {
      param = param[0]
    }
    else{
      param = param[0] + param[1]
    }
  }
async function getCoursesByClass(className) {
  try {
    const courses = await courseDB.find({ classs: "Class "+className });
    return courses;
  } catch (error) {
    console.error('Error retrieving courses:', error);
    throw error;
  }
}


getCoursesByClass(param)
  .then(courses => {
    res.render('searchcourse',{course:courses , msg:msg, msgUn:msgUn});
    
  })
  .catch(error => {
    console.error(error);
  });

  
   
  
});


// Success Stories page
app.get("/successstories",function(req,res){
  story.find({}).then( result =>{

      res.render("successstories",{stories:result});
  });
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


// payment
function getCourseDetails(courseId) {
  return courseDB.findById(courseId)
    .exec()
    .then((course) => {
      return course; // The course object will be returned if found, or null if not found
    })
    .catch((error) => {
      console.error('Error while fetching course details:', error);
      return null; // Handle the error gracefully and return null or an error object
    });
}

function createOrder(amountInPaisa) {
  // console.log(typeof amountInPaisa);
  const options = {
    amount: amountInPaisa,
    currency: 'INR',
    receipt: 'order_receipt',
    payment_capture: 1,
  };

  return new Promise((resolve, reject) => {
    razorpay.orders.create(options, (err, order) => {
      if (err) {
        console.error(err);
        reject(new Error('An error occurred while creating the order.'));
      } else {
        resolve(order);
      }
    });
  });
}

// Define a route for handling course payment
app.post('/payment', (req, res) => {
  if(req.isAuthenticated() && req.user.role=='student'){
  // Here, you can calculate the amount on the server-side based on the courseId
  // and fetch the relevant course information from the database
  const courseId = req.body.courseId;
  // You would need to implement a function to fetch course details based on the courseId
  const course = getCourseDetails(courseId);

  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  const amountInRupees = course.fees;
  const amountInPaisa = amountInRupees * 100;

  // You can also set other details like currency, name, description, image, etc. here

  // Create an order on Razorpay (server-side) and get the order ID
  // In a real implementation, you'll use a payment gateway API to create the order
  createOrder(amountInPaisa)
  .then((order) => {
    // Send the order details (order ID) back to the client-side
    res.json({ id: order.id });
  })
  .catch((error) => {
    res.status(500).json({ error: error.message });
  });
}else{
  res.redirect("/login");
}
});
async function handlePaymentSuccess(paymentId, courseId, sID, name, _class) {
  try {
    // Assuming you have a 'transaction' object that interacts with your database
    const courseData = { courseId: courseId, paymentId: paymentId, std: sID, stdName: name };
        
    // Check if the payment ID exists in the database
    const existingTransaction = await transaction.findOne({ paymentId: paymentId });
    let existingCourse;

    if(existingTransaction){
      existingCourse = existingTransaction.courseId;
    }
if (!existingTransaction && !existingCourse) {

  const newTransaction = new transaction(courseData);
  await newTransaction.save();
  // Assuming you have a 'student' object representing the student's collection in your database
    // Here, 'coursesSchema' is the schema definition for courses in your database
    // Assuming you have imported the necessary modules and set up your database connection

async function copyCourse(courseId) {
  try {
    // Use await with findById to find the course by its ID
    const copyCourse = await courseDB.findById(courseId);

    // Check if the course was found
    if (!copyCourse) {
      console.log("Course not found");
      return;
    }

    // Create a new course object using the found course data
    const courseInStudent = new courseDB({
      _id: copyCourse._id,
      courseName: copyCourse.courseName,
      description: copyCourse.description,
      teacher_name: copyCourse.teacher_name,
    });

    // Use await to save the new course object to the database
    await student.updateOne({ _id: sID }, { $push: { purchasedCourse: courseInStudent } });
    console.log('Course added to student successfully.');
  console.log('New transaction created and saved:');

    console.log("Course copied and saved successfully!");
  } catch (err) {
    console.error("Error:", err);
  }
}

// Call the copyCourse function with the courseId
copyCourse(courseId);

    
  return 1;
} else {
  console.log('Payment ID already exists in the database.');
  return 0;
}    
  } catch (error) {
    console.error('Error while saving transaction and updating student:', error);
    // You can handle the error here or rethrow it to let the calling code handle it
    throw error;
  }
}


// Define a route for handling payment success
app.get('/payment-success', (req, res) => {
  if(req.isAuthenticated() && req.user.role=='student'){
  // Handle the success case here, e.g., update the payment status in the database
  
  const paymentId = req.query.epayment_id;
  const courseId = req.query.ecourseId;
  console.log(courseId);
  const _class = req.query.eclasss;
console.log(paymentId + "payment Id")
  // You would need to implement a function to handle payment success and update the database
  async function execute(){
  let _success = await handlePaymentSuccess(paymentId, courseId ,req.user._id, req.user.name,_class );
  console.log(_success);
  if(_success === 1){
    
    let _link = "/courses/"+_class[6]+" 1"
    console.log(_link)
    res.redirect(_link);
    
  }else{
    let _link = "/courses/"+_class[6]+" 0"
    console.log(_link)
    res.redirect(_link);
  }
}
  execute();
  // res.send('Payment successful!'); // You can redirect to a success page instead
  }else{
    res.redirect("/login");
  }
});


app.listen(process.env.PORT, function() {
  console.log(`Server started on port 3000 ${process.env.PORT}`);
});


