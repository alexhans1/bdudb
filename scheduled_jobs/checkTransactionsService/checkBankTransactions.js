// enables environment variables for development
const dotenv = require('dotenv');

dotenv.config({ path: '../../.env' });

const moment = require('moment');
const schedule = require('node-schedule');

const request = require('request-promise');

const processTransactions = require('./processTransactions');
const transactionIdModelHelpers = require('./transactionIdModelHelpers');

const baseURL = process.env.finAPIBaseURL;

const CLIENT_ID = process.env.finApiClientID;
const CLIENT_SECRET = process.env.finApiClientSecret;

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// ++++++++++++++++++++++++++++++++++ CONNECTING TO BANK TO GET TRANSACTIONS ++++++++++++++++++++++++++++++++++++++++++
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

const authenticateClient = () => {
  const options = {
    method: 'POST',
    url: `${baseURL}/oauth/token`,
    qs: {
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    },
    json: true,
  };

  try {
    request(options)
      .then(parsedBody => {
        if (parsedBody.access_token) {
          authenticateUser(parsedBody.access_token);
        } else console.error('No client token!');
      })
      .catch(err => {
        console.error('$$$ Error while getting client token.');
        console.error(err.message);
      });
  } catch (err) {
    console.error('$$$ Error while getting client token.');
    console.error(err.message);
  }
};

const authenticateUser = clientToken => {
  const options = {
    method: 'POST',
    url: `${baseURL}/oauth/token`,
    qs: {
      grant_type: 'password',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      username: process.env.finApiUsername,
      password: process.env.finApiUserPassword,
    },
    headers: {
      Authorization: `Bearer ${clientToken}`,
    },
    json: true,
  };

  try {
    request(options)
      .then(parsedBody => {
        if (parsedBody.access_token) {
          updateBankConnection(parsedBody.access_token);
        } else console.error('No user token!');
      })
      .catch(err => {
        console.error('$$$ Error while authenticating user.');
        console.log(err.message);
      });
  } catch (err) {
    console.error('$$$ Error while authenticating user.');
    console.error(err.message);
  }
};

const updateBankConnection = userToken => {
  const options = {
    method: 'POST',
    url: `${baseURL}/api/v1/bankConnections/update`,
    body: {
      bankConnectionId: process.env.finApiBankConnectionId,
    },
    headers: {
      Authorization: `Bearer ${userToken}`,
    },
    json: true,
  };

  try {
    request(options)
      .then(parsedBody => {
        if (!parsedBody.errors) {
          setTimeout(() => {
            getAllTransactions(userToken);
          }, 180000);
        } else {
          console.error('$$$ Update bank connection failed.');
          console.error(parsedBody.errors);
        }
      })
      .catch(err => {
        console.error('$$$ Error while updating bank connection');
        console.log(err.message);
      });
  } catch (err) {
    console.error('$$$ Error while updating bank connection');
    console.error(err.message);
  }
};

async function getAllTransactions(userToken) {
  const options = {
    method: 'GET',
    url: `${baseURL}/api/v1/transactions`,
    qs: {
      view: 'userView',
      direction: 'income',
      includeChildCategories: true,
      perPage: 500,
      minBankBookingDate: moment()
        .subtract(1, 'days')
        .format('YYYY-MM-DD'),
    },
    headers: {
      Authorization: `Bearer ${userToken}`,
    },
    json: true,
  };

  try {
    const response = await request(options);
    if (response.transactions) {
      const newTransactions = await transactionIdModelHelpers.removeProcessedTransactions(
        response.transactions,
      );
      processTransactions.processTransactions(newTransactions);
      transactionIdModelHelpers.saveTransactionIds(newTransactions);
    }
  } catch (ex) {
    console.error('$$$ Error while getting all transactions.');
    console.log(ex.message);
  }
}

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++++++++++++++++++++++ PROCESS TRANSACTIONS IN DATABASE +++++++++++++++++++++++++++++++++++++++++++++
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

// run banking service Mondays, Wednesdays and Fridays at 7pm German time (or 5pm iso time)
schedule.scheduleJob('0 17 * * *', () => {
  console.log('$$$ Starting to check Bank Transactions $$$');
  authenticateClient();
});
