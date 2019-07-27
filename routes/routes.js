//stuff for reset password function
let crypto = require('crypto');
let sg = require('sendgrid')(process.env.SENDGRID_KEY);
let helper = require('sendgrid').mail;

module.exports = function(app, passport, Bookshelf) {
  //sends successful login state back to angular
  app.get('/success', function(req, res) {
    res.send({ state: 'success', user: req.user ? req.user : null });
  });

  //sends failure login state back to angular
  app.get('/failure', function(req, res) {
    res.send({
      state: 'failure',
      user: null,
      message: req.flash('authMsg') || null,
    });
  });

  // process the login form
  app.post(
    '/login',
    passport.authenticate('login', {
      successRedirect: '/success', // redirect to the secure profile section
      failureRedirect: '/failure', // redirect back to the signup page if there is an error
      failureFlash: true, // allow flash messages
    }),
  );

  // process the signup form
  app.post(
    '/signup',
    passport.authenticate('signup', {
      successRedirect: '/success', // redirect to the secure profile section
      failureRedirect: '/failure', // redirect back to the signup page if there is an error
      failureFlash: true, // allow flash messages
    }),
  );

  // =====================================
  // LOGOUT ==============================
  // =====================================
  app.get('/logout', function(req, res) {
    req.logout();
    res.send('success');
    // res.redirect('/');
  });

  // =====================================
  // HELP ROUTES==========================
  // =====================================
  //sends login state back to angular
  app.get('/isAuthenticated', function(req, res) {
    res.send(req.isAuthenticated());
  });

  //sends successful login state back to angular
  app.get('/sendUser', function(req, res) {
    if (req.isAuthenticated()) {
      res.send(req.user);
    } else {
      res.status(204).send('No user logged in.');
    }
  });

  // =============================================================================
  // ========================== RESET PASSWORD FUNCTION ==========================
  // =============================================================================

  //FIRST: SEND FORGOT PASSWORD EMAIL
  //THIS SETS THE resetPasswordToken AND resetPasswordExpires AND SENDS LINK WITH TOKEN TO USEREMAIL

  // User model
  let Models = require('../models/bookshelfModels.js')(Bookshelf);
  let User = Models.User;
  let Bug = Models.Bug;
  let Bugs = Models.Bugs;

  app.post('/forgot', async function(req, res) {
    let token;
    await crypto.randomBytes(20, function(err, buf) {
      token = buf.toString('hex');
    });

    await User.forge({ email: req.body.email })
      .fetch({ require: true })
      .then(function(user) {
        user.save({
          resetPasswordToken: token,
          resetPasswordExpires: Date.now() + 1800000, // set the time to 30 minutes from now
        });
      });

    let from_email = new helper.Email('bdudb_password_reset@debating.de');
    let to_email = new helper.Email(req.body.email);
    let subject = 'BDUDB Password Reset';
    let text =
      'You are receiving this because you (or someone else) have requested the reset of the password for your BDUDB account.\n\n' +
      'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
      'http://' +
      req.headers.host +
      '/reset/' +
      token +
      '\n\n' +
      'If you did not request this, please ignore this email and your password will remain unchanged.\n';
    let content = new helper.Content('text/plain', text);
    let mail = new helper.Mail(from_email, subject, to_email, content);

    let request = sg.emptyRequest({
      method: 'POST',
      path: '/v3/mail/send',
      body: mail.toJSON(),
    });

    await sg.API(request, function(error, response) {
      console.info(response.statusCode);
      console.info(response.body);
      console.info(response.headers);
      if (error) console.error(error);
    });
    console.log('An e-mail has been sent to ' + req.body.email);
    res.status(200).send();
  });

  //SECOND: RENDER THE RESET PASSWORD PAGE
  app.get('/reset/:token', function(req, res) {
    new User({ resetPasswordToken: req.params.token })
      .fetch()
      .then(function(user) {
        if (!user) {
          console.log('Password reset token is invalid.');
          // res.status(500).json({error: true, data: {}, message: 'Password reset token is invalid.'});
          req.flash('error', 'Password reset token is invalid.');
          // return res.redirect('/forgot');
        } else if (Date.now() > user.get('resetPasswordExpires')) {
          // res.status(500).json({error: true, data: {}, message: 'Password reset token has expired.'});
          req.flash('error', 'Password reset token has expired.');
        } // else {
        res.render('reset.ejs', {
          message: req.flash('error'),
          user: user || null,
        });
        // }
      });
  });

  //THIRD: RESET PASSWORD METHOD
  app.post(
    '/reset',
    passport.authenticate('reset', {
      successRedirect: '/', // redirect to the login section
      failureRedirect: '/resetFailure', // redirect back to the signup page if there is an error
      failureFlash: true, // allow flash messages
    }),
  );

  //sends failure login state back to angular
  app.get('/resetFailure', function(req, res) {
    res.render('reset.ejs', { message: req.flash('reset'), user: null });
  });

  // =============================================================================
  // ========================== CHANGE PASSWORD FUNCTION =========================
  // =============================================================================

  app.post(
    '/changePassword',
    passport.authenticate('change', {
      successRedirect: '/changeSuccess', // redirect to the secure profile section
      failureRedirect: '/changeFailure', // redirect back to the signup page if there is an error
      successFlash: true, // allow flash messages
      failureFlash: true, // allow flash messages
    }),
  );

  //sends failure password change state back to angular
  app.get('/changeSuccess', function(req, res) {
    res.send({
      state: 'success',
      error: false,
      message: req.flash('changeMsg') || null,
    });
  });

  //sends failure password change state back to angular
  app.get('/changeFailure', function(req, res) {
    res.send({
      state: 'failure',
      error: true,
      message: req.flash('changeMsg') || null,
    });
  });

  // =========================================================================
  // ========================== BUG REPORT SYSTEM ============================
  // =========================================================================

  app.get('/bugs', function(req, res) {
    //Check if session user is authorized
    if (req.user.position === 1) {
      Bugs.forge()
        .fetch({ withRelated: ['user'] })
        .then(function(bugs) {
          bugs = bugs.toJSON();
          console.log('Getting all bugs successful');
          res.json({ error: false, data: bugs });
        })
        .catch(function(err) {
          console.error('Error while getting all bugs. Error message:\n' + err);
          res.json({
            error: true,
            err: err,
            message: 'Error while getting all bugs. Error message:\n' + err,
          });
        });
    } else {
      console.log('User is not authorized to get all bugs');
      res.status(401).json({ error: true, message: 'Unauthorized' });
    }
  });

  app.post('/bugs', function(req, res) {
    let user_id = typeof req.user === 'undefined' ? null : req.user.id;
    Bug.forge({
      description: req.body.description,
      type: req.body.type,
      user_id,
    })
      .save()
      .then(function(bug) {
        console.log('Report bug successful.');
        res.json({ error: false, message: 'Report bug successful.' });
      })
      .catch(function(err) {
        console.log('Error while reporting new bug. Error: \n' + err);
        res.json({
          error: true,
          message: 'Error while reporting new bug. Error: \n' + err.message,
        });
      });
  });

  app.put('/bugs/:id', function(req, res) {
    //Check if session user is authorized
    if (req.user.position === 1) {
      Bug.forge({ id: req.params.id })
        .fetch({ require: true })
        .then(function(bug) {
          bug.save({
            description: req.body.description,
            type: req.body.type,
            status: req.body.status,
          });
        })
        .then(function() {
          console.log('Updating bug successful.');
          res
            .status(200)
            .json({ error: false, message: 'Updating bug successful.' });
        })
        .catch(function(err) {
          console.error('Error while updating bug. Error: ' + err.message);
          res.json({ error: true, message: 'Error while updating bug.' });
        });
    } else {
      console.log('User is not authorized to update bug');
      res.json({ error: true, message: 'Unauthorized' });
    }
  });

  app.delete('/bugs/:id', function(req, res) {
    //Check if session user is authorized
    if (req.user.position === 1) {
      Bug.forge({ id: req.params.id })
        .fetch({ require: true })
        .then(function(bug) {
          bug.destroy();
        })
        .then(function() {
          console.log('Deleting bug successful');
          res
            .status(200)
            .json({ error: false, message: 'Deleting bug successful.' });
        })
        .catch(function(err) {
          console.error('Error while deleting bug. Error: ' + err.message);
          res.json({ error: true, message: 'Error while deleting bug.' });
        });
    } else {
      console.log('User is not authorized to delete bug');
      res.json({ error: true, message: 'Unauthorized' });
    }
  });
};
