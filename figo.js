let figo = require('figo');

// Demo client 
let client_id     = 'CaESKmC8MAhNpDe5rvmWnSkRE_7pkkVIIgMwclgzGcQY'; // Demo client ID
let client_secret = 'STdzfv0GXtEj_bwYn7AgCVszN1kKq5BdgEIKOM_fzybQ'; // Demo client secret 

let connection = new figo.Connection(client_id, client_secret);

// // User personal data
// let name            = 'John Doe';
// let email           = 'john.doe@example.com';
// let password        = 'Swordfish';
// let language        = 'en';
//
// connection.create_user(name, email, password, language, null, function(error, recovery_password) {
// 	if (error) {
// 		console.error(error);
// 	} else {
// 		console.log(recovery_password);
// 	}
// });
//
// let access_token = '';
//
// connection.credential_login(name, password, null, null, null, null, function(error, token) {
// 	if (error) {
// 		console.error(error);
// 	} else {
// 		access_token = token.access_token;
// 	}
// });



let session = new figo.Session('ASHWLIkouP2O6_bgA2wWReRhletgWKHYjLqDaqb0LFfamim9RjexTo22ujRIP_cjLiRiSyQXyt2kM1eXU2XLFZQ0Hro15HikJQT_eNeT_9XQ');

session.get_supported_payment_services('de', 'banks', function (error, result) {
	if (error) console.error(error);
	console.log(result);
});

// session.add_account('de', ['1016806281_p', 'a1010'], 'wirdUeberschrieben', 'DE56120300001016806281', false, function (error, result) {
// 	if (error) console.error(error);
// 	console.log(result);
// });

// session.get_account("A1.1", function(error, account) {
// 	if (error) {
// 		console.error(error);
// 	} else {
// 		account.get_transactions(null, function(error, transactions) {
// 			transactions.forEach(function(transaction) {
// 				console.log('Transaktion: ' + transaction.purpose + '\n');
// 			});
// 		});
// 	}
// });