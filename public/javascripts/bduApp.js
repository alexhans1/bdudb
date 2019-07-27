let app = angular
  .module('bduApp', [
    'ngRoute',
    'ngResource',
    'ngDialog',
    'ngFileUpload',
    'ngImgCrop',
    'cp.ngConfirm',
    'REST_Service',
    'successService',
  ])
  .run(function($http, $rootScope) {
    $rootScope.personnelDebt = 0;

    $rootScope.authenticated = false;
    $rootScope.istVorstand = false;
    $rootScope.user = null;

    $rootScope.attendanceStatuses = [
      {
        id: 0,
        label: 'Registered',
      },
      {
        id: 1,
        label: 'Went',
      },
      {
        id: 2,
        label: 'Can Go',
      },
      {
        id: 3,
        label: 'Didn´t Go',
      },
    ];

    $http.get('/sendUser').then(
      function(user) {
        if (user.status !== 204) {
          $rootScope.authenticated = true;
          $rootScope.istVorstand = user.data.position === 1;
          $rootScope.user = user.data;
        }
      },
      function errorCallback(err) {
        alert(err);
      },
    );

    $rootScope.signout = function() {
      $http.get('/logout');
      $rootScope.user = null;
      $rootScope.authenticated = false;
      $rootScope.istVorstand = false;
    };
  });

//durch die config wird definiert welche URIs welche controller verwenden
app.config(function($routeProvider) {
  $routeProvider
    //the login display
    .when('/', {
      templateUrl: 'login.html',
      controller: 'authCtrl',
    })
    //the signup display
    .when('/signup', {
      templateUrl: 'signup.html',
      controller: 'authCtrl',
    })
    //the forgot password display
    .when('/forgot', {
      templateUrl: 'forgot.html',
      controller: 'ResetCtrl',
    })
    //the profile display
    .when('/profile', {
      templateUrl: 'profile.html',
      controller: 'profileCtrl',
    })
    //the tournaments display
    .when('/tournaments', {
      templateUrl: 'tournaments.html',
      controller: 'TournamentCtrl',
    })
    //the vorstand display
    .when('/vorstand', {
      templateUrl: 'vorstand.html',
      controller: 'VorstandCrtl',
    })
    //the reg overview display
    .when('/anmeldungen', {
      templateUrl: 'anmeldungen.html',
      controller: 'OverviewCtrl',
    })
    //the finances display
    .when('/finances', {
      templateUrl: 'finances.html',
      controller: 'FinanceCtrl',
    })
    //the ranking display
    .when('/ranking', {
      templateUrl: 'views/ranking.html',
    })
    //the dashboard display
    .when('/dashboard', {
      templateUrl: 'views/dashboard.html',
      controller: 'DashboardCtrl',
    })
    //the imageUpload display
    .when('/imageUpload', {
      templateUrl: 'imageUpload.html',
      controller: 'UploadCtrl',
    })
    //the bug report display
    .when('/bugReport', {
      templateUrl: 'bugReport.html',
      controller: 'bugCtrl',
    })
    .otherwise({
      redirectTo: '/',
    });
});

app.controller('VorstandCrtl', function(
  $scope,
  $http,
  $rootScope,
  TournamentService,
) {
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
      language: '',
    };

    $scope.submit = function() {
      //convert dates
      if ($scope.newTournament.startdate)
        $scope.newTournament.startdate = new Date(
          toLocal($scope.newTournament.startdate),
        );
      if ($scope.newTournament.enddate)
        $scope.newTournament.enddate = new Date(
          toLocal($scope.newTournament.enddate),
        );
      if ($scope.newTournament.deadline)
        $scope.newTournament.deadline = new Date(
          toLocal($scope.newTournament.deadline),
        );

      if (
        $scope.newTournament.name === '' ||
        $scope.newTournament.language === ''
      ) {
        showSnackbar(false, 'Name und Sprache müssen gesetzt werden.');
      } else {
        let startdate = $scope.newTournament.startdate;
        TournamentService.save($scope.newTournament, res => {
          if (!res.error) {
            if (moment(startdate).unix() > Date.now() / 1000) {
              $rootScope.user.new_tournament_count++;
            }
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
        language: '',
      };
    };
  }
});

app.controller('ResetCtrl', function($scope, $http) {
  $scope.email = '';

  $scope.message = '';

  $scope.submit = function() {
    $http.post('/forgot', { email: $scope.email }).then(
      function successCallback() {
        $scope.message =
          'An E-Mail has been sent to you with further instructions. Since we are financing this project by advertising penis enlargement instruments you should ALSO CHECK YOUR SPAM FOLDER.';
      },
      function errorCallback(err) {
        $scope.message = err;
      },
    );
  };
});

app.controller('bugCtrl', function(
  $scope,
  $http,
  $window,
  BugReportService,
  $ngConfirm,
) {
  $scope.newBug = {
    description: '',
    type: '',
  };

  let allBugs;
  let getAllBugs = function() {
    $http.get('/bugs').success(function(bugs) {
      allBugs = bugs.data;
      $scope.bugs = _.filter(_.orderBy(bugs.data, ['created_at'], 'desc'), {
        status: 0,
      });
    });
  };
  if ($scope.istVorstand) getAllBugs();

  let filter = true;
  $scope.filterBugs = function() {
    if (filter) $scope.bugs = _.filter($scope.bugs, { status: 0 });
    else $scope.bugs = _.orderBy(allBugs, ['created_at'], 'desc');
    filter = !filter;
  };

  $scope.reportBug = function() {
    if ($scope.newBug.description === '' || $scope.newBug.type === '') {
      showSnackbar(false, 'Please choose a type and describe the problem.');
    } else if ($scope.newBug.description.length > 1500) {
      showSnackbar(false, 'Keep your description below 1500 letters');
    } else {
      BugReportService.save($scope.newBug, function(res) {
        if (!res.error) {
          if ($scope.istVorstand) getAllBugs();
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
  $scope.deleteBug = function(id) {
    $ngConfirm({
      title: 'Confirm!',
      content: 'Are you absolutely sure you want to delete this bug?',
      scope: $scope,
      theme: 'light',
      buttons: {
        deleteBug: {
          text: 'Yes',
          btnClass: 'btn-danger',
          action: function() {
            BugReportService.delete({ id: id }, function(res) {
              if (!res.error) {
                getAllBugs();
                showSnackbar(true, res.message);
              } else {
                showSnackbar(false, res.message);
              }
            });
          },
        },
        close: function() {
          // closes the modal
        },
      },
    });
  };

  $scope.changeStatus = function(id) {
    let parameters = JSON.stringify({
      status: _.find($scope.bugs, { id: id }).status === 0 ? 1 : 0,
    });
    BugReportService.update({ id: id }, parameters, function(result) {
      if (!result.error) {
        getAllBugs();
        showSnackbar(true, result.message);
      } else {
        showSnackbar(false, result.message);
      }
    });
  };
});

app.controller('authCtrl', function($scope, $http, $rootScope, $location) {
  $scope.loginuser = {
    email: '',
    password: '',
  };

  $scope.reguser = {
    email: '',
    password: '',
    name: '',
    vorname: '',
    gender: '',
    food: '',
    signup_password: '',
  };
  $scope.error_message = '';

  $scope.login = function() {
    $http.post('/login', $scope.loginuser).success(function(data) {
      if (data.state === 'success') {
        $rootScope.authenticated = true;
        $rootScope.user = data.user;
        $rootScope.istVorstand = data.user.position === 1;
        $location.path('/profile');
      } else {
        $scope.error_message = data.message;
      }
    });
  };

  $scope.register = function() {
    if ($scope.match) {
      $http.post('/signup', $scope.reguser).success(function(data) {
        if (data.state === 'success') {
          $rootScope.authenticated = true;
          $rootScope.user = data.user;
          $rootScope.istVorstand = data.user.position === 1;
          $location.path('/profile');
        } else {
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

  $scope.checkMatch = function() {
    $scope.match =
      $scope.reguser.password === $scope.pwd2 && $scope.confirmFill;
  };
});

// FILE UPLOADER

app.controller('UploadCtrl', [
  '$scope',
  'Upload',
  '$timeout',
  '$http',
  '$rootScope',
  '$location',
  '$q',
  function($scope, Upload, $timeout, $http, $rootScope, $location) {
    $scope.submit = false;

    $scope.upload = function(dataUrl, name) {
      $rootScope.loader = true;
      Upload.upload({
        url: '/app/user/image',
        data: {
          pic: Upload.dataUrltoBlob(dataUrl, name),
        },
      }).then(function(response) {
        showSnackbar(!response.data.error, response.data.message);
        $rootScope.loader = false;
        $location.path('/profile');
      });
    };
  },
]);

//NG-SCROLL

app.service('anchorSmoothScroll', function() {
  this.scrollTo = function(eID) {
    // This scrolling function
    // is from http://www.itnewb.com/tutorial/Creating-the-Smooth-Scroll-Effect-with-JavaScript

    let startY = currentYPosition();
    let stopY = elmYPosition(eID);
    let distance = stopY > startY ? stopY - startY : startY - stopY;
    if (distance < 100) {
      scrollTo(0, stopY);
      return;
    }
    let speed = Math.round(distance / 100);
    if (speed >= 20) speed = 20;
    let step = Math.round(distance / 25);
    let leapY = stopY > startY ? startY + step : startY - step;
    let timer = 0;
    if (stopY > startY) {
      for (let i = startY; i < stopY; i += step) {
        setTimeout('window.scrollTo(0, ' + leapY + ')', timer * speed);
        leapY += step;
        if (leapY > stopY) leapY = stopY;
        timer++;
      }
      return;
    }
    for (let i = startY; i > stopY; i -= step) {
      setTimeout('window.scrollTo(0, ' + leapY + ')', timer * speed);
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
      let elm = document.getElementById(eID);
      let y = elm.offsetTop;
      let node = elm;
      while (node.offsetParent && node.offsetParent !== document.body) {
        node = node.offsetParent;
        y += node.offsetTop;
      }
      return y;
    }
  };
});

//SNACKBAR FUNCTION
showSnackbar = function(success, message) {
  if (success) {
    let x = document.getElementById('snackbarSuccess');
    x.className = 'show';
    x.innerHTML = message;
    setTimeout(function() {
      x.className = x.className.replace('show', '');
    }, 4000);
  } else {
    let x = document.getElementById('snackbarError');
    x.className = 'show';
    x.innerHTML = message;
    setTimeout(function() {
      x.className = x.className.replace('show', '');
    }, 4000);
  }
};

//CONVERT DATE OBJECT TO LOCAL TIMEZONE

function toLocal(date) {
  let local = new Date(date);
  local.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return local.toJSON();
}
