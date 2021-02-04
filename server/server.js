/**
 * The application execution starts here
 * Application Module Dependecies
 */
const path = require('path');

const express = require('express');
const exphbs = require('express-handlebars');
const flash = require('connect-flash');
const passport = require('passport');
const bodyParser = require('body-parser');
const session = require('express-session');
const MySqlStore = require('express-mysql-session')(session);

//-- Application Modules
const dbConfig = require('./lib/db/db_config');
const defaults = require('./config/defaults');
const dbConnect = require('./lib/db/db_connect');
const { adminConfig } = require('./config/init');

//-- Load routes
const adminRoute = require('./routes/admin');
const applicantRoute = require('./routes/applicant');
//-- Setup Application
const app = express();

//-- Test db connection
dbConnect()
  .then((conn) => {
    console.log(`connected to On port ${conn.config.port}`);
    adminConfig();
  })
  .catch((err) => {
    console.log(err);
  });

//-- Setup public dir
const publicDir = path.resolve('./public');
app.use(express.static(publicDir));

//-- Setup Application MiddleWares
//-- session middleware
const sessionStore = new MySqlStore(dbConfig);
app.use(
  session({
    key: 'online-recruitment',
    secret: 'xrayZ123',
    resave: false,
    saveUninitialized: false,
  })
);

//-- Passport middleware
app.use(passport.initialize());
app.use(passport.session());

//-- Flash middleware
app.use(flash());

//-- Setup express-handlebar middleware
const viewsDir = path.join(__dirname, 'views');
const layoutsDir = path.join(viewsDir, 'layouts');
const partialsDir = path.join(viewsDir, 'partials');
const hbs = exphbs.create({
  defaultLayout: 'main',
  layoutsDir,
  partialsDir,
  helpers: {
    add: (a, b) => {
      return parseInt(a) + parseInt(b);
    },
    equals: (a, b) => {
      return a === b;
    },
  },
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.set('views', viewsDir);

//-- body-parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//-- Global variables
app.use((req, res, next) => {
  res.locals.error = req.flash('error');
  res.locals.success = req.flash('success');
  res.locals.examSummary = req.flash('examSummary') || null;

  res.locals.user = req.user || null;
  next();
});

//-- Displays the home page
app.get('/', (req, res) => {
  res.render('index', {
    pageTitle: defaults.appName,
  });
});

//-- Logout the user
app.get('/logout/', (req, res) => {
  // let sessionId = req.sessionID;
  // sessionRepository.deleteOne(sessionId, {id: 'session_id'})
  //   .then(activeSession => {
  //     console.log(activeSession);
  //   }, err =>{
  //     console.log(err);
  //   });
  // req.session.destroy((err)=>{
  //   if (err) {
  //     console.log('unable to destroy session');
  //   }
  // });
  req.logout();
  res.redirect('/');
});

//-- Setup Routes
app.use('/admin', adminRoute);
app.use('/applicant/', applicantRoute);
const PORT = process.env.PORT || 3000;

app.listen(PORT, (err) => {
  if (err) throw err;

  console.debug(`Server is up on port ${PORT}`);
  console.debug(`\tTo use this application:`);
  console.log(`\tOpen your web browser and typein: localhost:3000`);
});

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
