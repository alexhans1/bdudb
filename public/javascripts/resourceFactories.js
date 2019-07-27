/**
 * Created by alex.hans on 16.06.2017.
 */

let service = angular.module('REST_Service', []);

//RESOURCE SERVICE FACTORIES

service.factory('UserService', function($resource) {
  return $resource(
    '/app/user/:id',
    {},
    {
      update: {
        method: 'PUT', // this method issues a PUT request
      },
    },
  );
});

service.factory('TournamentService', function($resource) {
  return $resource(
    '/app/tournament/:id',
    {},
    {
      update: {
        method: 'PUT', // this method issues a PUT request
      },
    },
  );
});

service.factory('BugReportService', function($resource) {
  return $resource(
    '/bugs/:id',
    {},
    {
      update: {
        method: 'PUT', // this method issues a PUT request
      },
    },
  );
});
