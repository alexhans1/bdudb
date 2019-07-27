let conn, knex, Bookshelf;
try {
  conn = require('../../knexfile.js'); // read out the DB Conn Data
  knex = require('knex')(conn[process.env.NODE_ENV || 'local']); // require knex query binder
  Bookshelf = require('bookshelf')(knex); // require Bookshelf ORM Framework
} catch (ex) {
  console.log(ex);
}

// DEFINE MODELS
const Models = require('../../models/bookshelfModels.js')(Bookshelf);

module.exports = {
  saveTransactionIds(transactions) {
    // Step 1:
    // extract Transaction Ids
    const transactionIds = transactions.map(transaction => ({
      transaction_id: transaction.id,
    }));

    // Step 2:
    // save transactionIds into db
    try {
      const model = Models.Transaction_Ids_Col.forge(transactionIds);
      model.invokeThen('save').then(response => {
        // console.log(response);
      });
    } catch (err) {
      console.error(err.message);
    }
  },

  async removeProcessedTransactions(transactions) {
    // Step 1:
    // get all existing transaction ids
    const response = await Models.Transaction_Ids.fetchAll();
    const existingTransactionIds = response
      .toJSON()
      .map(({ transaction_id }) => transaction_id);

    // Step 2:
    // filter out transactions that have previously been processed
    return transactions.filter(
      ({ id }) => !existingTransactionIds.includes(id.toString()),
    );
  },
};
