let LocalStrategy = require('passport-local').Strategy;
let bCrypt = require('bcrypt-nodejs');

module.exports = function(passport, Bookshelf) {
  // User model
  let User = Bookshelf.Model.extend({
    tableName: 'users',
    hasTimestamps: true,
  });

  // passport session setup ==================================================
  // =========================================================================
  // required for persistent login sessions
  // passport needs ability to serialize and deserialize users out of session
  // Passport needs to be able to serialize and deserialize users to support persistent login sessions

  passport.serializeUser(function(user, done) {
    done(null, user);
  });

  passport.deserializeUser(function(user, done) {
    done(null, user);
  });

  // LOCAL LOGIN =============================================================
  // =========================================================================
  // we are using named strategies since we have one for login and one for signup

  passport.use(
    'login',
    new LocalStrategy(
      {
        // by default, local strategy uses username and password, we will override with email
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true, // allows us to pass back the entire request to the callback
      },
      function(req, userEmail, password, done) {
        // callback with email and password from our form

        try {
          new User({ email: userEmail })
            .fetch()
            .then(function(user) {
              if (!user) {
                console.error(
                  'No user found with that email: ' + userEmail + '.',
                );
                // req.flash is the way to set flashdata using connect-flash
                return done(
                  null,
                  false,
                  req.flash(
                    'authMsg',
                    'No user found with that email: ' + userEmail + '.',
                  ),
                );
              }
              if (!isValidPassword(password, user.get('password'))) {
                console.error('Oops! Wrong password.');
                return done(
                  null,
                  false,
                  req.flash('authMsg', 'Oops! Wrong password.'),
                );
              }

              // all is well, return successful user
              console.log('Login successful');
              console.info(user.toJSON().vorname, user.toJSON().name);
              user.save({
                last_login: new Date(),
              });
              return done(
                null,
                user,
                req.flash('authMsg', 'Login successful. email: ' + userEmail),
              );
            })
            .catch(function(err) {
              console.error('Error during login. Error message:' + err);
              return done(
                null,
                false,
                req.flash('authMsg', 'Error during login'),
              );
            });
        } catch (ex) {
          console.log(ex);
          return done(null, false, req.flash('authMsg', 'Error during login'));
        }
      },
    ),
  );

  // LOCAL SIGNUP ============================================================
  // =========================================================================
  // we are using named strategies since we have one for login and one for signup

  passport.use(
    'signup',
    new LocalStrategy(
      {
        // by default, local strategy uses username and password, we will override with email
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true, // allows us to pass back the entire request to the callback
      },
      function(req, userEmail, password, done) {
        try {
          // find a user whose email is the same as the forms email
          // check if user already exists in DB
          new User({ email: userEmail })
            .fetch()
            .then(function(user) {
              if (user) {
                console.info('User already exists:' + user.toJSON());
                return done(
                  null,
                  false,
                  req.flash(
                    'authMsg',
                    'A User with that email already exists.',
                  ),
                );
              } else if (
                req.body.signup_password !== process.env.signup_password
              ) {
                console.info(
                  'Signup password is not correct.',
                  req.body.vorname,
                  req.body.name,
                  req.body.signup_password,
                  process.env.signup_password,
                );
                return done(
                  null,
                  false,
                  req.flash(
                    'authMsg',
                    'Signup password is not correct. Please ask the BDU board members for help.',
                  ),
                );
              } else {
                // if there is no user with that email
                // create the user
                User.forge({
                  email: req.body.email,
                  password: createHash(req.body.password),
                  vorname: req.body.vorname,
                  name: req.body.name,
                  gender: req.body.gender,
                  food: req.body.food,
                  last_login: new Date(),
                })
                  .save()
                  .then(function(user) {
                    console.log('Signup user successful');
                    return done(
                      null,
                      user,
                      req.flash('authMsg', 'Signup successful.' + user.toJSON),
                    );
                  })
                  .catch(function(err) {
                    console.error(
                      'Error during saving new user. Error message:' + err,
                    );
                    return done(
                      null,
                      false,
                      req.flash('authMsg', 'Error during signup.'),
                    );
                  });
              }
            })
            .catch(function(err) {
              console.error(
                'Error during fetching user during signup. Error message:' +
                  err,
              );
              return done(
                null,
                false,
                req.flash('authMsg', 'Error during signup.'),
              );
            });
        } catch (ex) {
          console.log(ex);
        }
      },
    ),
  );

  // LOCAL PASSWORD RESET ====================================================
  // =========================================================================
  // we are using named strategies since we have one for login and one for signup

  passport.use(
    'reset',
    new LocalStrategy(
      {
        // by default, local strategy uses username and password, we will override with email
        usernameField: 'id',
        passwordField: 'password',
        passReqToCallback: true, // allows us to pass back the entire request to the callback
      },
      function(req, userID, password, done) {
        try {
          // find a user whose email is the same as the forms email
          // check if user already exists in DB
          new User({ id: userID })
            .fetch()
            .then(function(user) {
              if (!user) {
                console.error('No user found with ID: ' + userID + '.');
                return done(
                  null,
                  false,
                  req.flash('reset', 'No user found with ID: ' + userID + '.'),
                );
              } else if (
                Date.now() > user.get('resetPasswordExpires') ||
                user.get('resetPasswordExpires') === null
              ) {
                console.error(
                  'Password reset token has expired or is invalid.',
                );
                return done(
                  null,
                  false,
                  req.flash(
                    'reset',
                    'Password reset token has expired or is invalid.',
                  ),
                );
              } else {
                // if user is found
                user
                  .save({
                    password: createHash(req.body.password),
                    resetPasswordToken: null,
                    resetPasswordExpires: null,
                  })
                  .then(function(user) {
                    console.log('New password saved.');
                    return done(
                      null,
                      user,
                      req.flash('reset', 'New password saved.'),
                    );
                  })
                  .catch(function(err) {
                    console.error(
                      'Error during password reset. Error message:' + err,
                    );
                    return done(
                      null,
                      false,
                      req.flash('reset', 'Error during password reset.'),
                    );
                  });
              }
            })
            .catch(function(err) {
              console.error(
                'Error during fetching user during password reset. Error message:' +
                  err,
              );
              return done(
                null,
                false,
                req.flash('reset', 'Error during password reset.'),
              );
            });
        } catch (ex) {
          console.log(ex);
        }
      },
    ),
  );

  // =========================================================================
  // LOCAL PASSWORD CHANGE ===================================================
  // =========================================================================
  // we are using named strategies since we have one for login and one for signup

  passport.use(
    'change',
    new LocalStrategy(
      {
        // by default, local strategy uses username and password, we will override with email
        usernameField: 'userID',
        passwordField: 'newPwd',
        passReqToCallback: true, // allows us to pass back the entire request to the callback
      },
      function(req, userID, newPwd, done) {
        console.log('Change password method called for user: ' + userID);
        try {
          // find a user whose email is the same as the forms email
          new User({ id: userID })
            .fetch()
            .then(function(user) {
              if (!user) {
                console.error('No user found with ID: ' + userID + '.');
                return done(
                  null,
                  false,
                  req.flash(
                    'changeMsg',
                    'No user found with ID: ' + userID + '.',
                  ),
                );
              } else if (
                !isValidPassword(req.body.oldPwd, user.get('password'))
              ) {
                console.error(
                  'Your given password does not match your old password.',
                );
                return done(
                  null,
                  false,
                  req.flash(
                    'changeMsg',
                    'Your given password does not match your old password.',
                  ),
                );
              } else {
                // if user is found and gives correct password
                user
                  .save({
                    password: createHash(newPwd),
                  })
                  .then(function(user) {
                    console.log('New password saved.');
                    return done(
                      null,
                      user,
                      req.flash('changeMsg', 'New password saved.'),
                    );
                  })
                  .catch(function(err) {
                    console.error(
                      'Error during password change. Error message: ' + err,
                    );
                    return done(
                      null,
                      false,
                      req.flash('changeMsg', 'Error during password change.'),
                    );
                  });
              }
            })
            .catch(function(err) {
              console.error(
                'Error during fetching user during password change. Error message: ' +
                  err,
              );
              return done(
                null,
                false,
                req.flash('changeMsg', 'Error during password change.'),
              );
            });
        } catch (ex) {
          console.log(ex);
        }
      },
    ),
  );

  //Helper Functions

  let isValidPassword = function(pwd, pwdHash) {
    try {
      return bCrypt.compareSync(pwd, pwdHash);
    } catch (err) {
      console.error(err + ' - the password seems to have the wrong format');
      return false;
    }
  };
  // Generates hash using bCrypt
  let createHash = function(password) {
    return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
  };
};
