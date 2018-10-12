/* eslint-disable global-require,no-restricted-syntax */
let conn;
let knex;
let Bookshelf;
try {
  conn = require('../../knexfile.js'); // read out the DB Conn Data
  knex = require('knex')(conn[process.env.NODE_ENV || 'local']); // require knex query binder
  Bookshelf = require('bookshelf')(knex); // require Bookshelf ORM Framework
} catch (ex) {
  console.error(ex.message);
}

// DEFINE MODELS
const Models = require('../../models/bookshelfModels.js')(Bookshelf);

module.exports = {

  async processTransactions(transactions) {
    // Step 1:
    // filter for transactions that have 'Xu6F' in their purpose
    const relevantTransactions = transactions.filter(({ purpose }) => {
      if (purpose) {
        return purpose.includes('Xu6F') && purpose.includes('gT7u');
      }
      return false;
    });

    if (!relevantTransactions.length) {
      console.log('$$$ There are no new incoming transactions with the correct signature.');
      console.log('$$$ Finished Checking Bank Transactions $$$');
      return;
    }

    // Step 2:
    // go through each transaction
    for (const transaction of relevantTransactions) {
      console.log(`$$$ Process transaction(s) from ${transaction.counterpartName}`);

      let tmpAmount = transaction.amount;

      // Step 2.1:
      // extract registration IDs
      const regIdString = transaction.purpose.substring(transaction.purpose.search('Xu6F') + 4,
        transaction.purpose.search('gT7u'));
      const regIds = regIdString.split('fP4x').map(id => parseInt(id, 10));

      // Step 2.2:
      // get the corresponding registrations
      const response = await Models.Registration.where('id', 'IN', regIds).fetchAll();
      const registrations = response.toJSON();
      if (registrations.length !== regIds.length) {
        console.error('$$$ There is an error in the id string. '
          + 'The number of extracted regIds and received registrations does not match.');
      }

      // Step 2.3:
      // Calculate total debt of all given registrations
      let totalTransactionDebt = 0;
      registrations.forEach((registration) => {
        totalTransactionDebt += registration.price_owed - registration.price_paid;
      });

      // Step 2.4
      // Update Registrations
      if (transaction.amount === totalTransactionDebt) {
        // set all price_paid to price_owed
        for (const regId of regIds) {
          try {
            await Models.Registration.forge({ id: regId }).fetch()
              .then((registration) => {
                registration.save({
                  price_paid: registration.toJSON().price_owed,
                  transaction_date: transaction.bankBookingDate,
                  transaction_from: transaction.counterpartName.substring(0, 45),
                });
                console.log(`$$$ Saved registration with ID ${regId} for user ${transaction.counterpartName}`);
              });
          } catch (ex) {
            console.error(ex.message);
          }
        }
      } else if (transaction.amount > totalTransactionDebt) {
        // set all price_paid to price_owed exept for the first registration
        for (const regId of regIds) {
          try {
            await Models.Registration.forge({ id: regId }).fetch()
              .then((registration) => {
                const amountToSet = (regId === regIds[0])
                  ? registration.toJSON().price_paid + (transaction.amount - totalTransactionDebt)
                  : registration.toJSON().price_owed;
                registration.save({
                  price_paid: amountToSet,
                  transaction_date: transaction.bankBookingDate,
                  transaction_from: transaction.counterpartName.substring(0, 45),
                });
                console.log(`$$$ Saved registration with ID ${regId} for user ${transaction.counterpartName}`);
              });
          } catch (ex) {
            console.error(ex.message);
          }
        }
      } else {
        // first distribute potential credit
        for (const regId of regIds) {
          try {
            await Models.Registration.forge({ id: regId }).fetch()
              .then((registration) => {
                registration = registration.toJSON();
                // if there is credit
                if (registration.price_paid > registration.price_owed) {
                  // add the credit to the tmpAmount
                  tmpAmount += registration.price_paid - registration.price_owed;

                  // balance the registration
                  registration.save({
                    price_paid: registration.price_owed,
                    transaction_date: transaction.bankBookingDate,
                    transaction_from: transaction.counterpartName.substring(0, 45),
                  });

                  // remove the registration from the regIds
                  _.remove(regIds, id => (id === regId));

                  console.log('$$$ Balanced credit.', regId);
                }
              });
          } catch (ex) {
            console.error(ex.message);
          }
        }

        for (const regId of regIds) {
          await Models.Registration.forge({ id: regId }).fetch()
            .then((registration) => {
              if (registration) {
                const reg = registration.toJSON();
                // if registration exists, check if transaction amount covers the debt
                if ((reg.price_owed - reg.price_paid) <= tmpAmount) {
                  try {
                    registration.save({
                      price_paid: reg.price_owed,
                      transaction_date: transaction.bankBookingDate,
                      transaction_from: transaction.counterpartName.substring(0, 45),
                    })
                      .then(() => {
                        console.log(`$$$ Successfully processed transaction for registration with ID: ${
                          regId} for ${transaction.counterpartName}`);
                        tmpAmount -= (reg.price_owed - reg.price_paid);
                      });
                  } catch (ex) {
                    console.error(ex.message);
                  }
                } else {
                  // check if price_paid is already bigger than price_owed (Guthaben)
                  if (reg.price_paid > reg.price_owed) {

                  }

                  // if tmpAmount is smaller than the debt for this registration, save the possible amount
                  try {
                    registration.save({
                      price_paid: reg.price_paid + tmpAmount,
                      transaction_date: transaction.bankBookingDate,
                      transaction_from: transaction.counterpartName.substring(0, 45),
                    })
                      .then(() => {
                        console.log(`$$$ Successfully updated rest amount for registration with ID: ${
                          regId} for ${transaction.counterpartName}`);
                        tmpAmount -= (reg.price_owed - reg.price_paid);
                      });
                  } catch (ex) {
                    console.error(ex.message);
                  }
                }
              } else {
                // if the registration does not exist
                console.error(`$$$ The registration in the transaction purpose with the ID: ${
                  regId} does not exist for ${transaction.counterpartName}`);
              }
            });
        }
      }
    }

    console.log('\n\n $$$ Finished Checking Bank Transactions $$$ \n\n');
  },
};
