const express = require('express');

const router = express.Router();
const _ = require('lodash');
const moment = require('moment');

// rename-keys is used to change bookshelf's pivot table returns from _pivot_[attribute] to pivot_[attribute]
// we need to change this because angular does not allow underscores as a first character of a key string
const rename = require('rename-keys');

const removeUnderscores = function(key) {
  return _.replace(key, '_', '');
};

const multer = require('multer');
const sftpStorage = require('multer-sftp');

const storage = sftpStorage({
  sftp: {
    host: process.env.BDU_sftp_server,
    port: 22,
    username: process.env.BDU_sftp_server_user,
    password: process.env.BDU_sftp_server_pw,
  },
  destination(req, file, cb) {
    cb(null, '/members_area/userpics');
  },
  filename(req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}`);
  },
});

const upload = multer({ storage });

// Used for routes that must be authenticated.
function isAuthenticated(req, res, next) {
  // if user is authenticated in the session, call the next() to call the next request handler
  // Passport adds this method to request object. A middleware is allowed to add properties to
  // request and response objects

  if (req.isAuthenticated()) {
    return next();
  }

  // if the user is not authenticated then redirect him to the login page
  console.log('not logged in');
  return res.redirect('/');
}

module.exports = function(Bookshelf) {
  // Register the authentication middleware
  // for all URIs use the isAuthenticated function
  router.use('/', isAuthenticated);

  // --------------------------------------------------------------------------
  // ------------------------------MODELS--------------------------------------
  // --------------------------------------------------------------------------

  const Models = require('../models/bookshelfModels.js')(Bookshelf);
  const User = Models.User;
  const Users = Models.Users;
  const Tournament = Models.Tournament;
  const Tournaments = Models.Tournaments;
  const Registration = Models.Registration;
  const Registrations = Models.Registrations;

  // --------------------------------------------------------------------------
  // ------------------------------USER REST API-------------------------------
  // --------------------------------------------------------------------------

  router
    .route('/user')
    // fetch all users
    .get((req, res) => {
      try {
        Users.forge()
          .fetch({ withRelated: ['tournaments'] })
          .then(collection => {
            collection = collection.toJSON();
            _.forEach(collection, user => {
              user.tournaments.forEach((part, index) => {
                user.tournaments[index] = rename(
                  user.tournaments[index],
                  removeUnderscores,
                );
              });
            });
            console.info('Getting all users successful');
            res.send(collection);
            // res.json({error: false, data: collection.toJSON()});
          });
      } catch (err) {
        console.error(`Error while getting all users. Error message:\n${err}`);
        res.status(500).json({ error: true, message: err.message });
      }
    });

  // no create user function here as we do that in the passport-init.js

  router
    .route('/user/image')
    // upload new image for current user
    .post(upload.single('pic'), (req, res) => {
      try {
        console.info('Uploaded new user pic.');
        // then get the current user
        User.forge({ id: req.user.id })
          .fetch()
          .then(user => {
            // save the image path from the db
            const deletePath = `/members_area/userpics/${user.get('image')}`;

            // update the file name in the db
            user.save({
              // we only want to store the file name not the entire path
              image: req.file.path.split('/')[
                req.file.path.split('/').length - 1
              ],
            });

            // lastly use node-ftp to delete the current profile pic using the deletePath
            const Client = require('ssh2').Client;
            const connSettings = {
              host: 'home707433467.1and1-data.host',
              port: 22, // Normal is 22 port
              username: 'u91065973',
              password: 'BDU.Doro24',
              // You can use a key file too, read the ssh2 documentation
            };

            const conn = new Client();
            conn
              .on('ready', () => {
                conn.sftp((err, sftp) => {
                  if (err) throw err;
                  else
                    console.info(
                      `Successfully deleted old user pic: ${deletePath}`,
                    );

                  sftp.unlink(deletePath);
                });
              })
              .connect(connSettings);
          })
          .then(() => {
            res.send({
              error: false,
              message: 'Uploading new profile image successful.',
            });
          });
      } catch (err) {
        console.error(
          `Error while uploading profile pic. Error message:\n${err.message}`,
        );
        res
          .status(500)
          .json({ error: true, message: 'Error while uploading profile pic.' });
      }
    });

  router
    .route('/user/:id')
    // fetch user
    // show update user info form
    .get((req, res) => {
      // check if session user is the requested user
      if (req.user.id == req.params.id || req.user.position === 1) {
        try {
          User.forge({ id: req.params.id })
            .fetch({ withRelated: ['tournaments'] })
            .then(user => {
              if (!user) {
                console.error(
                  `The user with the ID "${
                    req.params.id
                  }" is not in the database.`,
                );
                res.status(404).json({
                  error: true,
                  data: {},
                  message: `The user with the ID "${
                    req.params.id
                  }" is not in the database.`,
                });
              } else {
                user = user.toJSON();
                user.tournaments.forEach((part, index) => {
                  user.tournaments[index] = rename(
                    user.tournaments[index],
                    removeUnderscores,
                  );
                });
                console.info('Getting specific user successful');
                res.status(200).send(user);
              }
            });
        } catch (err) {
          console.error(
            `Error while getting specfic user. Error message:\n${err}`,
          );
          res
            .status(500)
            .json({
              error: true,
              message: 'Error while getting specfic user.',
            });
        }
      } else {
        console.info(
          `User is not authorized to get user information of user with the ID: ${
            req.params.id
          }`,
        );
        res.status(401).json({ error: true, message: 'Unauthorized' });
      }
    })

    // update user details
    .put((req, res) => {
      // check if session user is the requested user
      if (req.params.id == req.user.id || req.user.position === 1) {
        try {
          User.forge({ id: req.params.id })
            .fetch({ require: true })
            .then(user => {
              user.save({
                email: req.body.email,
                name: req.body.name,
                vorname: req.body.vorname,
                gender: req.body.gender,
                food: req.body.food,
                new_tournament_count: req.body.new_tournament_count,
              });
            })
            .then(() => {
              console.info('Updating user successful');
              res
                .status(200)
                .json({ error: false, message: 'Update successful.' });
            });
        } catch (err) {
          console.error(`Error while updating user. Error message:\n ${err}`);
          res
            .status(500)
            .json({ error: true, message: 'Error while updating.' });
        }
      } else {
        console.info(
          `User is not authorized to update user information of user with the ID: ${
            req.params.id
          }`,
        );
        res.status(401).json({ error: true, message: 'Unauthorized' });
      }
    })

    // delete a user
    .delete((req, res) => {
      // check if session user is the requested user
      if (req.params.id == req.user.id || req.user.position === 1) {
        try {
          User.forge({ id: req.params.id })
            .fetch({ require: true })
            .then(user => {
              user.destroy();
            })
            .then(() => {
              console.info('Deleting user successful');
              res.json({
                error: false,
                data: { message: 'User successfully deleted' },
              });
            });
        } catch (err) {
          console.error(`Error while deleting user. Error: ${err.message}`);
          res
            .status(500)
            .json({ error: true, message: 'Error while deleting user.' });
        }
      } else {
        console.info(
          `User is not authorized to delete user with the ID: ${req.params.id}`,
        );
        res.status(401).json({ error: true, message: 'Unauthorized' });
      }
    });

  // --------------------------------------------------------------------------
  // ------------------------------TOURNAMENT REST API-------------------------------
  // --------------------------------------------------------------------------

  router
    .route('/tournament')
    // fetch all tournaments
    .get((req, res) => {
      try {
        Tournaments.forge()
          .fetch({ withRelated: ['users'] })
          .then(collection => {
            collection = collection.toJSON();
            _.forEach(collection, tournament => {
              tournament.users.forEach((part, index) => {
                tournament.users[index] = rename(
                  tournament.users[index],
                  removeUnderscores,
                );
              });
            });
            console.info('Getting all tournaments successful.');
            return res.send(collection);
          })
          .catch(err => {
            console.error(
              `Error while getting all tournaments. Error message:\n${err}`,
            );
            res.status(500).json({ error: true, message: err.message });
          });
      } catch (ex) {
        console.log(ex);
      }
    })

    // create a tournament
    .post((req, res) => {
      // Check if session user is authorized
      if (req.user.position === 1) {
        console.log(req.body.enddate);
        try {
          Tournament.forge({
            name: req.body.name,
            ort: req.body.ort,
            startdate: moment(req.body.startdate).format('YYYY-MM-DD'),
            enddate: moment(req.body.enddate).format('YYYY-MM-DD'),
            deadline: req.body.deadline,
            format: req.body.format,
            league: req.body.league,
            accommodation: req.body.accommodation,
            speakerprice: req.body.speakerprice,
            judgeprice: req.body.judgeprice,
            rankingvalue: req.body.rankingvalue || null,
            link: req.body.link,
            teamspots: req.body.teamspots,
            judgespots: req.body.judgespots,
            comments: req.body.comments,
            language: req.body.language,
          })
            .save()
            .then(tournament => {
              console.info('Create Tournament successful.');
              res
                .status(200)
                .json({
                  error: false,
                  tournament,
                  message: 'Create Tournament successful.',
                });
            })
            .then(() => {
              if (moment(req.body.startdate).unix() > Date.now() / 1000) {
                console.log(
                  moment(req.body.startdate).unix(),
                  Date.now() / 1000,
                );
                try {
                  Users.forge()
                    .fetch()
                    .then(users => {
                      users.forEach(user => {
                        user.save({
                          new_tournament_count:
                            user.toJSON().new_tournament_count + 1,
                        });
                      });
                    });
                } catch (err) {
                  console.error('Unable to increment new_tournament_counts.');
                  console.error(err.message);
                }
              }
            });
        } catch (err) {
          console.error(`Error while adding new Tournament. Error: \n${err}`);
          res
            .status(500)
            .json({
              error: true,
              message: 'Error while adding new Tournament.',
            });
        }
      } else {
        console.info('User is not authorized to create a new tournament');
        res.status(401).json({ error: true, message: 'Unauthorized' });
      }
    });

  router
    .route('/tournament/:id')
    // fetch single tournament
    .get((req, res) => {
      try {
        Tournament.forge({ id: req.params.id })
          .fetch({ withRelated: ['users'] })
          .then(tournament => {
            if (!tournament) {
              console.error(
                `The tournament with the ID "${
                  req.params.id
                }" is not in the database.`,
              );
              res.status(404).json({
                error: true,
                message: `The tournament with the ID "${
                  req.params.id
                }" is not in the database.`,
              });
            } else {
              tournament = tournament.toJSON();
              tournament.users.forEach((part, index) => {
                tournament.users[index] = rename(
                  tournament.users[index],
                  removeUnderscores,
                );
              });
              console.info('Getting specific tournament successful');
              res.json({ error: false, data: tournament });
            }
          })
          .catch(err => {
            console.error(
              `Error while getting specific tournament. Error message:\n${err}`,
            );
            res.status(500).json({ error: true, message: err.message });
          });
      } catch (ex) {
        console.log(ex);
      }
    })

    // update tournament details
    .put((req, res) => {
      // Check if session user is authorized
      if (req.user.position === 1) {
        try {
          Tournament.forge({ id: req.params.id })
            .fetch({ require: true })
            .then(tournament => {
              tournament.save({
                name: req.body.name,
                ort: req.body.ort,
                startdate: moment(req.body.startdate).format('YYYY-MM-DD'),
                enddate: moment(req.body.enddate).format('YYYY-MM-DD'),
                deadline: req.body.deadline,
                format: req.body.format,
                league: req.body.league,
                accommodation: req.body.accommodation,
                speakerprice: req.body.speakerprice,
                judgeprice: req.body.judgeprice,
                rankingvalue: req.body.rankingvalue || null,
                link: req.body.link,
                teamspots: req.body.teamspots,
                judgespots: req.body.judgespots,
                comments: req.body.comments,
                language: req.body.language,
              });
            })
            .then(() => {
              console.info('Updating tournament successful.');
              res
                .status(200)
                .json({
                  error: false,
                  message: 'Updating tournament successful.',
                });
            })
            .catch(err => {
              console.error(
                `Error while updating tournament. Error: ${err.message}`,
              );
              res.json({
                error: true,
                message: 'Error while updating tournament.',
              });
            });
        } catch (ex) {
          console.log(ex);
        }
      } else {
        console.info('User is not authorized to update tournament');
        res.json({ error: true, message: 'Unauthorized' });
      }
    })

    // delete a tournament
    .delete((req, res) => {
      // Check if session user is authorized
      if (req.user.position === 1) {
        try {
          Tournament.forge({ id: req.params.id })
            .fetch({ require: true })
            .then(tournament => {
              tournament.destroy();
            })
            .then(() => {
              console.info('Deleting tournament successful');
              res
                .status(200)
                .json({
                  error: false,
                  message: 'Deleting tournament successful.',
                });
            })
            .catch(err => {
              console.error(
                `Error while deleting tournament. Error: ${err.message}`,
              );
              res.json({
                error: true,
                message: 'Error while deleting tournament.',
              });
            });
        } catch (ex) {
          console.log(ex);
        }
      } else {
        console.info('User is not authorized to delete tournament');
        res.json({ error: true, message: 'Unauthorized' });
      }
    });

  // --------------------------------------------------------------------------
  // ------------------------------RELATION API--------------------------------
  // --------------------------------------------------------------------------

  // reg
  router.route('/reg/:t_id').post((req, res) => {
    // check if Tournament exists in DB
    try {
      Tournament.forge({ id: req.params.t_id })
        .fetch()
        .then(tournament => {
          if (!tournament) {
            // if the tournament wasn't found the can't reg for it
            console.error('Tournament is not in the DB.');
            res.status(202).send('Tournament is not in the DB.');
          } else {
            // if tournament was found we,
            // check if user isn't already registered
            Registration.forge({
              tournament_id: req.params.t_id,
              user_id: req.body.id,
            })
              .fetch()
              .then(arg => {
                if (arg) {
                  // if a user was found, return that user is already registered
                  console.error('User is already registered.');
                  res
                    .status(202)
                    .send('You are already registered for this tournament.');
                } else {
                  // if no user was found,
                  // check role of request
                  if (req.body.role === 'judge') {
                    // if reg request is for judge reg user
                    Registration.forge({
                      tournament_id: req.params.t_id,
                      user_id: req.body.id,
                      role: req.body.role,
                      is_independent: req.body.is_independent,
                      comment: req.body.comment,
                      funding: req.body.funding,
                    })
                      .save()
                      .then(entry => {
                        console.info(
                          `Successfully registered for ${
                            req.params.t_id
                          } as judge.`,
                        );
                        res.status(200).send(entry);
                      });
                  } else if (req.body.role === 'speaker') {
                    // if speaker, check if Partner is named
                    if (req.body.partner1 && req.body.partner1 > 0) {
                      // check if second partner is named
                      if (req.body.partner2 && req.body.partner2 > 0) {
                        // if two partners are given, check if one is already registered
                        Registration.forge({
                          tournament_id: req.params.t_id,
                          user_id: req.body.partner1,
                        })
                          .fetch()
                          .then(arg => {
                            if (arg) {
                              // if a user was found, return that the partner is already registered
                              console.error(
                                'Partner one is already registered.',
                              );
                              res
                                .status(202)
                                .send(
                                  'Your first named partner is ' +
                                    'already registered for this tournament.',
                                );
                            } else {
                              Registration.forge({
                                tournament_id: req.params.t_id,
                                user_id: req.body.partner2,
                              })
                                .fetch()
                                .then(arg => {
                                  if (arg) {
                                    // if a user was found,
                                    // return that the partner is already registered
                                    console.error(
                                      'Partner one two is already registered.',
                                    );
                                    res
                                      .status(202)
                                      .send(
                                        'Your second named partner ' +
                                          'is already registered for this tournament.',
                                      );
                                  } else {
                                    // register all three for the tournament
                                    Registrations.forge([
                                      {
                                        tournament_id: req.params.t_id,
                                        user_id: req.body.id,
                                        role: req.body.role,
                                        is_independent: req.body.is_independent,
                                        comment: req.body.comment,
                                        funding: req.body.funding,
                                        teamname: req.body.team || '',
                                      },
                                      {
                                        tournament_id: req.params.t_id,
                                        user_id: req.body.partner1,
                                        role: req.body.role,
                                        teamname: req.body.team || '',
                                      },
                                      {
                                        tournament_id: req.params.t_id,
                                        user_id: req.body.partner2,
                                        role: req.body.role,
                                        teamname: req.body.team || '',
                                      },
                                    ])
                                      .invokeThen('save')
                                      .then(entry => {
                                        console.info(
                                          `Successfully registered for ${
                                            req.params.t_id
                                          } with ${req.body.partner1} and ${
                                            req.body.partner2
                                          } as speakers.`,
                                        );
                                        res.status(200).send(entry);
                                      });
                                  }
                                });
                            }
                          });
                      } else {
                        // if only first partner is named,
                        // check if partner is already registered
                        Registration.forge({
                          tournament_id: req.params.t_id,
                          user_id: req.body.partner1,
                        })
                          .fetch()
                          .then(arg => {
                            if (arg) {
                              // if a user was found, return that the partner is already registered
                              console.error('Partner is already registered.');
                              res
                                .status(202)
                                .send(
                                  'Your partner is already' +
                                    ' registered for this tournament.',
                                );
                            } else {
                              // if no user was found,
                              // register both
                              Registrations.forge([
                                {
                                  tournament_id: req.params.t_id,
                                  user_id: req.body.id,
                                  role: req.body.role,
                                  is_independent: req.body.is_independent,
                                  comment: req.body.comment,
                                  funding: req.body.funding,
                                  teamname: req.body.team || '',
                                },
                                {
                                  tournament_id: req.params.t_id,
                                  user_id: req.body.partner1,
                                  role: req.body.role,
                                  teamname: req.body.team || '',
                                },
                              ])
                                .invokeThen('save')
                                .then(entry => {
                                  console.info(
                                    `Successfully registered for ${
                                      req.params.t_id
                                    } with ${req.body.partner1} as speakers.`,
                                  );
                                  res.status(200).send(entry);
                                });
                            }
                          });
                      }
                    } else {
                      // if no partner is named, reg user alone
                      Registration.forge({
                        tournament_id: req.params.t_id,
                        user_id: req.body.id,
                        role: req.body.role,
                        is_independent: req.body.is_independent,
                        comment: req.body.comment,
                        funding: req.body.funding,
                        teamname: req.body.team || '',
                      })
                        .save()
                        .then(entry => {
                          console.info(
                            `Successfully registered for ${
                              req.params.t_id
                            } as speaker.`,
                          );
                          res.status(200).send(entry);
                        });
                    }
                  } else {
                    // if none of the reg roles apply return error
                    console.error(
                      `Error while registering user as ${req.body.role}`,
                    );
                    res
                      .status(202)
                      .send(`Error while registering user as ${req.body.role}`);
                  }
                }
              });
          }
        });
    } catch (ex) {
      console.log(ex);
    }
  });

  // for delete registration
  router.route('/deleteReg/:id').delete((req, res) => {
    try {
      Registration.forge({ id: req.params.id })
        .fetch({ require: true })
        .then(registration => {
          if (
            registration.toJSON().user_id !== req.user.id &&
            req.user.position !== 1
          ) {
            console.info('You are not authorized to delete that registration.');
            res.json({
              error: true,
              message: 'You are not authorized to delete that registration.',
            });
            return false;
          }

          registration.destroy();
          return true;
        })
        .then(authorized => {
          if (authorized) {
            console.info('Deleting registration successful');
            res.json({
              error: false,
              message: 'Deleting registration successful.',
            });
          }
        });
    } catch (err) {
      console.error(`Error while deleting registration. Error: ${err.message}`);
      res.json({ error: true, message: 'Error while deleting registration.' });
    }
  });

  // update registration
  router.route('/updateReg').put((req, res) => {
    try {
      Registration.forge({ id: req.body.reg_id })
        .fetch({ require: true })
        .then(registration => {
          if (
            registration.toJSON().user_id !== req.user.id &&
            req.user.position !== 1
          ) {
            console.info('You are not authorized to update that registration.');
            res.json({
              error: true,
              message: 'You are not authorized to update that registration.',
            });
            return false;
          }

          registration.save({
            role: req.body.role,
            is_independent: req.body.is_independent,
            teamname: req.body.teamname,
            comment: req.body.comment,
            funding: req.body.funding,
            price_paid: req.body.price_paid,
            price_owed: req.body.price_owed,
            transaction_date: req.body.transaction_date,
            transaction_from: req.body.transaction_from,
          });
          return true;
        })
        .then(authorized => {
          if (authorized) {
            console.info('Updating registration successful.');
            res
              .status(200)
              .json({
                error: false,
                message: 'Updating registration successful.',
              });
          }
        })
        .catch(err => {
          console.error(
            `Error while updating registration. Error: ${err.message}`,
          );
          res.json({
            error: true,
            message: 'Error while updating registration.',
          });
        });
    } catch (ex) {
      console.log(ex);
    }
  });

  // set success
  router.route('/setSuccess').put((req, res) => {
    try {
      Registration.forge({ id: req.body.reg_id })
        .fetch({ require: true })
        .then(registration => {
          if (
            registration.toJSON().user_id !== req.user.id &&
            req.user.position !== 1
          ) {
            console.info('You are not authorized to change that entry.');
            res.json({
              error: true,
              message: 'You are not authorized to change that entry.',
            });
            return false;
          }

          registration.save({
            points: req.body.points,
            success: req.body.success,
          });
          return true;
        })
        .then(authorized => {
          if (authorized) {
            console.info('Setting record successful.');
            res.json({ error: false, message: 'Setting record successful.' });
          }
        })
        .catch(err => {
          console.error(`Error while setting record. Error: ${err.message}`);
          res.json({ error: true, message: 'Error while setting record.' });
        });
    } catch (ex) {
      console.log(ex);
    }
  });

  // set success
  router.route('/setPartner').put((req, res) => {
    try {
      Registration.forge({ id: req.body.reg_id })
        .fetch({ require: true })
        .then(registration => {
          if (
            registration.toJSON().user_id !== req.user.id &&
            req.user.position !== 1
          ) {
            console.info('You are not authorized to change that registration.');
            res.json({
              error: true,
              message: 'You are not authorized to change that registration.',
            });
            return false;
          }

          if (req.body.partnerNumber === 1) {
            registration.save({
              partner1: req.body.partnerID,
            });
          } else if (req.body.partnerNumber === 2) {
            registration.save({
              partner2: req.body.partnerID,
            });
          } else {
            throw error;
          }
          return true;
        })
        .then(authorized => {
          if (authorized) {
            console.info('Setting partner successful.');
            res.json({ error: false, message: 'Setting partner successful.' });
          }
        })
        .catch(err => {
          console.error(`Error while setting partner. Error: ${err.message}`);
          res.json({ error: true, message: 'Error while setting partner.' });
        });
    } catch (ex) {
      console.log(ex);
    }
  });

  // update registration
  router.route('/setAttendance').put((req, res) => {
    try {
      // CHECK AUTHORIZATION
      if (req.user.position !== 1) {
        console.info('You are not authorized to update that registration.');
        res.json({
          error: true,
          message: 'You are not authorized to update that registration.',
        });
        return false;
      }
    } catch (ex) {
      console.error(ex);
      res.json({
        error: true,
        message: 'You are not authorized to update that registration.',
      });
      throw ex;
    }

    try {
      Registration.forge({ id: req.body.reg_id })
        .fetch({ require: true })
        .then(registration => {
          const role = registration.toJSON().role,
            attendanceStatus = parseInt(req.body.attendanceStatus);
          const WENT = 1,
            CAN_GO = 2,
            REGISTERED = 0,
            DIDNT_GO = 3;

          console.log(attendanceStatus === REGISTERED);

          if (
            attendanceStatus === REGISTERED ||
            attendanceStatus === CAN_GO ||
            attendanceStatus === DIDNT_GO
          ) {
            registration.save({
              attended: attendanceStatus,
              price_owed: 0,
              points: 0,
              success: null,
            });
          } else if (attendanceStatus === WENT) {
            registration.save({
              attended: WENT,
              price_owed:
                (registration.toJSON().is_independent ? 0 : req.body.price) ||
                0,
              points: role === 'judge' ? 5 : 0,
              success: role === 'judge' ? 'judge' : null,
            });
          }

          return true;
        })
        .then(authorized => {
          if (authorized) {
            console.info('Successfully set attendance status.');
            res
              .status(200)
              .json({
                error: false,
                message: 'Successfully set attendance status.',
              });
          }
        });
    } catch (err) {
      console.error(
        `Error while setting attendance back. Error: ${err.message}`,
      );
      res.json({ error: true, message: 'Error while setting attendance.' });
    }
  });

  return router;
};
