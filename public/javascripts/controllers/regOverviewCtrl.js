app.controller('OverviewCtrl', function(
  $scope,
  $http,
  $rootScope,
  $window,
  $location,
  ngDialog,
  anchorSmoothScroll,
  TournamentService,
  $ngConfirm,
) {
  if (!$rootScope.authenticated) {
    $location.path('/');
  } else {
    //UEBERSICHT ANMELDUNGEN

    //get all Tournaments and their Users
    let getAllTournaments = function() {
      $rootScope.loader = true;
      let tournaments = TournamentService.query(function() {
        $scope.tournamentsusers = _.orderBy(tournaments, ['startdate'], 'desc');
        // check if tournament has past but has open registrations (status 'Registered' or 'Can Go')
        $scope.tournamentsusers = $scope.tournamentsusers.map(tournament => {
          hasOpenReg = false;
          if (moment().isBefore(moment(tournament.enddate))) {
            // if the tournament has not yet taken place return hasOpenReg = false
            tournament.hasOpenReg = false;
            return tournament;
          }
          let BreakException = {};
          try {
            tournament.users.forEach(user => {
              if (user.pivot_attended !== 1 && user.pivot_attended !== 3) {
                hasOpenReg = true;
                throw BreakException;
              }
            });
          } catch (ex) {
            if (ex !== BreakException) console.error(ex);
          }

          tournament.hasOpenReg = hasOpenReg;
          return tournament;
        });
        $scope.tournamentsusers.map(tournament => {
          tournament.isOld = moment(tournament.startdate).isBefore(moment());
          return tournament;
        });
        $rootScope.loader = false;
      });
    };
    getAllTournaments();

    // function to sort tournaments by key
    let tournamentDir = 'asc';
    $scope.sortTournaments = function(key) {
      $scope.tournamentsusers = _.orderBy(
        $scope.tournamentsusers,
        [key],
        tournamentDir,
      );
      tournamentDir = tournamentDir === 'asc' ? 'desc' : 'asc';
    };

    // function to sort users by key
    let userDir = 'asc';
    $scope.sortUsers = function(key) {
      $scope.tournament.users = _.orderBy(
        $scope.tournament.users,
        [key],
        userDir,
      );
      userDir = userDir === 'asc' ? 'desc' : 'asc';
    };

    // ATTENDANCE
    $scope.attendanceStatus = function(attended) {
      return $rootScope.attendanceStatuses.find(function(statusObj) {
        return statusObj.id === attended;
      }).label;
    };

    $scope.setAttendance = function(role, reg_id, attendanceStatus) {
      $rootScope.loader = true;
      let price =
        role === 'speaker'
          ? $scope.tournament.speakerprice
          : $scope.tournament.judgeprice;
      let parameters = JSON.stringify({
        reg_id,
        attendanceStatus,
        price,
      });
      $http.put('/app/setAttendance', parameters).then(
        function successCallback(response) {
          response = response.data;
          if (!response.error) {
            showSnackbar(true, response.message);
          } else {
            showSnackbar(false, response.message);
          }
          $rootScope.loader = false;
        },
        function errorCallback(err) {
          showSnackbar(false, err.data);
          $rootScope.loader = false;
        },
      );
    };

    //DELETE REGISTRATION
    $scope.delete = function(regID) {
      $ngConfirm({
        title: 'Confirm!',
        content:
          'Are you absolutely sure you want to delete this registration?',
        scope: $scope,
        theme: 'light',
        buttons: {
          deleteBug: {
            text: 'Yes',
            btnClass: 'btn-danger',
            action: function() {
              $http({
                url: 'app/deleteReg/' + regID,
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json;charset=utf-8',
                },
              }).then(
                function successCallback(response) {
                  response = response.data;
                  if (!response.error) {
                    let tournaments = TournamentService.query(function() {
                      $scope.tournamentsusers = _.orderBy(
                        tournaments,
                        ['startdate'],
                        'desc',
                      );
                      $scope.tournament = _.find($scope.tournamentsusers, {
                        id: $scope.tournament.id,
                      });
                    });
                    showSnackbar(true, response.message);
                  } else {
                    showSnackbar(false, response.message);
                  }
                },
                function errorCallback(err) {
                  console.log(err);
                  showSnackbar(false, response.message);
                },
              );
            },
          },
          close: function() {
            // closes the modal
          },
        },
      });
    };

    // INDEPENDENT
    $scope.isIndependentClass = function(isIndependent) {
      return isIndependent ? 'fa fa-check' : 'fa fa-times';
    };

    // INDEPENDENT
    $scope.getsFundingClass = function(getsFunding) {
      console.log(getsFunding);
      return getsFunding ? 'fa fa-check' : 'fa fa-times';
    };

    //OPEN USERS TABLE
    $scope.showUsers = false;

    $scope.goToUsers = function(tournament) {
      $scope.tournament = tournament;
      $scope.sortUsers('pivot_created_at');
      $scope.showUsers = true;

      anchorSmoothScroll.scrollTo('users');
    };

    //OPEN IMAGE DIALOG
    $scope.ShowImageDialog = function(Vorname, URL) {
      $scope.imgDialogVorname = Vorname;
      $scope.imgDialogURL = URL;
      ngDialog.open({
        template: 'showImageDialog.html',
        controller: 'OverviewCtrl',
        scope: $scope,
      });
    };

    $scope.close = function() {
      $scope.closeThisDialog();
    };
  }
});
