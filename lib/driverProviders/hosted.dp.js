/*
 *  This is an implementation of the Hosted Driver Provider.
 *  It is responsible for setting up the account object, tearing
 *  it down, and setting up the driver correctly.
 */

var util = require('util'),
    webdriver = require('selenium-webdriver'),
    q = require('q');


var HostedDriverProvider = function(config) {
  this.config_ = config;
  this.driver_ = null;
};

/**
 * Configure and launch (if applicable) the object's environment.
 * @public
 * @return {q.promise} A promise which will resolve when the environment is
 *     ready to test.
 */
HostedDriverProvider.prototype.setupEnv = function() {
  util.puts('Using the selenium server at ' + this.config_.seleniumAddress);
  return q.fcall(function() {});
};

/**
 * Teardown and destroy the environment and do any associated cleanup.
 * Shuts down the driver.
 *
 * @public
 * @return {q.promise} A promise which will resolve when the environment
 *     is down.
 */
HostedDriverProvider.prototype.teardownEnv = function(runner) {
  var deferred = q.defer();
  if ('ckck_dont_quit_browser_on_exit') {
    this.driver_.quit().then(function() {
      deferred.resolve();
    });
  } else {
    deferred.resolve();
  }
  return deferred.promise;
};

/**
 * Return the webdriver for the runner.
 * @public
 * @return webdriver instance   
 */
HostedDriverProvider.prototype.getDriver = function() {
  if (!this.driver_) {
    var builder = this.driver_ = new webdriver.Builder();
    console.warn('CKCK: HostedDriverProvider: builder: %O\n', builder);
    builder.usingServer(this.config_.seleniumAddress);
    if (this.config_.sessionId) {
      builder.usingSession(this.config_.sessionId);
    }
    builder.withCapabilities(this.config_.capabilities);
    this.driver_ = builder.build();
  }
  this.driver_.getSession().then(function (session) {
    // console.warn('CKCK: HostedDriverProvider:getDriver(): selenium session is: %O\n', session);
    console.warn('CKCK: HostedDriverProvider:getDriver(): selenium session ID: %s', session.getId());
  });
  return this.driver_;
};

// new instance w/ each include
module.exports = (function(config) {
  return new HostedDriverProvider(config);
});
