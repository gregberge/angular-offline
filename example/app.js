angular
.module('app', ['offline', 'angular-cache'])
.config(function (offlineProvider, $provide) {
  $provide.decorator('connectionStatus', function ($delegate) {
    $delegate.online = true;
    $delegate.isOnline = function () {
      return $delegate.online;
    };
    return $delegate;
  });
  offlineProvider.debug(true);
})
.controller('MainCtrl', function ($scope, $http, $log, offline, connectionStatus) {
  $scope.toggleOnline = function () {
    connectionStatus.online = !connectionStatus.online;
    offline.processStack();
  };

  $scope.isOnline = function () {
    return connectionStatus.isOnline();
  };

  $scope.makeGET = function () {
    $http.get('/test.json', {offline: true})
    .then(function (response) {
      $log.info('GET RESULT', response.data);
    }, function (error) {
      $log.info('GET ERROR', error);
    });
  };

  $scope.makePOST = function () {
    $http.post('/test.json', {}, {offline: true})
    .then(function (response) {
      $log.info('POST RESULT', response);
    }, function (error) {
      $log.info('POST ERROR', error);
    });
  };
})
.run(function ($http, $cacheFactory, CacheFactory, offline) {
  $http.defaults.cache = $cacheFactory('custom');
  offline.stackCache = CacheFactory.createCache('my-cache', {
    storageMode: 'localStorage'
  });

  offline.start($http);
});
