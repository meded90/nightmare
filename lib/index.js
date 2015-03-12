var phantom = require('phantom');
var Q = require('q');
var debug = require('debug')('nightmare');
var defaults = require('defaults');
var clone = require('clone');
var once = require('once');
var actions = require('./actions');
var noop = function () {};
var Response = function(nightmare) {
  this.nightmare = nightmare;
};
Q.longStackSupport = true;


/**
 * Expose `Nightmare`.
 */

module.exports = Nightmare;

/**
 * Global PORT to avoid EADDRINUSE
 */

var PORT = 15200;

/**
 * Default options.
 *
 * http://phantomjs.org/api/command-line.html
 */

var DEFAULTS = {
  timeout: 5000,
  interval: 50,
  weak: true,
  loadImages: true,
  ignoreSslErrors: true,
  sslProtocol: 'any',
  proxy: null,
  proxyType: null,
  proxyAuth: null,
  cookiesFile: null,
  webSecurity: true
};

/**
 * Initialize a new `Nightmare`.
 *
 * @param {Object} options
 */

function Nightmare (options) {
  if (!(this instanceof Nightmare)) return new Nightmare(options);
  this.options = defaults(clone(options) || {}, DEFAULTS);
}

/**
 * Run
 */

Nightmare.prototype.run = function() {

  return Q.Promise(function (resolve, reject) {

    var self = this;

    debug('start');

    this.setup(function () {
      resolve(self);
    });

  }.bind(this));

};

/**
 * Set up a fresh phantomjs page.
 *
 * @param {Function} done
 * @api private
 */

Nightmare.prototype.setup = function(done) {
  var self = this;
  this.setupInstance(function(instance) {
    debug('.setup() phantom instance created');
    instance.createPage(function(page) {
      self.page = page;
      debug('.setup() phantom page created');
      done();
    });
  });
};

/**
 * Safely set up a fresh phantomjs instance.
 *
 * @param {Function} done
 * @api private
 */

Nightmare.prototype.setupInstance = function(done) {
  debug('.setup() creating phantom instance with options %s', JSON.stringify(this.options));
  if (this.initializingPhantomJS) {
    var self = this;
    var check = setInterval(function() {
      if (self.phantomJS) {
        clearInterval(check);
        done(self.phantomJS);
      }
    }, 50);
  }
  else {
    this.initializingPhantomJS = true;
    this.createInstance(done);
  }
};

/**
 * Create a phantomjs instance.
 *
 * @param {Function} done
 * @api private
 */

Nightmare.prototype.createInstance = function(done) {
  var flags = [];
  flags.push('--load-images='+this.options.loadImages);
  flags.push('--ignore-ssl-errors='+this.options.ignoreSslErrors);
  flags.push('--ssl-protocol='+this.options.sslProtocol);
  flags.push('--web-security='+this.options.webSecurity);
  if (this.options.proxy !== null) {
    flags.push('--proxy='+this.options.proxy);
  }
  if (this.options.proxyType !== null) {
    flags.push('--proxy-type='+this.options.proxyType);
  }
  if (this.options.proxyAuth !== null) {
    flags.push('--proxy-auth='+this.options.proxyAuth);
  }
  if (this.options.cookiesFile !== null) {
    flags.push('--cookies-file='+this.options.cookiesFile);
  }

  // dnode options for compilation on windows
  var dnodeOpts = {};
  if (this.options.weak === false) {
     dnodeOpts = { weak : false };
  }

  // combine flags, options and callback into args
  var args = flags;
  args.push({
    port: this.options.port || getPort(),
    dnodeOpts: dnodeOpts,
    path: this.options.phantomPath
  });
  var self = this;
  args.push(function(instance) {
    self.phantomJS = instance;
    done(instance);
  });
  phantom.create.apply(phantom, args);

  // clear the timeout handler
  this.onTimeout = noop;
};

/**
 * Tear down a phantomjs instance.
 *
 * @api private
 */

Nightmare.prototype.teardownInstance = function() {
  this.initializingPhantomJS = false;
  this.phantomJS.exit(0);
  debug('.teardownInstance() tearing down');

};

/**
 * Check function on page until it becomes true.
 *
 * @param {Function} check
 * @param {Object} value
 * @api private
 */

Nightmare.prototype.untilOnPage = function(check, value) {
  var page = this.page;
  var condition = false;
  var args = [].slice.call(arguments).slice(2);
  var hasCondition = function() {
    args.unshift(function(res) {
      condition = res;
    });
    args.unshift(check);
    page.evaluate.apply(page, args);
    return condition === value;
  };

  return until(hasCondition, this.options.timeout, this.options.interval);

};

/**
 * Check function on page until it becomes true.
 *
 * @param {Function} check
 * @param {Object} value
 * @param {Number} delay
 * @api private
 */

Nightmare.prototype.refreshUntilOnPage = function(check, value, delay) {


  return Q.Promise(function(resolve, reject) {

    var page = this.page;
    debug('.wait() checking for condition after refreshing every ' + delay);
    var interval = setInterval(function() {
      page.evaluate(check, function(result) {
        if (result === value) {
          debug('.wait() saw value match after refresh');
          clearInterval(interval);
          resolve();
        }
        else {
          debug('.wait() refreshing the page (no match on value=' + result + ')');
          page.evaluate(function() {
            document.location.reload(true);
          });
        }
      });
    }, delay);

  }.bind(this));

};

/**
 * Trigger the callback after the next page load.
 *
 * @api private
 */

Nightmare.prototype.afterNextPageLoad = function() {

  return Q.Promise(function(resolve, reject) {

    var isUnloaded = function() {
      return (document.readyState !== "complete");
    };
    var isLoaded = function() {
      return (document.readyState === "complete");
    };

    var self = this;
    self.untilOnPage(isUnloaded, true).then(function() {

      debug('.wait() detected page unload');

      self.untilOnPage(isLoaded, true).then(function() {

        debug('.wait() detected page load');

        resolve();

      }, function(e) {

        resolve();

      });

    }, function(e) {

      resolve();

    });

  }.bind(this));

};

/**
 * Check function until it becomes true.
 *
 * @param {Function} check
 * @param {Number} timeout
 * @param {Number} interval
 */

function until(check, timeout, interval) {

  return Q.Promise(function(resolve, reject) {

    var start = Date.now();
    var checker = setInterval(function() {
      var diff = Date.now() - start;
      var res = check();
      if (res) {
        clearInterval(checker);
        resolve(res);
      } else if (diff > timeout) {
        clearInterval(checker);
        reject(new Error('Timeout limit expired'));
      }
    }, interval);

  });

}


/**
 * Static method for creating the action
 * @param name
 * @param fn
 */
Nightmare.addAction = function(name, fn) {

  Nightmare.prototype[name] = function(){
    var self = this;
    var args = [].slice.call(arguments);
    return function(){
      return fn.apply(self,args)
    }
  };

};


/**
 * Attach all the actions.
 */

Object.keys(actions).forEach(function (name) {
  Nightmare.addAction(name, actions[name]);
});

/**
 * Generate new port globally to avoid EADDRINUSE.
 */

function getPort() {
  PORT++;
  return PORT;
}
