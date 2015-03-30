/*! Angular offline v0.1.0 | (c) 2016 Greg Bergé | License MIT */
angular
.module('offline', [])
.service('connectionStatus', ['$window', '$rootScope', function ($window, $rootScope) {

  /**
   * Test if the connection is online.
   *
   * @returns {boolean}
   */

  this.isOnline = function () {
    return $window.navigator.onLine;
  };

  /**
   * Listen online and offline events.
   *
   * @param {string} event
   * @param {function} listener
   */

  this.$on = function (event, listener) {
    $window.addEventListener(event, function () {
      $rootScope.$apply(listener);
    });
  };
}])
.provider('offline', function () {
  var offlineProvider = this;
  var $requester;

  /**
   * Enable or disable debug mode.
   *
   * @param {boolean} value
   * @returns {offlineProvider}
   */

  offlineProvider.debug = function (value) {
    this._debug = value;
    return this;
  };

  this.$get = ['$q', '$window', '$log', 'connectionStatus', '$cacheFactory',
  function ($q, $window, $log, connectionStatus, $cacheFactory) {
    var offline = {};
    var defaultStackCache = $cacheFactory('offline-request-stack');

    /**
     * Log in debug mode.
     *
     * @param {...*} logs
     */

    function log() {
      if (!offlineProvider._debug)
        return;

      return $log.debug.apply($log, ['%cOffline', 'font-weight: bold'].concat([].slice.call(arguments)));
    }

    /**
     * Clean cache if expired.
     *
     * @param {object} cache Cache
     * @param {string} key Cache key
     */

    function cleanIfExpired(cache, key) {
      if (cache === true)
        cache = $requester.defaults.cache || $cacheFactory.get('$http');
      var info = cache.info(key);
      if (info && info.isExpired)
        cache.remove(key);
    }

    /**
     * Get stack cache.
     *
     * @returns {object} Cache
     */

    function getStackCache() {
      return offline.stackCache || defaultStackCache;
    }

    /**
     * Get stack.
     *
     * @returns {object[]}
     */

    function getStack() {
      var cache = getStackCache();
      return cache.get('stack') || [];
    }

    /**
     * Set stack.
     *
     * @param {[]object} stack
     */

    function saveStack(stack) {
      var cache = getStackCache();
      cache.put('stack', stack);
    }

    /**
     * Push a request to the stack.
     *
     * @param {object} request
     */

    function stackPush(request) {
      var stack = getStack();
      stack.push(request);
      saveStack(stack);
    }

    /**
     * Shift a request from the stack.
     *
     * @returns {object} request
     */

    function stackShift() {
      var stack = getStack();
      var request = stack.shift();
      saveStack(stack);
      return request;
    }

    /**
     * Store request to be played later.
     *
     * @param {object} config Request config
     */

    function storeRequest(config) {
      stackPush({
        url: config.url,
        data: config.data,
        headers: config.headers,
        method: config.method,
        offline: config.offline,
        timeout: angular.isNumber(config.timeout) ? config.timeout : undefined
      });
    }

    /**
     * Process next request from the stack.
     *
     * @returns {Promise|null}
     */

    function processNextRequest() {
      var request = stackShift();

      if (!request)
        return $q.reject(new Error('empty stack'));

      log('will process request', request);

      return $requester(request)
        .then(function (response) {
          log('request success', response);
          return response;
        }, function (error) {
          log('request error', error);
          return $q.reject(error);
        });
    }

    /**
     * Process all the stack.
     *
     * @returns {Promise}
     */

    offline.processStack = function () {
      if (!connectionStatus.isOnline())
        return;

      return processNextRequest()
      .then(offline.processStack)
      .catch(function (error) {
        if (error && error.message === 'empty stack') {
          log('all requests completed');
          return;
        }

        if (error && error.message === 'request queued') {
          log('request has been queued, stop');
          return;
        }

        return offline.processStack();
      });
    };

    /**
     * Run offline using a requester ($http).
     *
     * @param {$http} requester
     */

    offline.start = function (requester) {
      $requester = requester;
      connectionStatus.$on('online', offline.processStack);
      offline.processStack();
    };

    /**
     * Expose interceptors.
     */

    offline.interceptors = {
      request: function (config) {
        // If there is not offline options, do nothing.
        if (!config.offline)
          return config;

        log('intercept request', config);

        // Automatically set cache to true.
        if (!config.cache)
          config.cache = true;

        // For GET method, Angular will handle it.
        if (config.method === 'GET') {
          // Online we clean the cache.
          if (connectionStatus.isOnline())
            cleanIfExpired(config.cache, config.url);

          return config;
        }

        // For other methods in offline mode, we will put them in wait.
        if (!connectionStatus.isOnline()) {
          storeRequest(config);
          return $q.reject(new Error('request queued'));
        }

        return config;
      }
    };

    return offline;
  }];
})
.config(['$provide', '$httpProvider', function ($provide, $httpProvider) {
  $provide.factory('offlineInterceptor', ['offline', function (offline) {
    return offline.interceptors;
  }]);

  $httpProvider.interceptors.push('offlineInterceptor');
}]);
