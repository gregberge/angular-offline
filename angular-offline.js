angular
.module('offline', ['angular-cache'])
.provider('offline', function () {
  var offlineProvider = this;

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

  this.$get = function ($q, $window, $log, CacheFactory) {

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
     * Get or create a cache from key and options.
     *
     * @param {string} name
     * @param {object} [options]
     * @returns {object} cache
     */

    function getOrCreateCache(name, options) {
      return CacheFactory.get(name) || CacheFactory.createCache(name, options);
    }

    /**
     * Format the name of the cache.
     *
     * @param {object} options Options
     * @param {object} [options.maxAge]
     * @returns {object} cache
     */

    function formatCacheName(options) {
      return options.maxAge ? 'offline-' + options.maxAge : 'offline-infinite';
    }

    /**
     * Test if the navigator is online.
     *
     * @returns {boolean} online?
     */

    function isOnline() {
      return window.location.toString().match('online');
      return navigator.onLine;
    }

    /**
     * Clean cache if expired.
     *
     * @param {object} cache Cache
     * @param {string} key Cache key
     */

    function cleanIfExpired(cache, key) {
      var info = cache.info(key);
      if (info && info.isExpired)
        cache.remove(key);
    }

    /**
     * Create an offline error.
     *
     * @param {string} message Error message
     * @returns {Error}
     */

    function createError(message) {
      var error = new Error(message);
      error.offline = true;
      return error;
    }

    /**
     * Get stack cache.
     *
     * @returns {object} Cache
     */

    function getStackCache() {
      return getOrCreateCache('offline-request-stack', {
        storageMode: 'localStorage'
      });
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
     * @param {*} requester
     * @returns {Promise|null}
     */

    function processNextRequest(requester) {
      var request = stackShift();

      if (!request)
        return $q.reject(createError('empty stack'));

      log('will process request', request);

      return requester(request)
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
     * @param {*} requester
     * @returns {Promise}
     */

    function processStack(requester) {
      if (!isOnline())
        return;

      var recursiveProcess = angular.bind(null, processStack, requester);
      return processNextRequest(requester)
      .then(recursiveProcess)
      .catch(function (error) {
        if (error && error.message === 'empty stack') {
          log('all requests completed');
          return;
        }

        if (error && error.message === 'request queued') {
          log('request has been queued, stop');
          return;
        }

        return recursiveProcess();
      });
    }

    return {
      run: function (requester) {
        var processStackBinded = angular.bind(null, processStack, requester);
        $window.addEventListener('online', processStackBinded);
        processStackBinded();
      },
      interceptors: {
        request: function (config) {
          // If there is not offline options, do nothing.
          if (!config.offline)
            return config;

          if (!angular.isUndefined(config.cache))
            throw new Error('"cache" and "offline" options are not compatible');

          // Default offline to an object.
          if (!angular.isObject(config.offline))
            config.offline = {};

          log('intercept request', config);

          // For GET method, Angular will handle it.
          if (config.method === 'GET') {
            // Defaults options.
            config.offline.deleteOnExpire = config.offline.deleteOnExpire || 'none';
            config.offline.storageMode = config.offline.storageMode || 'localStorage';

            // Create cache.
            var cache = getOrCreateCache(formatCacheName(config.offline), config.offline);

            // Online we clean the cache.
            if (isOnline())
              cleanIfExpired(cache, config.url);

            return angular.extend(config, {cache: cache});
          }

          // For other methods in offline mode, we will put them in wait.
          if (!isOnline()) {
            storeRequest(config);
            return $q.reject(createError('request queued'));
          }

          return config;
        }
      }
    }
  };
})
.config(function ($provide, $httpProvider) {
  $provide.factory('offlineInterceptor', function (offline) {
    return offline.interceptors;
  });

  $httpProvider.interceptors.push('offlineInterceptor');
})
.run(function (offline, $http) {
  offline.run($http);
});
