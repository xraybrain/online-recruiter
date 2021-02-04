const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");

//-- Load admin repository
const adminRepository = require("../lib/repository/AdminRepos");
//-- Load applicant repository
const applicantRepository = require("../lib/repository/ApplicantRepos");

module.exports = function(passport, User) {
  passport.use(
    new LocalStrategy(
      {
        usernameField: "emailAddress"
      },
      (emailAddress, password, done) => {
        //-- Match User
        User.findOne(
          [
            {
              emailAddress: emailAddress
            }
          ],
          "="
        )
          .then(user => {
            console.log(user);
            if (!user) {
              return done(null, false, {
                message: "Wrong email address and password combination"
              });
            }

            //-- Match User password
            bcrypt.compare(password, user.password, (err, isMatch) => {
              if (err) throw err;

              if (isMatch) {
                return done(null, user);
              } else {
                return done(null, false, {
                  message: "Wrong email address and password combination"
                });
              }
            });
          })
          .catch(err => {
            console.log(err);
            return done(null, false, {
              message: "Db not responding"
            });
          });
      }
    )
  );

  passport.serializeUser(function(user, done) {
    done(null, {
      _id: user.id,
      type: user.userType
    });
  });

  passport.deserializeUser(function(key, done) {
    User = {};

    if (key.type === 0) User = adminRepository;
    if (key.type === 1) User = applicantRepository;

    User.findById(key._id).then(
      user => {
        done(null, user);
      },
      err => {
        done(err, false);
      }
    );
  });
};
