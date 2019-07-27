app.controller('profileCtrl', function(
  $scope,
  $http,
  $rootScope,
  $location,
  $window,
  ngDialog,
  UserService,
  $ngConfirm,
) {
  if (!$rootScope.authenticated) {
    $location.path('/');
  } else {
    //if user is logged in then the user can see the profile page

    //get the logged in user
    let user = UserService.get({ id: $rootScope.user.id }, function() {
      $scope.debt = _.sumBy(user.tournaments, function(ts) {
        return ts.pivot_price_paid - ts.pivot_price_owed;
      });
      $scope.totalPoints = _.sumBy(user.tournaments, function(ts) {
        return ts.pivot_points;
      });
      $rootScope.personnelDebt = $scope.debt;
      $scope.user = user;
      $scope.user.tournaments = _.orderBy(
        $scope.user.tournaments,
        ['startdate'],
        'desc',
      );
    });

    $scope.update = false;

    //UPDATE USER INFO
    $scope.updateUser = function() {
      let parameters = JSON.stringify({
        email: $scope.user.email,
        name: $scope.user.name,
        vorname: $scope.user.vorname,
        gender: $scope.user.gender,
        food: $scope.user.food,
      });
      UserService.update({ id: $rootScope.user.id }, parameters, function(
        result,
      ) {
        if (!result.error) {
          showSnackbar(true, result.message);
          $scope.update = false;
        } else {
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
    $scope.changePwd = function() {
      if ($scope.newPassword !== $scope.confirmPassword) $scope.match = false;
      else {
        let parameters = JSON.stringify({
          newPwd: $scope.newPassword,
          oldPwd: $scope.oldPassword,
          userID: $scope.user.id,
        });
        $http.post('/changePassword', parameters).then(
          function successCallback(res) {
            if (!res.data.error) {
              $scope.change = false;
              $scope.update = false;
              showSnackbar(true, res.data.message);
            } else {
              showSnackbar(false, res.data.message);
            }
          },
          function errorCallback(err) {
            showSnackbar(false, err.data);
          },
        );
      }
    };
    $scope.match = true;
    $scope.checkMatch = function() {
      $scope.match =
        $scope.newPassword === $scope.confirmPassword ||
        ($scope.newPassword === '' || $scope.confirmPassword === '');
    };

    //SHOW TOURNAMENT DETAILS DIALOG
    $scope.openDetails = function(tournament) {
      $scope.tournament = tournament;
      ngDialog.open({
        template: 'profileTournamentDialog.html',
        controller: 'mainCtrl',
        scope: $scope,
      });
    };

    $scope.close = function() {
      $scope.closeThisDialog();
    };

    //DELETE REGISTRATION
    $scope.unreg = function(regID, t_id) {
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
                function successCallback(res) {
                  if (!res.error) {
                    _.remove($scope.user.tournaments, { id: t_id });
                    showSnackbar(true, res.data.message);
                  } else {
                    showSnackbar(
                      false,
                      'Error while removing your registration.',
                    );
                  }
                },
                function errorCallback(err) {
                  showSnackbar(false, err.data);
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

    // ATTENDANCE
    $scope.attendanceStatus = function(attended) {
      return $rootScope.attendanceStatuses.find(function(statusObj) {
        return statusObj.id === attended;
      }).label;
    };

    //UPDATE REGISTRATION USING INLINE EDIT

    $scope.selected = {};
    // gets the template to ng-include for a table row / item
    $scope.getTemplate = function(tournament) {
      if (tournament.id === $scope.selected.id) return 'edit';
      return 'display';
    };

    $scope.editContact = function(tournament) {
      $scope.selected = angular.copy(tournament);
      $scope.selected.pivot_funding = !!$scope.selected.pivot_funding;
      $scope.selected.pivot_is_independent = !!$scope.selected
        .pivot_is_independent;
      $scope.selected.pivot_role = _.find($scope.roles, {
        value: $scope.selected.pivot_role,
      });
    };

    $scope.saveReg = function(idx, reg_id) {
      let url = '/app/updateReg';
      let team =
        $scope.selected.pivot_role.value === 'speaker'
          ? $scope.selected.pivot_teamname
          : '';
      let parameters = JSON.stringify({
        reg_id: reg_id,
        role: $scope.selected.pivot_role.value,
        is_independent: $scope.selected.pivot_is_independent ? 1 : 0,
        teamname: team,
        funding: $scope.selected.pivot_funding,
        comment: $scope.selected.pivot_comment,
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
      $scope.user.tournaments[idx].pivot_role =
        $scope.user.tournaments[idx].pivot_role.value;
      $scope.reset();
    };

    $scope.reset = function() {
      $scope.selected = {};
    };

    $scope.roles = [
      {
        id: 1,
        value: 'judge',
        label: 'judge',
      },
      {
        id: 2,
        value: 'speaker',
        label: 'speaker',
      },
    ];
  }
});
