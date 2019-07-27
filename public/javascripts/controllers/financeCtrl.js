app.controller('FinanceCtrl', function(
  $scope,
  $http,
  $rootScope,
  $location,
  anchorSmoothScroll,
  UserService,
) {
  if (!$rootScope.authenticated) {
    $location.path('/');
  } else {
    //UEBERSICHT Finanzen

    //get all Users and their Tournaments
    let getAllUsers = function() {
      $rootScope.loader = true;

      let users = UserService.query(function() {
        $scope.totalClubDebt = 0;
        _.each(users, function(user) {
          let totalPoints = 0;
          let totalDebt = 0;
          let judgeCount = 0;
          let speakerCount = 0;
          let totalAttendedTournaments = 0;
          _.each(user.tournaments, function(tournament) {
            // calculate totalPoints
            if (
              moment(tournament.startdate)
                .add(1, 'year')
                .isAfter(moment())
            ) {
              totalPoints += tournament.pivot_points;
            }
            // calculate judging-speaking ratio
            if (
              tournament.pivot_role === 'judge' &&
              tournament.pivot_attended === 1
            ) {
              judgeCount++;
            } else if (
              tournament.pivot_role === 'speaker' &&
              tournament.pivot_attended === 1
            ) {
              speakerCount++;
            }
            // calculate totalDebt
            totalDebt +=
              tournament.pivot_price_owed - tournament.pivot_price_paid;
            // calculate attended tournaments
            if (tournament.pivot_attended === 1) {
              totalAttendedTournaments++;
            }
          });
          user.totalPoints = totalPoints;
          user.totalDebt = totalDebt;
          user.judgeRatio = totalAttendedTournaments
            ? Math.round((judgeCount * 100) / (judgeCount + speakerCount))
            : -1;
          $scope.totalClubDebt += totalDebt;
        });
        $scope.users = _.orderBy(users, ['last_login'], 'desc');
        $rootScope.loader = false;
      });
    };
    getAllUsers();

    // function to sort users by key
    let userDir = 'asc';
    $scope.sortUsers = function(key) {
      $scope.users = _.orderBy($scope.users, [key], userDir);
      userDir = userDir === 'asc' ? 'desc' : 'asc';
    };

    // function to sort tournaments by key
    let tournamentDir = 'asc';
    $scope.sortTournaments = function(key) {
      $scope.user.tournaments = _.orderBy(
        $scope.user.tournaments,
        [key],
        tournamentDir,
      );
      tournamentDir = tournamentDir === 'asc' ? 'desc' : 'asc';
    };

    $scope.showTournaments = false;

    $scope.goToTournaments = function(user) {
      $scope.user = user;
      $scope.sortTournaments('startdate');
      $scope.showTournaments = true;

      anchorSmoothScroll.scrollTo('tournaments');
    };

    // UPDATE REGISTRATION USING INLINE EDIT
    $scope.selected = {};
    // gets the template to ng-include for a table row / item
    $scope.getTemplate = function(tournament) {
      if (tournament.id === $scope.selected.id) return 'edit';
      return 'display';
    };

    $scope.editReg = function(tournament) {
      $scope.selected = angular.copy(tournament);
    };

    $scope.saveReg = function(idx, reg_id) {
      let url = '/app/updateReg';
      let funding = $scope.selected.pivot_funding ? 1 : 0;
      let transaction_date =
        $scope.selected.pivot_transaction_date === null
          ? null
          : moment($scope.selected.pivot_transaction_date).format(
              'YYYY-MM-DD HH:mm:ss',
            );
      let parameters = JSON.stringify({
        reg_id: reg_id,
        price_paid: $scope.selected.pivot_price_paid,
        price_owed: $scope.selected.pivot_price_owed,
        transaction_date,
        transaction_from: $scope.selected.pivot_transaction_from,
        funding,
      });
      $http.put(url, parameters).then(function successCallback(res) {
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

    $scope.reset = function() {
      $scope.selected = {};
    };

    $scope.setPaid = function(reg_id, amount) {
      let url = '/app/updateReg';
      let parameters = JSON.stringify({
        reg_id: reg_id,
        price_paid: amount,
      });
      $http.put(url, parameters).then(function successCallback(res) {
        res = res.data;
        if (!res.error) {
          $scope.user.tournaments[
            _.findIndex($scope.user.tournaments, { pivot_id: reg_id })
          ].pivot_price_paid = amount;
          showSnackbar(true, res.message);
        } else {
          showSnackbar(false, res.message);
        }
      });
    };
  }
});
