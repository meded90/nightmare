var debug = require('debug')('nightmare');
var fs = require('fs');
var Q = require('q');

Q.longStackSupport = true;

/**
 * Go to a new url.
 *
 * @param {String} url
 */

exports.goto = function(url) {

  return Q.Promise(function(resolve, reject) {

    var self = this;

    self.page.open(url, function(status) {

      setTimeout(function() {

        resolve(status);

      }, 500);

    });

  }.bind(this));

};

/**
 * Go back.
 */
exports.back = function() {

  return Q.Promise(function(resolve, reject) {

    var self = this;

    debug('.back()');
    this.page.goBack();
    resolve();

  }.bind(this));

};

/**
 * Go forward.
 */
exports.forward = function(done) {

  return Q.Promise(function (resolve, reject) {

    var self = this;

    debug('.forward()');
    this.page.goForward();
    resolve();

  }.bind(this));

};

/**
 * Refresh the page.
 */

exports.refresh = function() {

  return Q.Promise(function (resolve, reject) {

    var self = this;

    debug('.refresh()-ing the page');
    this.page.evaluate(function(selector) {
      document.location.reload(true);
    }, function() {
      resolve();
    }.bind(this));

  }.bind(this));

};

/**
 * Get the url of the page.
 */
exports.url = function() {


  return Q.Promise(function (resolve, reject) {

    var self = this;

    this.page.evaluate(function() {
      return document.location.href;
    }, function(url) {
      resolve(url);
    }.bind(this));

  }.bind(this));

};

/**
 * Get the title of the page.

 */
exports.title = function() {

  return Q.Promise(function (resolve, reject) {

    var self = this;

    debug('.title() getting it');
    this.page.evaluate(function() {
      return document.title;
    }, function(title) {
      resolve(title);
    }.bind(this));

  }.bind(this));

};

/**
 * Determine if a selector is visible on a page.
 *
 * @param {String} selector
 */

exports.visible = function(selector) {

  return Q.Promise(function (resolve, reject) {

    var self = this;

    this.page.evaluate(function(selector) {
      var elem = document.querySelector(selector);
      if (elem) return (elem.offsetWidth > 0 && elem.offsetHeight > 0);
      else return false;
    }, function(result) {
      resolve(result);
    }.bind(this), selector);

  }.bind(this));

};


/**
 * Determine if a selector exists on a page.
 *
 * @param {String} selector
 */

exports.exists = function(selector) {


  return Q.Promise(function (resolve, reject) {

    var self = this;

    debug('.exists() for ' + selector);
    this.page.evaluate(function(selector) {
      return (document.querySelector(selector)!==null);
    }, function(result) {
      resolve(result);
    }, selector);

  }.bind(this));



};

/**
 * Inject a JavaScript or CSS file onto the page
 *
 * @param {String} type
 * @param {String} file
 */

exports.inject = function(type, file){
  debug('.inject()-ing a file');
  var startTag, endTag;
  if ( type !== "js" && type !== "css" ){
    debug('unsupported file type in .inject()');
    done();
  }
  if (type === "js"){
    startTag = "<script>";
    endTag = "</script>";
  }
  else if (type === "css"){
    startTag = "<style>";
    endTag = "</style>";
  }

  return Q.Promise(function (resolve, reject) {

    var self = this;

    this.page.getContent(function (pageContent) {
      var injectedContents = fs.readFileSync(file);
      var content = pageContent + startTag + injectedContents + endTag;
      self.page.setContent(content, null, function() {
        resolve();
      });
    });

  }.bind(this));

};

/**
 * Click an element.
 *
 * @param {String} selector
 */

exports.click = function(selector) {

  return Q.Promise(function (resolve, reject) {

    var self = this;

    debug('.click() on ' + selector);
    this.page.evaluate(function (selector) {
      var element = document.querySelector(selector);
      var event = document.createEvent('MouseEvent');
      event.initEvent('click', true, true);
      element.dispatchEvent(event);
    }, function() {

      resolve();

    }, selector);

  }.bind(this));


};

/**
 * Type into an element.
 *
 * @param {String} selector
 * @param {String} text
 */

exports.type = function(selector, text) {

  return Q.Promise(function (resolve, reject) {

    var self = this;
    debug('.type() %s into %s', text, selector);
    this.page.evaluate(function(selector, text){
      document.querySelector(selector).focus();
    }, function(){
      self.page.sendEvent('keypress', text, null, null, 0);
      resolve();
    }, selector, text);

  }.bind(this));

};

/**
 * Check a checkbox, fire change event
 *
 * @param {String} selector
 */

exports.check = function(selector) {

  return Q.Promise(function (resolve, reject) {

    var self = this;

    debug('.check() ' + selector);
    this.page.evaluate(function(selector) {
      var element = document.querySelector(selector);
      var event = document.createEvent('HTMLEvents');
      element.checked = true;
      event.initEvent('change', true, true);
      element.dispatchEvent(event);

    }, function() {
      resolve();
    }, selector);

  }.bind(this));


};

/**
 * Choose an option from a select dropdown
 *
 *
 *
 * @param {String} selector
 * @param {String} option value
 */

exports.select = function(selector, option) {

  return Q.Promise(function (resolve, reject) {

    var self = this;

    debug('.select() ' + selector);
    this.page.evaluate(function(selector, option) {
      var element = document.querySelector(selector);
      var event = document.createEvent('HTMLEvents');
      element.value = option;
      event.initEvent('change', true, true);
      element.dispatchEvent(event);
    }, function() {
      resolve();
    }, selector, option);

  }.bind(this));

};


/**
 * Scroll to a specific location on the page
 *
 * @param {Number} Top
 * @param {Number} Left
 */

exports.scrollTo = function(top, left) {

  return Q.Promise(function (resolve, reject) {

    var self = this;

    debug('.scrollTo() top: ' + top + ', left: ' + left);
    this.page.set('scrollPosition', {
      top: top,
      left: left
    }, function() {
        resolve();
    });

  }.bind(this));

};

/**
 * Upload a path into a file input.
 *
 * @param {String} selector
 * @param {String} path
 */

exports.upload = function(selector, path) {

  return Q.Promise(function (resolve, reject) {

    var self = this;

    debug('.upload() to ' + selector + ' with ' + path);
    if (fs.existsSync(path)) {
      this.page.uploadFile(selector, path, impatient(function() {
        resolve();
      }, this.options.timeout));
    }
    else {
      debug('invalid file path for upload: %s', path);
      throw new Error('File does not exist to upload.');
    }

  }.bind(this));

};

/**
 * Wait for various states.
 *
 * @param {Null|Number|String|Function} condition
 */

exports.wait = function(/* args */) {

  var args = arguments;

  return Q.Promise(function (resolve, reject) {

    var page = this.page;
    var self = this;

    // null
    if (args.length === 0) {

      debug('.wait() for the next page load');
      this.afterNextPageLoad().then(function() {
          resolve();
      }, function(e) {
        reject(e);
      });
    }
    else if (args.length === 1) {
      var condition = args[0];
      if (typeof condition === 'number') {
        var ms = condition;
        debug('.wait() for ' + ms + 'ms');
        setTimeout(function() {
          resolve();
        }, ms);
      }
      else if (typeof condition === 'string') {
        var selector = condition;
        debug('.wait() for the element ' + selector);
        // we lose the clojure when it goes to phantom, so we have to
        // force it with string concatenation and eval
        eval("var elementPresent = function() {"+
        "  var element = document.querySelector('"+selector+"');"+
        "  return (element ? true : false);" +
        "};");

        this.untilOnPage(elementPresent, true, selector).then(function() {
            resolve();
        }, function(e) {
            reject(e);
        });

      }
    }
    // wait for on-page fn==value
    else if (args.length > 1) {
      var fn = args[0];
      var value = args[1];
      if (args.length === 2) {
        debug('.wait() for fn==' + value);
        this.untilOnPage(fn, value).then(function() {
            resolve();
        }, function(e) {
            reject(e);
        });
      }
      else if (args.length === 3) {
        var delay = args[2];
        debug('.wait() for fn==' + value + ' with refreshes every ' + delay);
        this.refreshUntilOnPage(fn, value, delay).then(function() {
            resolve();
        });
      }
    }

  }.bind(this));

};

/**
 * Take a screenshot.
 *
 * @param {String} path
 */

exports.screenshot = function (path, done) {

  return Q.Promise(function (resolve, reject) {

    var self = this;

    var formats = ['png', 'gif', 'jpeg', 'jpg', 'pdf'];
    var ext = path.substring(path.indexOf('.') + 1);
    if (!~formats.join(',').indexOf(ext)) {
      throw new Error('Must include file extension in `path`.');
    }

    debug('.screenshot() saved to ' + path);

    this.page.render(path, function() {

      resolve();

    });

  }.bind(this));

};

/**
 * Render a PDF.
 *
 * @param {String} path
 */

exports.pdf = function (path) {

  return Q.Promise(function (resolve, reject) {

    var self = this;

    debug('.pdf() saved to ' + path);
    this.page.set('paperSize', {
      format: 'A4',
      orientation: 'portrait',
      margin: '2cm'
    });
    this.page.render(path, {format: 'pdf', quality: '100'}, function() {
      resolve();
    });

  }.bind(this));

};

/**
 * Run the function on the page.
 *
 * @param {Function} func
 * @param {...} args
 */

exports.evaluate = function (func) {

  var args = [].slice.call(arguments);

  return Q.Promise(function (resolve, reject) {

    var self = this;
    args.shift();

    args.unshift(function(res) {

      resolve(res);

    });

    args.unshift(func);

    this.page.evaluate.apply(this.page, args);

  }.bind(this));

};

/**
 * Set the viewport.
 *
 * @param {Number} width
 * @param {Number} height
 */

exports.viewport = function (width, height) {

  return Q.Promise(function (resolve, reject) {

    var self = this;
    debug('.viewport() to ' + width + ' x ' + height);
    var viewport = { width: width, height: height };
    this.page.set('viewportSize', viewport, function() {
      resolve();
    });

  }.bind(this));


};

/**
 * Set the zoom factor.
 *
 * @param {Number} zoomFactor
 */

exports.zoom = function (zoomFactor) {

  return Q.Promise(function (resolve, reject) {

    var self = this;

    self.page.set('zoomFactor', zoomFactor, function() {
      resolve();
    });

  }.bind(this));


};

/**
 * Handles page events.
 *
 * @param {String} type
 *
 * See readme for event types.
 * @param callback
 */
exports.on = function (type, callback) {

  var args = [].slice.call(arguments);

  return Q.Promise(function (resolve, reject) {

    var self = this;

    if (type === 'resourceRequestStarted') {

      args = args.slice(1);
      self.page.onResourceRequested.apply(self.page, args);
      resolve();

    }
    // All other events handled natively in phantomjs
    else {
      var pageEvent = 'on' + type.charAt(0).toUpperCase() + type.slice(1);
      self.page.set(pageEvent, callback, function() {
        resolve();
      });
    }

  }.bind(this));

};

/**
 * @param user
 * @param password
 */
exports.authentication = function(user, password) {

  return Q.Promise(function (resolve, reject) {

    var self = this;
    self.page.get('settings', function(settings){
      settings.userName = user;
      settings.password = password;
      self.page.set('settings', settings, function() {
        resolve();
      });
    });

  }.bind(this));

};

/**
 * Set the useragent.
 *
 * @param {String} useragent
 * @param {Function} done
 */

exports.agent =
exports.useragent = function(useragent) {

  return Q.Promise(function (resolve, reject) {

    var self = this;
    debug('.useragent() to ' + useragent);
    self.page.set('settings.userAgent', useragent, function() {
      resolve();
    });

  }.bind(this));

};

/**
 * Impatiently call the function after a timeout, if it hasn't been called yet.
 *
 * @param {Function} fn
 * @param {Number} timeout
 */

function impatient(fn, timeout) {
  var called = false;
  var wrapper = function() {
    if (!called) fn.apply(null, arguments);
    called = true;
  };
  setTimeout(wrapper, timeout);
  return wrapper;
}

/*
 * Sets the headers.
 * @param {Object} headers
 */

exports.headers = function(headers) {

  return Q.Promise(function (resolve, reject) {

    var self = this;

    self.page.setHeaders(headers, function() {
      resolve();
    });

  }.bind(this));

};
