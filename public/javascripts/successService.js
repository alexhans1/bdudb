/**
 * Created by alex.hans on 16.06.2017.
 */

const successService = angular.module('successService', ['REST_Service']);

successService.controller('successCtrl', ($scope, $http, UserService) => {
  $scope.successes = [
    {
      id: 0,
      value: null,
      label: 'none',
    },
    {
      id: 1,
      value: 'judge',
      label: 'judge',
    },
    {
      id: 2,
      value: 'break',
      label: 'break',
    },
    {
      id: 3,
      value: 'final',
      label: 'final',
    },
    {
      id: 4,
      value: 'win',
      label: 'win',
    },
    {
      id: 5,
      value: 'judge2',
      label: 'judge for different institution',
    },
    {
      id: 6,
      value: 'break2',
      label: 'break for different institution',
    },
    {
      id: 7,
      value: 'final2',
      label: 'final for different institution',
    },
    {
      id: 8,
      value: 'win2',
      label: 'win for different institution',
    },
    {
      id: 9,
      value: 'breakESL',
      label: 'break ESL',
    },
    {
      id: 10,
      value: 'finalESL',
      label: 'final ESL',
    },
    {
      id: 11,
      value: 'winESL',
      label: 'win ESL',
    },
    {
      id: 12,
      value: 'break2ESL',
      label: 'break ESL for different institution',
    },
    {
      id: 13,
      value: 'final2ESL',
      label: 'final ESL for different institution',
    },
    {
      id: 14,
      value: 'win2ESL',
      label: 'win ESL for different institution',
    },
  ];

  // Change success
  $scope.selectedSuccess = {};
  // gets the template to ng-include for a table row / item
  $scope.getSuccessTemplate = function(tournamentID) {
    if (tournamentID === $scope.selectedSuccess.id)
      return '/templates/successEditTemplate.html';
    return '/templates/successDisplayTemplate.html';
  };
  $scope.editSuccess = function(tournament) {
    $scope.selectedSuccess = angular.copy(tournament);
    $scope.selectedSuccess.pivot_success = _.find($scope.successes, {
      value: $scope.selectedSuccess.pivot_success,
    });
    $scope.selectedSuccess.pivot_partner1 = _.find(users, {
      id: $scope.selectedSuccess.pivot_partner1,
    });
    $scope.selectedSuccess.pivot_partner2 = _.find(users, {
      id: $scope.selectedSuccess.pivot_partner2,
    });
  };
  $scope.closeEditSuccess = function() {
    $scope.selectedSuccess = {};
  };

  $scope.success = '';
  $scope.setSuccess = function(success, factor, regID) {
    let points = 0;
    if (success.id === 1) points = 5;
    else if (success.id === 2) points = factor * 2 + 1;
    else if (success.id === 3) points = factor * 3 + 2;
    else if (success.id === 4) points = factor * 4 + 3;
    else if (success.id === 5) points = 2.5;
    else if (success.id === 6) points = (factor * 2 + 1) / 2;
    else if (success.id === 7) points = (factor * 3 + 2) / 2;
    else if (success.id === 8) points = (factor * 4 + 3) / 2;
    else if (success.id === 9) points = (factor - 2) * 2 + 1;
    else if (success.id === 10) points = (factor - 2) * 3 + 2;
    else if (success.id === 11) points = (factor - 2) * 4 + 3;
    else if (success.id === 12) points = ((factor - 2) * 2 + 1) / 2;
    else if (success.id === 13) points = ((factor - 2) * 3 + 2) / 2;
    else if (success.id === 14) points = ((factor - 2) * 4 + 3) / 2;

    const url = '/app/setSuccess';
    const parameters = JSON.stringify({
      reg_id: regID,
      points,
      success: success.value,
    });
    $http.put(url, parameters).then(res => {
      res = res.data;
      if (!res.error) {
        const index = _.findIndex($scope.user.tournaments, { pivot_id: regID });
        $scope.totalPoints +=
          points - $scope.user.tournaments[index].pivot_points;
        _.set($scope.user.tournaments[index], 'pivot_points', points);
        _.set($scope.user.tournaments[index], 'pivot_success', success.value);
        showSnackbar(true, res.message);
      } else {
        showSnackbar(false, res.message);
      }
    });
  };

  let users = UserService.query(() => {
    const emptyPartner = {
      vorname: 'none',
      name: '',
      id: null,
    };
    users.push(emptyPartner);
    $scope.partners = _.orderBy(users, ['vorname'], 'asc');
  });

  $scope.setPartner = function(partnerID, regID, partnerNumber) {
    const url = '/app/setPartner';
    const parameters = JSON.stringify({
      reg_id: regID,
      partnerNumber,
      partnerID,
    });
    $http.put(url, parameters).then(res => {
      res = res.data;
      if (!res.error) {
        const index = _.findIndex($scope.user.tournaments, { pivot_id: regID });
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
  };
});
