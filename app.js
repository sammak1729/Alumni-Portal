//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const app = express();
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const path = require('path');
const multer = require('multer');
const cloudinary = require("cloudinary").v2;
const upload = require("./multer");
const nodemailer = require('nodemailer');
require("./auth");



app.use(bodyParser.urlencoded({ extended: true }))
app.set('view engine', 'ejs');
app.use(express.static( __dirname +  "/public/"));

const dbpwd = process.env.DB_PWD;


app.use(session({
  secret: 'our secret key',
  resave: false,
  saveUninitialized: true,
  // cookie: { secure: true }
}));

// cloudinary configuration

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use(passport.initialize());
app.use(passport.session());

main().catch(err => console.log(err));
async function main() {
  await mongoose.connect(`${process.env.DB}`);
}
const userSchema = new mongoose.Schema({
  username: String,
  password: String
});

const dataSchema = new mongoose.Schema({
  email: { type: String, default: '' },
  fullname: { type: String, default: 'Default' },
  company: { type: String, default: '' },
  position: { type: String, default: '' },
  branch: { type: String, default: '' },
  graduation: { type: String, default: '' },
  aboutme: { type: String, default: '' },
  gfgProfile: { type: String, default: '' },
  lcProfile: { type: String, default: '' },
  cfProfile: { type: String, default: '' },
  lnProfile: { type: String, default: '' },
  ghProfile: { type: String, default: '' },
  imageURL:{type: String,default:'undefined'},
  cloudinary_id:{type:String,default:'null'}

});

const articleSchema = new mongoose.Schema({
  fullname :{type:String},
  email :{type:String},
  company :{type:String},
  content :{type:String},
  graduation :{type:String},
  imageURL:{type:String}

});
// variables=====================================================================
let curUserEmail;
let curUserFname;
let curUserSname;
let curUserfullname;
let curUserPass;
let postid=1234;
let otp;

userSchema.plugin(passportLocalMongoose);

const user = mongoose.model('user', userSchema);
const userdata = mongoose.model('userdata', dataSchema);
const articledata=mongoose.model('articledata',articleSchema);

passport.use(user.createStrategy());


passport.serializeUser(user.serializeUser());
passport.deserializeUser(user.deserializeUser());

app.get('/', (req, res) => {

  res.render("index");

});


app.get("/register", function (req, res) {
  res.render("log");
});

app.get("/login", function (req, res) {
  res.render("log");
});

app.get("/logout", function (req, res) {
  req.logout();
  req.session.destroy();
  res.redirect("/");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['email', 'profile'] }
  ));

app.get('/google/callback',
  passport.authenticate('google', {
    successRedirect: '/google/register',
    failureRedirect: '/auth/google/failure'
  })
);

function verifyEmail(req, res, next) {
  res.redirect("/emailverify");
   next();
  
}
function isLoggedIn(req, res, next) {
  //console.log(req.user);
  req.user ? next() : res.send('first login please !');
 
}

app.get('/google/register',(req,res)=>{
  
   curUserEmail = req.user.email;
   curUserFname=req.user.name.givenName;
   curUserSname=req.user.name.familyName;
  //  console.log(req.user.picture);
  userdata.findOne({email:curUserEmail},function(err,result){
    if(err){
      console.log(err);
    }
    else if(result){
      res.redirect("/profile");
    }
    else {
      const udata = new userdata({
        fullname: req.user.displayName,
        email: req.user.email,
        imageURL:req.user.picture
      });
    
      udata.save(function (err, res) {
        if (err) {
          console.log(err);
        }
      });
      res.redirect("/profile");
    }
  })
 
});

app.get('/auth/google/failure', (req, res) => {
  res.send('Failed to authenticate..');
});

app.post("/login", function (req, res) {
  const cred = new user({
    username: req.body.username,
    password: req.body.password
  })
  req.login(cred, function (err) {
    if (err) { return next(err); }
    else {
      curUserEmail = req.body.username;
      userdata.findOne({ email: curUserEmail }, function (err, result) {
        if (err) {
          console.log(err);
        } else {


          passport.authenticate("local")(req, res, function () {
            res.redirect("/home");
          });
        }
      });

    }
  });
});

// For home page ======================================================================

app.get('/home', isLoggedIn, (req, res) => {
  
 
  articledata.find({},function(err,result){
    if(err){
      console.log(err);
    }
     
    res.render("home",{articles:result,curUserEmail:curUserEmail});
  })
 
});

// FOR another user profile view=============================================================================================

app.get('/users/:email', isLoggedIn, (req, res) => {
  const profileEmail = req.params.email;
  userdata.findOne( {email : profileEmail } ,function( err, result ){
    if( err ){
        console.log(err);
    } else{
      articledata.find({email:profileEmail},function(err,data){
        if(err){console.log(err)}
        else{
            // console.log( data );
            res.render('profilevisit', { userEmail: result.email, userFullname: result.fullname, company: result.company, position: result.position, branch: result.branch, graduation: result.graduation, aboutme: result.aboutme, gfgProfile: result.gfgProfile, lcProfile: result.lcProfile, ghProfile: result.ghProfile, lnProfile: result.lnProfile, cfProfile: result.cfProfile ,file:result.imageURL,articles:data});
        }
      });
    }
  } )
});


app.post('/home', isLoggedIn, (req, res) => {
  // console.log(req.body);
   userdata.findOne({ email: curUserEmail }, function (err, result) {
    if (err) {
      console.log(err);
    } else {
      // console.log(result);
      const article = new articledata({
        fullname:result.fullname,
        email:curUserEmail,
        company:req.body.company,
        graduation:result.graduation,
        imageURL:result.imageURL,
        content:req.body.content
      });
      article.save(function (err, res) {
        if (err) {
          console.log(err);
        }
      });
      res.redirect("/home");
    }
  });
  
});

// For profile page ===================================================================

app.get('/profile', isLoggedIn , (req, res) => {

   userdata.findOne({ email: curUserEmail }, function (err, result) {
    if (err) {
      console.log(err);
    } else {
      articledata.find({email:curUserEmail},function(err,data){
        if(err){console.log(err)}
        else{
              // console.log(result);
            res.render('profilepage', { userEmail: result.email, userFullname: result.fullname, company: result.company, position: result.position, branch: result.branch, graduation: result.graduation, aboutme: result.aboutme, gfgProfile: result.gfgProfile, lcProfile: result.lcProfile, ghProfile: result.ghProfile, lnProfile: result.lnProfile, cfProfile: result.cfProfile ,file:result.imageURL,articles:data,postid:postid});
        }
      });
    }
  });


})

// For edit purpose ====================================================================


app.get('/editProfile', isLoggedIn, function (req, res) {
  userdata.findOne({ email: curUserEmail }, function (err, result) {
    if (err) {
      console.log(err);
    } else {
      // console.log( result );
      let fulluserName = result.fullname.split(' '),
        curUserFname = fulluserName[0],
        curUserSname = fulluserName[fulluserName.length - 1];
      // console.log(curUserEmail);
      res.render('editProfile', { fname: curUserFname, sname: curUserSname, company: result.company, position: result.position, branch: result.branch, graduation: result.graduation, aboutme: result.aboutme, gfgProfile: result.gfgProfile, lcProfile: result.lcProfile, ghProfile: result.ghProfile, lnProfile: result.lnProfile, cfProfile: result.cfProfile ,file: result.imageURL});
    }
  })

});

app.post('/editProfile', isLoggedIn, (req, res) => {

  // console.log(req.body);
  // console.log(req.file);
  userdata.findOneAndUpdate({ email: curUserEmail }, { fullname: `${req.body.fname} ${req.body.sname}`, company: req.body.company, position: req.body.position, branch: req.body.branch, graduation: req.body.graduation, aboutme: req.body.aboutme, gfgProfile: req.body.gfgProfile, lcProfile: req.body.lcProfile, ghProfile: req.body.ghProfile, lnProfile: req.body.lnProfile, cfProfile: req.body.cfProfile }, function (err, result) {
    if (err) {
      console.log(err);
    } else {
      articledata.findOneAndUpdate({email:curUserEmail},{fullname: `${req.body.fname} ${req.body.sname}`, company: req.body.company,graduation:req.body.graduation},function(err,ress){
        if(err){
          console.log(err);
        }
        else{
          res.redirect('/profile');
        }
      });
    }
  })


})
// For deleting post ================================================================
app.get("/deleteArticle/:_id",isLoggedIn,function(req,res){
      articledata.findByIdAndDelete({_id:req.params._id},function(err,result){
        if(err){
          console.log(err);
        }
        else{
          res.redirect("/profile");
        }
      });
});


// For editing post ============================================================
app.get("/editArticle/:_id", isLoggedIn,function(req, res){
  
  userdata.findOne({ email: curUserEmail }, function (err, result) {
    if (err) {
      console.log(err);
    } else {
      articledata.find({email:curUserEmail},function(err,data){
        if(err){console.log(err)}
        else{
              // console.log(result);
            postid=req.params._id;
           res.redirect("/profile");
        }
      });
    }
  });
})
// FOR saving the edited post==================================================================

app.post('/savearticle/:_id', isLoggedIn, (req, res) => {

  // console.log(req.body);
  // console.log(req.file);
  articledata.findOneAndUpdate({ _id:req.params._id }, {company:req.body.company,content:req.body.content}, function (err, result) {
    if (err) {
      console.log(err);
    } else {
      postid=1234;
     res.redirect("/profile");
    }
  })


})



app.post("/uploadProfilePicture", isLoggedIn, upload.single("image"), async (req, res) => {

  if( req.file == undefined )
  {
      console.log(" please upload img"); 
      res.redirect("/editprofile");
      
  }
  else
  {
    try {
      // Upload image to cloudinary
      async function getData(){
        const cresult = await cloudinary.uploader.upload(req.file.path);
        userdata.findOneAndUpdate({ email: curUserEmail }, {imageURL:cresult.secure_url ,cloudinary_id:cresult.public_id}, function (err, result) {
          if (err) {
            console.log(err);
          } else {
            async function changearticleData(){
              articledata.updateMany({ email: curUserEmail }, {$set:{imageURL:cresult.secure_url}}, function (err, result) {
                if (err) {
                  console.log(err);
                } else {
                  res.redirect('/editProfile');
                }
              });
            }
            changearticleData();
          }
        });
      }
      getData();
      
      
  
      // Create new user
      
    
    } catch (err) {
      console.log(err);
    }
  }

 


});
app.get("/emailverify",function(req,res){
  
  otp=Math.floor(1000 + Math.random() * 9000);
  let mailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: '<your_otpsending_emailid>',
        pass: process.env.OTP_PASSWORD
    }
});
  
let mailDetails = {
    from: '<your_otpsending_emailid>',
    to:curUserEmail,
    subject: 'otp verification',
    text: `${otp}`
};
  
mailTransporter.sendMail(mailDetails, function(err, data) {
    if(err) {
        console.log(err);
    } else {
        console.log('Email sent successfully');
    }
});

  res.render("emailverify",{curUserEmail:curUserEmail,curUserPass:curUserPass,curUserFullname:curUserfullname});
});
app.post("/getdetails",function(req,res){
  // console.log(req);
  curUserEmail=req.body.username;
  curUserPass=req.body.password;
  curUserfullname=req.body.fullname;
  res.redirect("/emailverify");
});
app.post("/emailverify",function(req,res){
  if(otp==req.body.otp){
    // console.log(req.body.password);
    user.register({ username: req.body.username}, req.body.password, function (err, user) {

      if (err) {
        console.log(err);
        res.redirect("/login");
      }
      else {
        const udata = new userdata({
          fullname: req.body.fullname,
          email: req.body.username
        });
  
        udata.save(function (err, res) {
          if (err) {
            console.log(err);
          }
        });
       
        passport.authenticate("local")(req, res, function () {
          res.redirect("/home");
        });
        
      }
      
  
    });

  }
  else {
    res.redirect("/login");
  }
});

app.get("/forgetpassword",function(req,res){
  res.render("forgetpassword");
});
app.post("/forget/verifyemail",function(req,res){
  curUserEmail=req.body.email;
  otp=Math.floor(1000 + Math.random() * 9000);
  let mailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: '<your_otpsending_emailid>',
        pass: process.env.OTP_PASSWORD
    }
});
  
let mailDetails = {
    from: '<your_otpsending_emailid>',
    to:req.body.email,
    subject: 'otp verification',
    text: `${otp}`
};
  
mailTransporter.sendMail(mailDetails, function(err, data) {
    if(err) {
        console.log('boom');
    } else {
        console.log('Email sent successfully');
    }
});
res.render("otpverify");
}); 
app.post("/forget/otpverify",function (req,res){
    if(otp==req.body.otp){
      res.render("changepassword",{curUserEmail:curUserEmail});
    } 
    else{
      res.redirect("/login");
    }
});
app.post("/forget/changepassword",function(req,res){

  user.findOneAndDelete({username:req.body.username},function(err,result){
    if(err){
      console.log(err);
      res.redirect("/login");
    }
    else{
      user.register({ username: req.body.username}, req.body.password, function (err, user) {

        if (err) {
          console.log(err);
          res.redirect("/login");
        }
        else {
          passport.authenticate("local")(req, res, function () {
            res.redirect("/home");
          });
          
        }
        
    
      });
    }
  })



});

app.listen(3000, function () {
  console.log("Server started on port 3000");
});
