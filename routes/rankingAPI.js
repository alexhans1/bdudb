/**
 * Created by alex.hans on 19.07.2017.
 */

let express = require('express');
let router = express.Router();
let _ = require('lodash');
let moment = require('moment');

//Used for routes that must be authenticated.
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
  //Register the authentication middleware
  //for all URIs use the isAuthenticated function
  router.use('/', isAuthenticated);

  // --------------------------------------------------------------------------
  // ------------------------------MODELS--------------------------------------
  // --------------------------------------------------------------------------

  let Models = require('../models/bookshelfModels.js')(Bookshelf);

  // --------------------------------------------------------------------------
  // ------------------------------USER REST API-------------------------------
  // --------------------------------------------------------------------------

  router
    .route('/all')
    // fetch all users
    .get(function(req, res) {
      let result = [];

      // get all tournaments
      async function fetchOldestTournament() {
        let oldestTournament;
        try {
          oldestTournament = await Models.Tournaments.forge()
            .orderBy('startdate', 'ASC')
            .fetchOne();
        } catch (ex) {
          console.log(ex);
        }
        return oldestTournament;
      }
      fetchOldestTournament().then(function(oldestTournament) {
        // build ranking data
        try {
          Models.Users.forge()
            .fetch({ withRelated: ['tournaments'] })
            .then(function(users) {
              users = users.toJSON();

              _.forEach(users, function(user, index) {
                result.push({
                  name: user.vorname + ' ' + user.name.substring(0, 1) + '.',
                  data: [],
                  showInNavigator: true,
                });
                user.totalPoints = 0;
                let a = moment(oldestTournament.toJSON().startdate).subtract(
                  10,
                  'days',
                );
                let b = moment();
                for (let m = b; m.isAfter(a); m.subtract(10, 'days')) {
                  let tmpPoints = 0;
                  _.each(user.tournaments, tournament => {
                    if (tournament._pivot_points) {
                      start = moment(tournament.startdate);
                      if (
                        m.isAfter(start) &&
                        m.isBefore(start.clone().add(1, 'year'))
                      ) {
                        tmpPoints += tournament._pivot_points;
                      }
                    }
                  });
                  result[index].data.push([m.unix() * 1000, tmpPoints]);
                }
              });
              // res.json({error: false, data: users.toJSON()});
            })
            .then(function() {
              let nowData = _.map(result, function(obj) {
                if (obj.type === 'flags') return obj;
                return {
                  name: obj.name,
                  currentPoints: obj.data[0][1],
                };
              });
              let topNames = _.map(
                _.orderBy(nowData, ['currentPoints'], ['desc']).slice(0, 10),
                function(obj) {
                  return obj.name;
                },
              );
              if (req.user) topNames = _.union([req.user.vorname], topNames);

              result = _.filter(result, function(obj) {
                return _.includes(topNames, obj.name);
              });
            })
            .then(function() {
              //add tournament flags
              result.push({
                type: 'flags',
                name: 'Tournaments List',
                data: [],
                showInLegend: true,
                shape: 'flag', // Defines the shape of the flags.)
                color: '#f36c25', // same as onSeries
                fillColor: '#f36c25',
                style: {
                  // text style
                  color: 'white',
                },
                stackDistance: 24,
              });
              try {
                oldestTournament = Models.Tournaments.forge()
                  .orderBy('startdate', 'ASC')
                  .fetch()
                  .then(function(tournaments) {
                    tournaments = tournaments.toJSON();
                    _.each(tournaments, obj => {
                      if (moment(obj.startdate).isAfter(moment())) return;
                      let startdate = moment(obj.startdate);
                      if (startdate.day() === 5) startdate.add(1, 'days');
                      if (startdate.day() === 7) startdate.subtract(1, 'days');
                      result[result.length - 1].data.push({
                        x: startdate.unix() * 1000,
                        title: obj.name,
                        text: obj.name,
                      });
                    });

                    res.send(result);
                  });
              } catch (ex) {
                console.log(ex);
              }
            });
        } catch (err) {
          console.error(
            'Error while generating ranking data. Error message:\n' + err,
          );
          res.status(500).json({ error: true, message: err.message });
        }
      });
    });

  return router;
};
