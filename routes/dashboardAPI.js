/**
 * Created by alex.hans on 29.07.2017.
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
    .route('/clubDebt')
    // fetch all users
    .get(function(req, res) {
      let result = {
        name: 'Club Debt',
        data: [],
      };

      try {
        Models.Club_Debt_Col.forge()
          .fetch()
          .then(clubDebtCollection => {
            console.info('Successfully retrieved all daily club debt.');
            clubDebtCollection = clubDebtCollection.toJSON();

            clubDebtCollection.forEach(obj => {
              result.data.push([moment(obj.timestamp).unix() * 1000, obj.debt]);
            });
            res.send(result);
          });
      } catch (ex) {
        console.log(ex);
      }
    });

  return router;
};
