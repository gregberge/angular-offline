angular
.module('app', ['offline', 'angular-cache'])
.config(function (offlineProvider) {
  offlineProvider.debug(true);
})
.run(function ($http) {
  // $http.get('/test.json', {offline: {
  //   maxAge: 2000
  // }})
  // .then(function (response) {
  //   console.log('RESULT', response.data);
  // });

  $http.post('/test.json', {}, {offline: {
    maxAge: 2000
  }})
  .then(function (response) {
    console.log('RESULT', response);
  }, function (error) {
    console.log('ERROR', error);
  });
});
