let dotenv = require('dotenv'); //enables environment variables for development
dotenv.config({ path: '../.env' });
let _ = require('lodash');
let moment = require('moment');

let conn, knex, Bookshelf;
try {
  conn = require('../knexfile.js'); //read out the DB Conn Data
  knex = require('knex')(conn[process.env.NODE_ENV || 'local']); //require knex query binder
  Bookshelf = require('bookshelf')(knex); //require Bookshelf ORM Framework
} catch (ex) {
  console.log(ex);
}

// DEFINE MODELS
let Models = require('../models/bookshelfModels.js')(Bookshelf);

let test = false;

// GENERATE EMAIL ARRAY
let emailArr = [];
let sentArr = [];
let successIDs = [];

let totalSentMails = 0;
let totalErrors = 0;

async function buildEmailArr() {
  let promise = Models.Tournaments.forge().fetch({ withRelated: ['users'] });
  try {
    await promise.then(tournaments => {
      tournaments = tournaments.toJSON();
      _.each(tournaments, function(tournament) {
        tournament.users = _.reject(tournament.users, function(user) {
          return (
            moment(user.last_mail)
              .add(9, 'days')
              .diff(moment()) > 0
          ); //reject if last mail younger than 10 days
        });
        _.each(tournament.users, function(user) {
          if (
            user._pivot_price_owed !== user._pivot_price_paid &&
            user._pivot_price_owed !== null &&
            user._pivot_price_paid !== null
          ) {
            // if user is not already in emailArr add user
            if (!_.find(emailArr, { email: user.email })) {
              emailArr.push({
                id: user.id,
                vorname: user.vorname,
                name: user.name,
                email: user.email,
                tournaments: [],
                total_debt: 0,
                transaction_purpose: 'Xu6F',
              });
            }
            // add tournament to user's tournaments array
            _.find(emailArr, { id: user.id }).tournaments.push({
              name: tournament.name,
              debt:
                Math.round(
                  (user._pivot_price_owed - user._pivot_price_paid) * 100,
                ) / 100,
            });
            // add debt tu user's total debt
            _.find(emailArr, { id: user.id }).total_debt +=
              Math.round(
                (user._pivot_price_owed - user._pivot_price_paid) * 100,
              ) / 100;
            // add reg id to transaction_purpose
            _.find(emailArr, { id: user.id }).transaction_purpose +=
              user._pivot_id + 'fP4x';
          }
        });
      });

      emailArr = _.filter(emailArr, obj => {
        return obj.total_debt > 0;
      });

      emailArr = emailArr.map(obj => {
        // remove last comma
        obj.transaction_purpose = obj.transaction_purpose.substring(
          0,
          obj.transaction_purpose.length - 1,
        );
        obj.transaction_purpose += 'gT7u ';
        obj.tournaments.forEach((tournament, index) => {
          if (index < obj.tournaments.length - 1) {
            obj.transaction_purpose += tournament.name.substring(0, 20) + ', ';
          } else {
            obj.transaction_purpose += tournament.name.substring(0, 20);
          }
        });
        obj.transaction_purpose = obj.transaction_purpose.substring(0, 140);
        return obj;
      });

      // if (test) {
      // 	// emailArr = _.filter(emailArr, {id: 21});
      // 	emailArr.push({
      // 		name: 'Alexander',
      // 		email: 'alexander.hans.mail@gmail.com',
      // 		tournaments: [],
      // 		total_debt: 40
      // 	});
      // 	emailArr[emailArr.length-1].tournaments.push({
      // 		name: 'Test Turnier',
      // 		debt: 40.00
      // 	});
      // }
    });
  } catch (ex) {
    console.error(ex);
  }
}

async function sendDebtMails() {
  if (!emailArr.length) {
    console.log('NO EMAILS TO SEND\n');
    return;
  }

  console.log('SENDING OUT MAILS\n');

  // SEND OUT EMAILS
  _.each(emailArr, function(obj) {
    let helper = require('sendgrid').mail;
    let fromEmail = new helper.Email('finanzen@debating.de');

    let toEmail;
    if (test) toEmail = new helper.Email('alexander.hans.mail@gmail.com');
    else toEmail = new helper.Email(obj.email);

    let subject = 'BDU Tournament Debts';
    let content = new helper.Content(
      'text/html',
      '' +
        'Hi ' +
        obj.vorname +
        ',<br><br>' +
        'You have debt to the BDU for the following tournaments:<br><br>' +
        '<table>',
    );
    obj.tournaments.forEach(function(tournament) {
      content.value =
        content.value +
        '<tr><th align="left">' +
        tournament.name +
        '</th><td>' +
        Math.round(tournament.debt * 100) / 100 +
        '€</td></tr>';
    });
    content.value =
      content.value +
      '<tr><th align="left">Total</th><td><b>' +
      Math.round(obj.total_debt * 100) / 100 +
      '€</b></td></tr>' +
      '</table>' +
      '<br>BDU Bank Info:<br>' +
      '<table>' +
      '<tr><th align="left">Recipient</th><td>Berlin Debating Union e.V.</td></tr>' +
      '<tr><th align="left">IBAN</th><td>DE36 1203 0000 1020 1051 26</td></tr>' +
      '<tr><th align="left">Institute</th><td>DEUTSCHE KREDITBANK BERLIN</td></tr>' +
      '<tr><th align="left">Transaction purpose (Verwendungszweck)</th><td>' +
      obj.transaction_purpose +
      '</td></tr>' +
      '</table><br><br>' +
      '<b>Important:</b> Please include the transaction purpose in your transfer!<br><br>' +
      'It´s possible to pay your debt by installments (Ratenzahlung). Just email me at ' +
      '<a href="mailto:finanzen@debating.de" target="_top">finanzen@debating.de</a>.<br>' +
      'You can always check your finances at <a href="https://members.debating.de">https://members.debating.de</a>.<br>' +
      'If you have questions regarding your tournaments please talk to me or other BDU board members.<br>' +
      'Best wishes<br>' +
      process.env.finance_board_member;
    let mail = new helper.Mail(fromEmail, subject, toEmail, content);

    let sg = require('sendgrid')(process.env.SENDGRID_KEY);
    let request = sg.emptyRequest({
      method: 'POST',
      path: '/v3/mail/send',
      body: mail.toJSON(),
    });

    try {
      sg.API(request, function(error, response) {
        if (error) {
          console.error('Error response received');
          console.error(error);
          totalErrors++;
        } else {
          console.info(
            '\nSent out email to ' + obj.vorname + ' ' + obj.name + '.\n',
          );
          sentArr.push(obj.vorname + ' ' + obj.name + ' (' + obj.email + ')');
          successIDs.push(obj.id);
          totalSentMails++;
        }
        console.log('Mail status code: ' + response.statusCode);
      });
    } catch (ex) {
      console.error(ex);
      totalErrors++;
    }
  });
}

async function setLastMail() {
  if (successIDs.length) {
    console.log('Length of successIDs Array:', successIDs.length);

    try {
      Models.User.where('id', 'IN', successIDs)
        .save({ last_mail: new Date() }, { patch: true })
        .then(function(x) {
          console.log(x.toJSON());
          console.log('Successfully saved new last mail date.\n\n');
        });
    } catch (ex) {
      console.error(ex);
    }
  }
}

async function logSummary() {
  if (sentArr.length) {
    await new Promise(resolve => setTimeout(() => resolve(), 2000));

    console.log('\n ✔✔✔ Finished Sending Debt Emails ✔✔✔ \n');
    console.log('Tried to send ' + emailArr.length + ' emails');
    console.log('Success: ' + totalSentMails);
    console.log('Errors: ' + totalErrors);
  } else console.log('\n ✔✔✔ Finished Sending Debt Emails ✔✔✔ \n');
}

let schedule = require('node-schedule');

schedule.scheduleJob('0 19 * * *', function() {
  if (process.env.NODE_ENV === 'production') {
    execute();
  }
});

if (test) execute();

async function execute() {
  console.log('\n\n ✔✔✔ Sending out Debt Emails ✔✔✔ \n\n');
  buildEmailArr();
  await new Promise(resolve => setTimeout(() => resolve(), 3000));
  if (test) console.log(emailArr);
  sendDebtMails();
  await new Promise(resolve => setTimeout(() => resolve(), 9000));
  setLastMail();
  await new Promise(resolve => setTimeout(() => resolve(), 9000));
  logSummary();
}
