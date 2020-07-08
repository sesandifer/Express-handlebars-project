require('dotenv').config();

var aws = require('aws-sdk')
var bodyParser = require('body-parser')
var cookieParser = require('cookie-parser');
var createError = require('http-errors');
var db = require('./db');
var express = require('express');
var fs = require('fs');
var hbs = require('express-hbs');
var hbsIntl = require('handlebars-intl');
var jsreport = require('jsreport');
var logger = require('morgan');
var multer = require('multer')
var multerS3 = require('multer-s3')
var passport = require('passport')
var path = require('path');
var session = require('express-session')
var Strategy = require('passport-local').Strategy;


// configure aws sdk and create s3 upload function
aws.config.update({
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  region: process.env.S3_REGION
});

const s3 = new aws.S3();

// Multer upload (Use multer-s3 to save directly to AWS instead of locally)
var upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET,
    // Set public read permissions
    acl: 'public-read',
    // Auto detect contet type
    contentType: multerS3.AUTO_CONTENT_TYPE, 
    // Set key/ filename as original uploaded name
    key: function (req, file, cb) {
      cb(null, req.session.passport.user + ".png")
    }
  })
});

// register handlebars helpers
hbsIntl.registerWith(hbs);

hbs.registerAsyncHelper('userNameFromId', function(id, cb) {
  db.users.findById(id, function(err, user){
    if (user) {
      cb(user.firstname + " " + user.lastname);
    } else {
      cb("unknown");
    }
  });
});

hbs.registerAsyncHelper('awardClassFromId', function(id, cb) {
  db.awards.findAwardClassById(id, function(err, awardClass) {
    cb(awardClass[0].title);
  });
});

hbs.registerHelper("departmentNameFromId", function(input) {
  switch(input) {
    case 1:
      return "Production";
    case 2:
      return "Purchasing";
    default:
      return "Accounting";
  }
});

hbs.registerHelper("accountTypeFromId", function(input) {
  if (input == "1") { return "Admin"; } else { return "User"; }
});

// create express app
var app = express();

// bodyparser setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configure the local strategy for use by Passport.
//
// The local strategy require a `verify` function which receives the credentials
// (`username` and `password`) submitted by the user.  The function must verify
// that the password is correct and then invoke `cb` with a user object, which
// will be set at `req.user` in route handlers after authentication.
passport.use(new Strategy(
  function(username, password, cb) {
    db.users.findByUsername(username, function(err, user) {
      if (err) { return cb(err); }
      if (!user) { return cb(null, false); }
      if (user.password != password) { return cb(null, false); }
      user.isAdmin = (user.account_type === 1);
      app.locals.user = user;
      return cb(null, user);
    });
  }));

// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  The
// typical implementation of this is as simple as supplying the user ID when
// serializing, and querying the user record by ID from the database when
// deserializing.
passport.serializeUser(function(user, cb) {
  cb(null, user.id);
});

passport.deserializeUser(function(id, cb) {
  db.users.findById(id, function (err, user) {
    if (err) { return cb(err); }
    user.isAdmin = (user.account_type === 1);
    cb(null, user);
  });
});

// Passport and session handling initialization
app.use(require('express-session')({ secret: 'keyboard cat', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// view engine setup
app.engine('hbs', hbs.express4({ 
  defaultLayout:  __dirname + "/views/layouts/main.hbs", 
  extname: "hbs",
  layoutsDir: __dirname + '/views/layouts/',
  partialsDir: __dirname + "/views/partials/" 
}));
app.set('view engine', 'hbs');


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, '/public')));

app.use(function(req, res, next){
  res.locals.message = req.session.message;
  delete req.session.message;
  next();
});

app.locals.title = "Award.ly";

app.get('/',
  function(req, res) {
    res.render('index');
  });

app.get('/login',
  function(req, res){
    res.render('login');
  });
  
app.post('/login', 
  passport.authenticate('local', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/register',
  function(req, res){
    res.render('register');
  });
  
app.post('/register', 
  function(req, res) {
    db.users.registerNewUser(req.body, function (err, userId) {
      var params = {
        Bucket : process.env.S3_BUCKET,
        CopySource : process.env.S3_BUCKET + '/template.png',
        Key : userId + ".png",
        ACL : "public-read"
      };
      s3.copyObject(params, function(err, data) {
        if (err) {
          res.render('register', { message: 'error registering user' });
        }
      });
      if (err) { 
        res.render('register', { message: 'error registering user' });
      }
      else {
        res.render('index', { message: 'registered user successfully'});
      }
    });
  });
  
app.get('/logout',
  function(req, res){
    req.logout();
    app.locals.user = null;
    res.redirect('/');
  });

app.get('/profile',
  require('connect-ensure-login').ensureLoggedIn(),
  function(req, res){
    res.render('profile');
  })

app.get('/users', 
  require('connect-ensure-login').ensureLoggedIn(),
  function(req, res) {
    db.users.findAllUsers(function (err, rows) {
      if (err) { 
        res.render('error', { message: 'error finding all users' });
      }
      else {
        res.render('users', { users: rows });
      }
    });
  });

app.get('/awards', 
  require('connect-ensure-login').ensureLoggedIn(),
  function(req, res) {
    db.awards.findAllAwards(function (err, rows) {
      if (err) { 
        res.render('error', { message: 'error finding all awards' });
      }
      else {
        res.render('awards', { awards: rows, showAwardsForAllUsers: true });
      }
    });
  });

app.get('/companyStatistics', 
  function(req, res) {
    db.awards.findAllAwardsByUser(function (err, rows) {
      if (err) { 
        res.render('error', { message: 'error finding statistics' });
      }
      else {
        res.render('companyStatistics', { stats: rows });
      }
    });
  });  

app.get('/awardCountsByDept', 
  function(req, res) {
    db.departments.findDeptAwardCounts(function (err, rows) {
      if (err) { 
        res.render('error', { message: 'error running query' });
      }
      else {
        res.render('awardCountsByDept', { stats: rows });
      }
    });
  });
  
app.get('/awardCountsByRegion', 
  function(req, res) {
    db.departments.findRegionAwardCounts(function (err, rows) {
      if (err) { 
        res.render('error', { message: 'error running query' });
      }
      else {
        res.render('awardCountsByRegion', { stats: rows });
      }
    });
  });
  
  
  
app.post('/awardsByDeptSelection', 
  function(req, res) {
    db.awards.findAwardsForSelectedDept(req.body, function (err, rows) {
      if (err) { 
        res.render('error', { message: 'error running query2' });
      }
      else {
        res.render('awardsByDeptSelection', { stats: rows });
      }
    });
  });
  
  
app.get('/awardsByDeptSelection', 
  function(req, res) {
    db.awards.findAwardsForSelectedDept(req.body, function (err, rows) {
      if (err) { 
        res.render('error', { message: 'error running query2' });
      }
      else {
        res.render('awardsByDeptSelection', { stats: rows });
      }
    });
  });

app.get('/awards/:userId', 
  require('connect-ensure-login').ensureLoggedIn(),
  function(req, res) {
    var userId = req.params.userId;
    db.awards.findAwardsForUser(userId, function (err, rows) {
      if (err) { 
        res.render('error', { message: 'error finding all awards' });
      }
      else {
        res.render('awards', { awards: rows });
      }
    });
  });

app.post('/upload-signature', upload.single('signaturefile'), (req, res, next) => {
  res.redirect('/profile');
});

app.get('/reports', 
require('connect-ensure-login').ensureLoggedIn(),
function(req, res) {
  db.awards.findAllAwards(function (err, rows) {
    if (err) { 
      res.render('error', { message: 'error finding all awards' });
    }
    else {
      res.render('reports', { awards: rows });
    }
  });
});

app.get('/nominate',
  require('connect-ensure-login').ensureLoggedIn(), 
  function(req, res) {
    db.users.findAllUsers(function (err, users) {
      if (err) { 
        res.render('error', { message: 'error finding all users' });
      }
      db.awards.findAllAwardClasses(function (err, award_classes) {
        if (err) { 
          res.render('error', { message: 'error finding all award classes' });
        }
        res.render('nominate', { users: users, award_classes: award_classes });
      })
    });
  });

app.post('/nominate',
function(req, res) {
  db.awards.createNewAward(req.body, function (err, award) {
    if (err) { 
      res.render('nominate', { message: 'error creating award' });
    }
    else {
      res.render('index', { message: 'created award successfully'});
    }
  });
});

app.get('/reset-password/:userId', 
  require('connect-ensure-login').ensureLoggedIn(),
  function(req, res) {
    var userId = req.params.userId;
    db.users.resetPassword(userId, function (err, rows) {
      if (err) { 
        res.render('error', { message: 'error resetting password' });
      }
      else {
        req.session.message = "successfully reset user's password to \"password\"";
        res.redirect('/users');
      }
    });
  });

app.get('/delete-award/:awardId', 
  require('connect-ensure-login').ensureLoggedIn(),
  function(req, res) {
    var awardId = req.params.awardId;
    db.awards.deleteAward(awardId, function (err, rows) {
      if (err) { 
        res.render('error', { message: 'error deleting award' });
      }
      else {
        req.session.message = "award deleted";
        res.redirect('/awards');
      }
    });
  });

app.get('/print-award/:awardId', 
  require('connect-ensure-login').ensureLoggedIn(),
  function(req, res) {
    var awardId = req.params.awardId;
    fs.readFile("views/pdf.hbs", function (err, pdfTemplate) {
      db.awards.findAwardById(awardId, function (err, award) {
        jsreport.render({
          template: {
            content: pdfTemplate.toString(),
            engine: 'handlebars',
            recipe: 'chrome-pdf'
          },
          data: award[0]
        }).then((out)  => {
          out.stream.pipe(res);
        }).catch((e) => {
          res.end(e.message);
        });
      });
    });
  });

app.get('/reports',
  require('connect-ensure-login').ensureLoggedIn(),
  function(req, res){
    res.render('reports');
  })

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
