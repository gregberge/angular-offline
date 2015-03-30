var expect = chai.expect;

describe('Angular offline', function () {
  var $http, $rootScope, $httpBackend, $cacheFactory, offline, startOffline, connectionStatus;

  beforeEach(module('offline', function (offlineProvider, $provide) {
    offlineProvider.debug(true);
    $provide.value('connectionStatus', {
      isOnline: function () {
        return this.online;
      },
      $on: function () {}
    });
  }));

  beforeEach(inject(function ($injector) {
    $http = $injector.get('$http');
    $rootScope = $injector.get('$rootScope');
    $cacheFactory = $injector.get('$cacheFactory');
    $httpBackend = $injector.get('$httpBackend');
    offline = $injector.get('offline');
    connectionStatus = $injector.get('connectionStatus');
    $httpBackend.whenGET('/test').respond(200);
    $httpBackend.whenPOST('/test').respond(201);

    startOffline = function () {
      offline.start($http);
    };
  }));

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  describe('GET request', function () {
    describe('with offline config', function () {
      it('should cache request', function () {
        startOffline();

        $http.get('/test', {
          offline: true
        });

        $http.get('/test', {
          offline: true
        });

        // We flush only one request, if cache didn't work
        // we had to flush two.
        $httpBackend.flush(1);
      });

      describe('online', function () {
        beforeEach(function () {
          connectionStatus.online = true;
        });

        it('should clean the expired cache if we are online', function (done) {
          startOffline();

          $http.get('/test', {
            offline: true,
            cache: {
              get: function (key) {
                return this[key];
              },
              info: function () {
                return {isExpired: true};
              },
              put: function (key, value) {
                this[key] = value;
              },
              remove: function (key) {
                expect(key).to.equal('/test');
                done();
              }
            }
          });

          $httpBackend.flush(1);
        });
      });
    });
  });

  describe('POST request offline', function () {
    beforeEach(function () {
      connectionStatus.offline = true;
      $cacheFactory.get('offline-request-stack').remove('stack');
    });

    it('should stack request and return an error', function (done) {
      startOffline();

      $http.post('/test', {}, {
        offline: true
      })
      .catch(function (err) {
        expect(err.message).to.equal('request queued');
        var stack = $cacheFactory.get('offline-request-stack').get('stack');
        expect(stack).to.length(1);
        done();
      });

      $rootScope.$digest();
    });

    it('should process requests', function () {
      startOffline();

      $http.post('/test', {}, {
        offline: true
      });

      $http.post('/test', {}, {
        offline: true
      });

      $rootScope.$digest();

      connectionStatus.online = true;
      offline.processStack();

      // First request.
      $httpBackend.flush(1);

      // Second request.
      $httpBackend.flush(1);
    });
  });
});
