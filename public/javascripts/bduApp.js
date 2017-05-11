var app = angular.module('bduApp', [
	'ngRoute',
	'ngResource',
	'ngDialog',
	'ngFileUpload',
	'ngImgCrop'
])
.run(function ($http, $rootScope, TournamentService) {

	$rootScope.fiveDaysAgo = new Date(Date.now()-432000000);

	$rootScope.personnelDebt = 0;

	$rootScope.authenticated = false;
	$rootScope.istVorstand = false;
	$rootScope.user = null;

	$http.get('/sendUser')
	.then(function (user) {
		if (user.status !== 204) {
			$rootScope.authenticated = true;
			$rootScope.istVorstand = (user.data.position === 1);
			$rootScope.user = user.data;
		}
	}, function errorCallback(err) {
		alert(err);
	});


	$rootScope.signout = function () {
		$http.get('/logout');
		$rootScope.user = null;
		$rootScope.authenticated = false;
		$rootScope.istVorstand = false;
	};

	//get all Tournaments and set number of new Tournaments
	setNewTournaments = function () {
		var tournaments = TournamentService.query(function () {
			$rootScope.newTournamentCount = _.sumBy(tournaments, function (t) {
				d = new Date(t.created_at);
				d2 = new Date(Date.now() - 432000000);
				return d > d2;
			});
		});
	};
	setNewTournaments();

});

//durch die config wird definiert welche URIs welche controller verwenden
app.config(function ($routeProvider) {
	$routeProvider
	//the login display
	.when('/', {
		templateUrl: 'login.html',
		controller: 'authCtrl'
	})
	//the signup display
	.when('/signup', {
		templateUrl: 'signup.html',
		controller: 'authCtrl'
	})
	//the forgot password display
	.when('/forgot', {
		templateUrl: 'forgot.html',
		controller: 'ResetCtrl'
	})
	//the profile display
	.when('/profile', {
		templateUrl: 'profile.html',
		controller: 'mainCtrl'
	})
	//the tournaments display
	.when('/tournaments', {
		templateUrl: 'tournaments.html',
		controller: 'TournamentCtrl'
	})
	//the vorstand display
	.when('/vorstand', {
		templateUrl: 'vorstand.html',
		controller: 'VorstandCrtl'
	})
	//the reg overview display
	.when('/anmeldungen', {
		templateUrl: 'anmeldungen.html',
		controller: 'OverviewCtrl'
	})
	//the reg overview display
	.when('/finances', {
		templateUrl: 'finances.html',
		controller: 'FinanceCtrl'
	})
	//the tournaments display
	.when('/editTournament', {
		templateUrl: 'editTournament.html',
		controller: 'TournamentCtrl'
	})
	//the tournaments display
	.when('/imageUpload', {
		templateUrl: 'imageUpload.html',
		controller: 'UploadCtrl'
	})
	//the bug report display
	.when('/bugReport', {
		templateUrl: 'bugReport.html',
		// templateUrl: 'test.html',
		controller: 'bugCtrl'
	})
	.otherwise({
		redirectTo: '/'
	});
});

//RESOURCE SERVICE FACTORIES

app.factory('UserService', function ($resource) {
	return $resource('/app/user/:id', {}, {
		update: {
			method: 'PUT' // this method issues a PUT request
		}
	});
});

app.factory('TournamentService', function ($resource) {
	return $resource('/app/tournament/:id', {}, {
		update: {
			method: 'PUT' // this method issues a PUT request
		}
	});
});

app.factory('BugReportService', function ($resource) {
	return $resource('/bugs/:id', {}, {
		update: {
			method: 'PUT' // this method issues a PUT request
		}
	});
});

app.controller('mainCtrl', function ($scope, $http, $rootScope, $location, $window, ngDialog, UserService) {

	if (!$rootScope.authenticated) {
		$location.path('/');
	} else {
		//if user is logged in then the user can see the profile page

		//get the logged in user
		var user = UserService.get({id: $rootScope.user.id}, function () {
			$scope.debt = _.sumBy(user.tournaments, function (ts) {
				return (ts.pivot_price_paid - ts.pivot_price_owed)
			});
			$scope.totalPoints = _.sumBy(user.tournaments, function (ts) {
				return (ts.pivot_points)
			});
			$rootScope.personnelDebt = $scope.debt;
			$scope.user = user;
			$scope.user.tournaments = _.orderBy($scope.user.tournaments, ['startdate'], 'desc');
		});

		$scope.update = false;

		//UPDATE USER INFO
		$scope.updateUser = function () {
			var parameters = JSON.stringify({
				email: $scope.user.email,
				name: $scope.user.name,
				vorname: $scope.user.vorname,
				gender: $scope.user.gender,
				food: $scope.user.food
			});
			UserService.update({id: $rootScope.user.id}, parameters, function (result) {
				if (!result.error) {
					showSnackbar(true, result.message);
					$scope.update = false;
				}
				else {
					showSnackbar(false, result.message);
					$scope.update = false;
				}
			});
		};

		//CHANGE PASSWORD FUNCTION
		$scope.change = false;
		$scope.oldPassword = '';
		$scope.newPassword = '';
		$scope.confirmPassword = '';
		$scope.changePwd = function () {
			if($scope.newPassword !== $scope.confirmPassword) $scope.match = false;
			else {
				var parameters = JSON.stringify({
					newPwd: $scope.newPassword,
					oldPwd: $scope.oldPassword,
					userID: $scope.user.id
				});
				$http.post('/changePassword', parameters)
				.then(function successCallback(res) {
					if (!res.data.error) {
						$scope.change = false;
						$scope.update = false;
						showSnackbar(true, res.data.message);
					} else {
						showSnackbar(false, res.data.message);
					}
				}, function errorCallback(err) {
					showSnackbar(false, err.data);
				});
			}
		};
		$scope.match = true;
		$scope.checkMatch = function () {
			$scope.match = ($scope.newPassword === $scope.confirmPassword) || ($scope.newPassword === '' || $scope.confirmPassword === '');
		};

		//SHOW TOURNAMENT DETAILS DIALOG
		$scope.openDetails = function (tournament) {
			$scope.tournament = tournament;
			ngDialog.open({
				template: 'profileTournamentDialog.html',
				controller: 'mainCtrl',
				scope: $scope
			});
		};

		$scope.close = function () {
			$scope.closeThisDialog();
		};

		//DELETE REGISTRATION
		$scope.unreg = function (regID, t_id) {
			var deleteReg = $window.confirm('Are you absolutely sure you want to delete this registration?');
			if (deleteReg) {
				$http({
					url: 'app/deleteReg/' + regID,
					method: 'DELETE',
					headers: {
						"Content-Type": "application/json;charset=utf-8"
					}
				})
				.then(function successCallback(res) {
					if (!res.error) {
						_.remove($scope.user.tournaments, {id: t_id});
						showSnackbar(true, res.data.message);
					} else {
						showSnackbar(false, 'Error while removing your registration.');
					}
				}, function errorCallback(err) {
					showSnackbar(false, err.data);
				});
			}
		};

		//UPDATE REGISTRATION USING INLINE EDIT

		$scope.selected = {};
		// gets the template to ng-include for a table row / item
		$scope.getTemplate = function (tournament) {
			if (tournament.id === $scope.selected.id) return 'edit';
			return 'display';
		};

		$scope.editContact = function (tournament) {
			$scope.selected = angular.copy(tournament);
			$scope.selected.pivot_role = _.find($scope.roles, {'value': $scope.selected.pivot_role});
		};

		$scope.saveReg = function (idx, reg_id) {

			var url = '/app/updateReg';
			var team = ($scope.selected.pivot_role.value === 'speaker') ? $scope.selected.pivot_teamname : '';
			var parameters = JSON.stringify({
				reg_id: reg_id,
				role: $scope.selected.pivot_role.value,
				teamname: team,
				comment: $scope.selected.pivot_comment
			});
			$http.put(url, parameters)
			.then(function successCallback(res) {
				res = res.data;
				if (!res.error) {
					showSnackbar(true, res.message);
				} else {
					showSnackbar(false, res.message);
				}
			});

			$scope.user.tournaments[idx] = angular.copy($scope.selected);
			$scope.user.tournaments[idx].pivot_role = $scope.user.tournaments[idx].pivot_role.value;
			$scope.reset();
		};

		$scope.reset = function () {
			$scope.selected = {};
		};

		$scope.roles = [{
			id: 1,
			value: 'judge',
			label: 'judge'
		}, {
			id: 2,
			value: 'speaker',
			label: 'speaker'
		}, {
			id: 3,
			value: 'independent',
			label: 'independent'
		}];

		//SET SUCCESS
		$scope.successes = [
			{
				id: 0,
				value: null,
				label: 'none'
			}, {
				id: 1,
				value: 'judge',
				label: 'judge'
			}, {
				id: 2,
				value: 'break',
				label: 'break'
			}, {
				id: 3,
				value: 'final',
				label: 'final'
			}, {
				id: 4,
				value: 'win',
				label: 'win'
			}, {
				id: 5,
				value: 'judge2',
				label: 'judge for different institution'
			}, {
				id: 6,
				value: 'break2',
				label: 'break for different institution'
			}, {
				id: 7,
				value: 'final2',
				label: 'final for different institution'
			}, {
				id: 8,
				value: 'win2',
				label: 'win for different institution'
			}, {
				id: 9,
				value: 'breakESL',
				label: 'break ESL'
			}, {
				id: 10,
				value: 'finalESL',
				label: 'final ESL'
			}, {
				id: 11,
				value: 'winESL',
				label: 'win ESL'
			}, {
				id: 12,
				value: 'break2ESL',
				label: 'break ESL for different institution'
			}, {
				id: 13,
				value: 'final2ESL',
				label: 'final ESL for different institution'
			}, {
				id: 14,
				value: 'win2ESL',
				label: 'win ESL for different institution'
			}];

		$scope.success = '';
		$scope.setSuccess = function (success, factor, regID) {
			var points = 0;
			if (success.id === 1) points = 5;
			else if (success.id === 2) points = factor * 2 + 1;
			else if (success.id === 3) points = factor * 3 + 2;
			else if (success.id === 4) points = factor * 4 + 3;
			else if (success.id === 5) points = 2.5;
			else if (success.id === 6) points = (factor * 2 + 1) / 2;
			else if (success.id === 7) points = (factor * 3 + 2) / 2;
			else if (success.id === 8) points = (factor * 4 + 3) / 2;
			else if (success.id === 9) points = ((factor - 2) * 2 + 1);
			else if (success.id === 10) points = ((factor - 2) * 3 + 2);
			else if (success.id === 11) points = ((factor - 2) * 4 + 3);
			else if (success.id === 12) points = ((factor - 2) * 2 + 1) / 2;
			else if (success.id === 13) points = ((factor - 2) * 3 + 2) / 2;
			else if (success.id === 14) points = ((factor - 2) * 4 + 3) / 2;

			var url = '/app/setSuccess';
			var parameters = JSON.stringify({
				reg_id: regID,
				points: points,
				success: success.value
			});
			$http.put(url, parameters)
			.then(function successCallback(res) {
				res = res.data;
				if (!res.error) {
					var index = _.findIndex($scope.user.tournaments, {'pivot_id': regID});
					$scope.totalPoints += points - $scope.user.tournaments[index].pivot_points;
					_.set($scope.user.tournaments[index], 'pivot_points', points);
					_.set($scope.user.tournaments[index], 'pivot_success', success.value);
					showSnackbar(true, res.message);
				} else {
					showSnackbar(false, res.message);
				}
			});
		};

		//SET PARTNER
		var users = UserService.query(function () {
			var emptyPartner = {
				vorname: 'none',
				name: '',
				id: null
			};
			users.push(emptyPartner);
			$scope.partners = _.orderBy(users, ['vorname'], 'asc');
		});

		$scope.setPartner = function (partnerID, regID, partnerNumber) {
			var url = '/app/setPartner';
			var parameters = JSON.stringify({
				reg_id: regID,
				partnerNumber: partnerNumber,
				partnerID: partnerID
			});
			$http.put(url, parameters)
			.then(function successCallback(res) {
				res = res.data;
				if (!res.error) {
					var index = _.findIndex($scope.user.tournaments, {'pivot_id': regID});
					// $scope.totalPoints += points - $scope.user.tournaments[index].pivot_points;
					if (partnerNumber === 1) {
						_.set($scope.user.tournaments[index], 'pivot_partner1', partnerID);
					}
					if (partnerNumber === 2) {
						_.set($scope.user.tournaments[index], 'pivot_partner2', partnerID);
					}
					showSnackbar(true, res.message);
				} else {
					showSnackbar(false, res.message);
				}
			});
		}
	}
});

app.controller('TournamentCtrl', function ($scope, $http, $rootScope, $location, $window, ngDialog, anchorSmoothScroll, TournamentService) {

	if (!$rootScope.authenticated) {
		$location.path('/');
	} else {

		//get all Tournaments and their Users
		var getAllTournaments = function () {
			var tournaments = TournamentService.query(function () {
				_.forEach(tournaments, function (t) {
					if (t.startdate) t.startdate = new Date(t.startdate);
					if (t.enddate) t.enddate = new Date(t.enddate);
					if (t.deadline) t.deadline = new Date(t.deadline);
				});
				tournaments = _.filter(tournaments, function (t) {
					return (t.enddate > Date.now());
				});
				$scope.tournaments = _.orderBy(tournaments, ['startdate'], 'desc');
				$scope.allTournaments = tournaments;
			});
		};
		getAllTournaments();

		$scope.setTournament = function (id) {
			getAllTournaments();

			$scope.tournament = _.find($scope.allTournaments, {id: id});
			$scope.showDetails = true;

			//check if user is registered for this tournament
			$scope.isReged = (_.find($scope.tournament.users, {'id': $rootScope.user.id}));

			anchorSmoothScroll.scrollTo('details');
		};

		// NG-DIALOG FOR REGISTRATION

		$scope.roles = [{
			id: 1,
			value: 'judge',
			label: 'judge'
		}, {
			id: 2,
			value: 'speaker',
			label: 'speaker'
		}, {
			id: 3,
			value: 'independent',
			label: 'independent'
		}];

		$scope.selected = $scope.roles[0];
		$scope.team = '';
		$scope.comment = '';

		$scope.isSpeaker = false;
		$scope.setRole = function () {
			$scope.isSpeaker = ($scope.selected.id === 2);
		};


		$scope.FormData = {accountNum: ''};
		$scope.ShowNgDialog = function () {
			ngDialog.open({
				template: 'tournamentsDialog.html',
				controller: 'TournamentCtrl',
				scope: $scope
			});
		};

		//REG FUNCTION TO BE CLICKED FROM THE DIALOG
		$scope.reg = function () {

			var url = '/app/reg/' + $scope.tournament.id;
			var parameters = JSON.stringify({
				id: $rootScope.user.id,
				role: $scope.selected.value,
				team: $scope.team,
				comment: $scope.comment
			});
			$http.post(url, parameters)
			.then(function successCallback(response) {
				$scope.closeThisDialog();
				if (response.status === 200) {
					showSnackbar(true, 'Successfully registered.');
					$scope.isReged = true; //TODO this does not currently work because ng-dialog hinders view update
				} else {
					showSnackbar(false, response.data);
				}
			}, function errorCallback(response) {
				showSnackbar(false, response.data);
				$scope.closeThisDialog();
			});
		};

		//DELETE TOURNAMENT FUNCTION
		$scope.delete = function () {
			var deleteTournament = $window.confirm('Are you absolutely sure you want to delete this tournament?');
			if (deleteTournament) {
				TournamentService.delete({id: $scope.tournament.id}, function (res) {
					if (!res.error) {
						getAllTournaments();
						$scope.showDetails = false;
						setNewTournaments();
						showSnackbar(true, res.message);
					} else {
						showSnackbar(false, res.message);
					}
				});
			}
		};

		//TOGGLE THROUGH LANGUAGES
		$scope.toggleVal = 'all';
		$scope.toggle = function () {
			if ($scope.toggleVal === 'en') {
				$scope.tournaments = _.filter($scope.allTournaments, {language: 'other'});
				$scope.toggleVal = 'other';
			} else if ($scope.toggleVal === 'de') {
				$scope.tournaments = _.filter($scope.allTournaments, {language: 'en'});
				$scope.toggleVal = 'en';
			} else if ($scope.toggleVal === 'other') {
				$scope.tournaments = $scope.allTournaments;
				$scope.toggleVal = 'all';
			} else {
				$scope.tournaments = _.filter($scope.allTournaments, {language: 'de'});
				$scope.toggleVal = 'de';
			}
		};

		//DELETE REGISTRATION
		$scope.unreg = function (users) {
			var regID = _.find(users, {'id': $rootScope.user.id}).pivot_id;
			var deleteReg = $window.confirm('Are you absolutely sure you want to delete this registration?');
			if (deleteReg) {
				$http({
					url: 'app/deleteReg/' + regID,
					method: 'DELETE',
					headers: {
						"Content-Type": "application/json;charset=utf-8"
					}
				})
				.then(function successCallback(res) {
					if (!res.error) {
						getAllTournaments();
						$scope.isReged = false;
						showSnackbar(true, res.data.message);
					} else {
						showSnackbar(false, 'Error while removing your registration.');
					}
				}, function errorCallback(err) {
					showSnackbar(false, err.data);
				});
			}
		};

		//EDIT TOURNAMENT FUNCTION
		$scope.showUpdate = false;

		$scope.submitUpdate = function () {

			if ($scope.tournament.startdate) $scope.tournament.startdate = new Date(toLocal($scope.tournament.startdate));
			if ($scope.tournament.enddate) $scope.tournament.enddate = new Date(toLocal($scope.tournament.enddate));
			if ($scope.tournament.deadline) $scope.tournament.deadline = new Date(toLocal($scope.tournament.deadline));

			TournamentService.update({id: $scope.tournament.id}, $scope.tournament, function (result) {
				if (!result.error) {
					getAllTournaments();
					showSnackbar(true, result.message);
				}
				else {
					showSnackbar(false, result.message);
				}
			});
			$scope.showUpdate = false;
		};
	}
});

app.controller('OverviewCtrl', function ($scope, $http, $rootScope, $window, $location, ngDialog, anchorSmoothScroll, TournamentService) {

	if (!$rootScope.authenticated) {
		$location.path('/');
	} else {

		//UEBERSICHT ANMELDUNGEN

		//get all Tournaments and their Users
		var getAllTournaments = function () {
			var tournaments = TournamentService.query(function () {
				$scope.tournamentsusers = _.orderBy(tournaments, ['startdate'], 'desc');
			});
		};
		getAllTournaments();

		// function to sort tournaments by key
		var tournamentDir = 'asc';
		$scope.sortTournaments = function (key) {
			$scope.tournamentsusers = _.orderBy($scope.tournamentsusers, [key], tournamentDir);
			tournamentDir = (tournamentDir === 'asc') ? 'desc' : 'asc';
		};

		// function to sort users by key
		var userDir = 'asc';
		$scope.sortUsers = function (key) {
			$scope.tournament.users = _.orderBy($scope.tournament.users, [key], userDir);
			userDir = (userDir === 'asc') ? 'desc' : 'asc';
		};

		//SET ATTENDED TO 1
		$scope.went = function (role, reg_id) {
			var price = (role === 'speaker') ? $scope.tournament.speakerprice : $scope.tournament.judgeprice;
			var parameters = JSON.stringify({
				reg_id: reg_id,
				attended: 1,
				price: price
			});
			$http.put('/app/setAttended', parameters)
			.then(function successCallback(response) {
				response = response.data;
				if (!response.error) {
					var tournaments = TournamentService.query(function () {
						$scope.tournamentsusers = _.orderBy(tournaments, ['startdate'], 'desc');
						$scope.tournament = _.find($scope.tournamentsusers, {id: $scope.tournament.id});
					});
					showSnackbar(true, response.message);
				} else {
					showSnackbar(false, response.message);
				}
			}, function errorCallback(err) {
				confirm(err.data);
			});
		};

		//DELETE REGISTRATION
		$scope.delete = function (regID) {
			var deleteReg = $window.confirm('Are you absolutely sure you want to delete this registration?');
			if (deleteReg) {
				$http({
					url: 'app/deleteReg/' + regID,
					method: 'DELETE',
					headers: {
						"Content-Type": "application/json;charset=utf-8"
					}
				})
				.then(function successCallback(response) {
					response = response.data;
					if (!response.error) {
						var tournaments = TournamentService.query(function () {
							$scope.tournamentsusers = _.orderBy(tournaments, ['startdate'], 'desc');
							$scope.tournament = _.find($scope.tournamentsusers, {id: $scope.tournament.id});
						});
						showSnackbar(true, response.message);
					} else {
						showSnackbar(false, response.message);
					}
				}, function errorCallback(err) {
					confirm(err.data);
				});
			}
		};

		//OPEN USERS TABLE
		$scope.showUsers = false;

		$scope.goToUsers = function (tournament) {
			$scope.tournament = tournament;
			$scope.sortUsers('pivot_created_at');
			$scope.showUsers = true;

			anchorSmoothScroll.scrollTo('users');
		};

		//OPEN IMAGE DIALOG
		$scope.ShowImageDialog = function (Vorname, URL) {
			$scope.imgDialogVorname = Vorname;
			$scope.imgDialogURL = URL;
			ngDialog.open({
				template: 'showImageDialog.html',
				controller: 'OverviewCtrl',
				scope: $scope
			});
		};

		$scope.close = function () {
			$scope.closeThisDialog();
		};

	}
});

app.controller('VorstandCrtl', function ($scope, $http, $rootScope, TournamentService, UserService) {

	if (!$rootScope.authenticated) {
		$location.path('/');
	} else {

		$scope.newTournament = {
			name: '',
			ort: '',
			startdate: '',
			enddate: '',
			deadline: '',
			format: '',
			league: '',
			accommodation: '',
			speakerprice: '',
			judgeprice: '',
			rankingvalue: '',
			link: '',
			teamspots: '',
			judgespots: '',
			comments: '',
			language: ''
		};

		$scope.submit = function () {

			//convert dates
			if ($scope.newTournament.startdate) $scope.newTournament.startdate = new Date(toLocal($scope.newTournament.startdate));
			if ($scope.newTournament.enddate) $scope.newTournament.enddate = new Date(toLocal($scope.newTournament.enddate));
			if ($scope.newTournament.deadline) $scope.newTournament.deadline = new Date(toLocal($scope.newTournament.deadline));

			if ($scope.newTournament.name === '' || $scope.newTournament.language === '') {
				showSnackbar(false, 'Name und Sprache müssen gesetzt werden.');
			} else {
				TournamentService.save($scope.newTournament, function (res) {
					if (!res.error) {
						showSnackbar(true, res.message);
					} else {
						showSnackbar(false, 'Error while adding new Tournament.');
					}
				});
			}

			$scope.newTournament = {
				name: '',
				ort: '',
				startdate: '',
				enddate: '',
				deadline: '',
				format: '',
				league: '',
				accommodation: '',
				speakerprice: '',
				judgeprice: '',
				rankingvalue: '',
				link: '',
				teamspots: '',
				judgespots: '',
				comments: '',
				language: ''
			};
		};

	}
});

app.controller('FinanceCtrl', function ($scope, $http, $rootScope, $location, anchorSmoothScroll, UserService) {

	if (!$rootScope.authenticated) {
		$location.path('/');
	} else {

		//UEBERSICHT Finanzen

		//get all Users and their Tournaments
		var getAllUsers = function () {
			var users = UserService.query(function () {
				_.each(users, function (user) {
					var totalPoints = 0;
					var totalDebt = 0;
					_.each(user.tournaments, function (tournament) {
						totalPoints += tournament.pivot_points;
						totalDebt += (tournament.pivot_price_owed - tournament.pivot_price_paid);
					});
					user.totalPoints = totalPoints;
					user.totalDebt = totalDebt;
				});
				$scope.users = _.orderBy(users, ['vorname'], 'asc');
			});
		};
		getAllUsers();

		// function to sort users by key
		var userDir = 'asc';
		$scope.sortUsers = function (key) {
			$scope.users = _.orderBy($scope.users, [key], userDir);
			userDir = (userDir === 'asc') ? 'desc' : 'asc';
		};

		// function to sort tournaments by key
		var tournamentDir = 'asc';
		$scope.sortTournaments = function (key) {
			$scope.user.tournaments = _.orderBy($scope.user.tournaments, [key], tournamentDir);
			tournamentDir = (tournamentDir === 'asc') ? 'desc' : 'asc';
		};

		$scope.showTournaments = false;

		$scope.goToTournaments = function (user) {
			$scope.user = user;
			$scope.showTournaments = true;

			anchorSmoothScroll.scrollTo('tournaments');
		};

		//UPDATE REGISTRATION USING INLINE EDIT

		$scope.selected = {};
		// gets the template to ng-include for a table row / item
		$scope.getTemplate = function (tournament) {
			if (tournament.id === $scope.selected.id) return 'edit';
			return 'display';
		};

		$scope.editContact = function (tournament) {
			$scope.selected = angular.copy(tournament);
		};

		$scope.saveReg = function (idx, reg_id) {

			var url = '/app/updateReg';
			var parameters = JSON.stringify({
				reg_id: reg_id,
				price_paid: $scope.selected.pivot_price_paid,
				price_owed: $scope.selected.pivot_price_owed
			});
			$http.put(url, parameters)
			.then(function successCallback(res) {
				res = res.data;
				if (!res.error) {
					showSnackbar(true, res.message);
				} else {
					showSnackbar(false, res.message);
				}
			});

			$scope.user.tournaments[idx] = angular.copy($scope.selected);
			$scope.reset();
		};

		$scope.reset = function () {
			$scope.selected = {};
		};

		$scope.setPaid = function (reg_id, amount) {
			var url = '/app/updateReg';
			var parameters = JSON.stringify({
				reg_id: reg_id,
				price_paid: amount
			});
			$http.put(url, parameters)
			.then(function successCallback(res) {
				res = res.data;
				if (!res.error) {
					$scope.user.tournaments[_.findIndex($scope.user.tournaments, { 'pivot_id': reg_id })].pivot_price_paid = amount;
					showSnackbar(true, res.message);
				} else {
					showSnackbar(false, res.message);
				}
			});
		}

	}
});

app.controller('ResetCtrl', function ($scope, $http) {

	$scope.email = '';

	$scope.message = '';

	$scope.submit = function () {
		$http.post('/forgot', {email: $scope.email})
		.then(function successCallback() {
			$scope.message = 'An E-Mail has been sent to you with further instructions. Since we are financing this project by advertising penis enlargement instruments you should ALSO CHECK YOUR SPAM FOLDER.';
		}, function errorCallback(err) {
			$scope.message = err;
		});
	};
});

app.controller('bugCtrl', function ($scope, $http, $window, BugReportService) {
	$scope.newBug = {
		description: '',
		type: ''
	};

	var allBugs;
	var getAllBugs = function () {
		$http.get('/bugs').success(function (bugs) {
			allBugs = bugs.data;
			$scope.bugs = _.filter(_.orderBy(bugs.data, ['created_at'], 'desc'), {'status': 0});
		});
	};
	getAllBugs();

	var filter = true;
	$scope.filterBugs = function () {
		if (filter) $scope.bugs = _.filter($scope.bugs, {'status': 0});
		else $scope.bugs = _.orderBy(allBugs, ['created_at'], 'desc');
		filter = !filter;
	};

	$scope.reportBug = function () {
		if ($scope.newBug.description === '' || $scope.newBug.type === '') {
			showSnackbar(false, 'Please choose a type and describe the problem.');
		} else if ($scope.newBug.description.length > 1500) {
			showSnackbar(false, 'Keep your description below 1500 letters');
		} else {
			BugReportService.save($scope.newBug, function (res) {
				if (!res.error) {
					getAllBugs();
					showSnackbar(true, res.message);
					$scope.newBug.description = '';
					$scope.newBug.type = '';
				} else {
					showSnackbar(false, 'Error while reporting your Bug. Ironic, right?');
				}
			});
		}
	};

	//UPDATE AND DELETE FUNCTIONS
	$scope.deleteBug = function (id) {
		var deleteBug = $window.confirm('Are you absolutely sure you want to delete this bug?');
		if (deleteBug) {
			BugReportService.delete({id: id}, function (res) {
				if (!res.error) {
					getAllBugs();
					showSnackbar(true, res.message);
				} else {
					showSnackbar(false, res.message);
				}
			});
		}
	};

	$scope.changeStatus = function (id) {
		var parameters = JSON.stringify({
			status: ((_.find($scope.bugs, {id: id})).status === 0) ? 1 : 0
		});
		BugReportService.update({id: id}, parameters, function (result) {
			if (!result.error) {
				getAllBugs();
				showSnackbar(true, result.message);
			}
			else {
				showSnackbar(false, result.message);
			}
		});
	}
});

app.controller('authCtrl', function ($scope, $http, $rootScope, $location) {
	$scope.loginuser = {
		email: '',
		password: ''
	};

	$scope.reguser = {
		email: '',
		password: '',
		name: '',
		vorname: '',
		gender: '',
		food: '',
		signup_password: ''
	};
	$scope.error_message = '';

	$scope.login = function () {
		$http.post('/login', $scope.loginuser).success(function (data) {
			if (data.state === 'success') {
				$rootScope.authenticated = true;
				$rootScope.user = data.user;
				$rootScope.istVorstand = (data.user.position === 1);
				setNewTournaments();
				$location.path('/profile');
			}
			else {
				$scope.error_message = data.message;
			}
		});
	};

	$scope.register = function () {
		if ($scope.match) {
			$http.post('/signup', $scope.reguser).success(function (data) {
				if (data.state === 'success') {
					$rootScope.authenticated = true;
					$rootScope.user = data.user;
					$rootScope.istVorstand = (data.user.position === 1);
					setNewTournaments();
					$location.path('/profile');
				}
				else {
					$scope.error_message = data.message;
				}
			});
		} else {
			$scope.error_message = 'Passwords do not match.';
		}
	};

	//CHECK FOR PW MATCH
	$scope.match = false;
	$scope.confirmFill = false;
	$scope.pwd2 = '';

	$scope.checkMatch = function () {
		$scope.match = ($scope.reguser.password === $scope.pwd2) && $scope.confirmFill;
	};
});

// FILE UPLOADER

app.controller('UploadCtrl', ['$scope', 'Upload', '$timeout', '$http', '$rootScope', '$location',
	function ($scope, Upload, $timeout, $http, $rootScope, $location) {

		$scope.submit = false;

		$scope.upload = function (dataUrl, name) {
			Upload.upload({
				url: '/app/user/image',
				data: {
					pic: Upload.dataUrltoBlob(dataUrl, name)
				}
			}).then(function (response) {
				$timeout(function () {
					$scope.result = response.data;
				});
			}, function (response) {
				if (response.status > 0) $scope.errorMsg = response.status
					+ ': ' + response.data;
			}, function (evt) {
				$scope.progress = parseInt(100.0 * evt.loaded / evt.total);
			});

			$rootScope.signout();
			$location.path('/#');
		}
	}]);

//NG-SCROLL

app.service('anchorSmoothScroll', function () {

	this.scrollTo = function (eID) {

		// This scrolling function
		// is from http://www.itnewb.com/tutorial/Creating-the-Smooth-Scroll-Effect-with-JavaScript

		var startY = currentYPosition();
		var stopY = elmYPosition(eID);
		var distance = stopY > startY ? stopY - startY : startY - stopY;
		if (distance < 100) {
			scrollTo(0, stopY);
			return;
		}
		var speed = Math.round(distance / 100);
		if (speed >= 20) speed = 20;
		var step = Math.round(distance / 25);
		var leapY = stopY > startY ? startY + step : startY - step;
		var timer = 0;
		if (stopY > startY) {
			for (var i = startY; i < stopY; i += step) {
				setTimeout("window.scrollTo(0, " + leapY + ")", timer * speed);
				leapY += step;
				if (leapY > stopY) leapY = stopY;
				timer++;
			}
			return;
		}
		for (var i = startY; i > stopY; i -= step) {
			setTimeout("window.scrollTo(0, " + leapY + ")", timer * speed);
			leapY -= step;
			if (leapY < stopY) leapY = stopY;
			timer++;
		}

		function currentYPosition() {
			// Firefox, Chrome, Opera, Safari
			if (self.pageYOffset) return self.pageYOffset;
			// Internet Explorer 6 - standards mode
			if (document.documentElement && document.documentElement.scrollTop)
				return document.documentElement.scrollTop;
			// Internet Explorer 6, 7 and 8
			if (document.body.scrollTop) return document.body.scrollTop;
			return 0;
		}

		function elmYPosition(eID) {
			var elm = document.getElementById(eID);
			var y = elm.offsetTop;
			var node = elm;
			while (node.offsetParent && node.offsetParent != document.body) {
				node = node.offsetParent;
				y += node.offsetTop;
			}
			return y;
		}

	};

});

//SNACKBAR FUNCTION
var showSnackbar = function (success, message) {
	if (success) {
		var x = document.getElementById("snackbarSuccess");
		x.className = "show";
		x.innerHTML = message;
		setTimeout(function () {
			x.className = x.className.replace("show", "");
		}, 4000);
	} else {
		var x = document.getElementById("snackbarError");
		x.className = "show";
		x.innerHTML = message;
		setTimeout(function () {
			x.className = x.className.replace("show", "");
		}, 4000);
	}
};

//CONVERT DATE OBJECT TO LOCAL TIMEZONE

function toLocal(date) {
	var local = new Date(date);
	local.setMinutes(date.getMinutes() - date.getTimezoneOffset());
	return local.toJSON();
}