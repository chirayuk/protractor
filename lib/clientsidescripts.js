/**
 * All scripts to be run on the client via executeAsyncScript or
 * executeScript should be put here.
 *
 * NOTE: These scripts are transmitted over the wire as JavaScript text
 * constructed using their toString representation, and *cannot*
 * reference external variables.
 *
 * Some implementations seem to have issues with // comments, so use star-style
 * inside scripts.  (TODO: add issue number / example implementations
 * that caused the switch to avoid the // comments.)
 */

// jshint browser: true
// jshint shadow: true
/* global angular */
var functions = {};

/**
 * Wait until Angular has finished rendering and has
 * no outstanding $http calls before continuing.
 *
 * Asynchronous.
 *
 * @param {string} selector The selector housing an ng-app
 * @param {function} callback callback
 */
functions.waitForAngular = function(selector, callback) {
  var el = document.querySelector(selector);
  try {
    angular.getTestability(el).notifyWhenNoOutstandingRequests(callback);
  } catch (e) {
    console.log("waitForAngular: **** EXCEPTION: (continuing) ****\n"+e);
    callback(e);
  }
};


/**
 * Find a list of elements in the page by their angular binding.
 *
 * @param {string} binding The binding, e.g. {{cat.name}}.
 * @param {boolean} exactMatch Whether the binding needs to be matched exactly
 * @param {Element} using The scope of the search.
 *
 * @return {Array.<Element>} The elements containing the binding.
 */
functions.findBindings = function(binding, exactMatch, using) {
  function dedupDomNodes(nodes) {
    if (nodes.length == 0) {
      return nodes;
    }
    var noDupes = true;
    nodes.sort(function(a, b) {
      if (a === b) {
        noDupes = false;
        return 0;
      }
      return ((a.compareDocumentPosition(b) & 6) == 4) ? 1 : -1;
    });
    if (noDupes) {
      return nodes;
    }
    var results = [];
    for (var i = 0, node = null, candidate = nodes[i], N = nodes.length;
         i < N;
         i++, candidate = nodes[i]) {
      if (candidate !== node) {
        node = candidate;
        results.push(node);
      }
    }
    return results;
  }

  function ensureElements(nodes) {
    for (var i = 0, N=nodes.length, hadText = false; i < N; i++) {
      if (nodes[i].nodeType == 3) {
        hadText = true;
        nodes[i] = nodes[i].parentNode;
      }
    }
    return (hadText) ? dedupDomNodes(nodes) : nodes;
  }

  var testability = angular.getTestability(using || document);
  var nodes = testability.findBindings(binding, exactMatch);
  // bindings can be on text nodes.  But we need to return Elements for
  // webdriver.  So we'll return the parentElement for text nodes.
  return ensureElements(nodes);
};

/**
 * Find an array of elements matching a row within an ng-repeat.
 * Always returns an array of only one element for plain old ng-repeat.
 * Returns an array of all the elements in one segment for ng-repeat-start.
 *
 * @param {string} repeater The text of the repeater, e.g. 'cat in cats'.
 * @param {number} index The row index.
 * @param {Element} using The scope of the search.  Defaults to 'document'.
 *
 * @return {Array.<Element>} The row of the repeater, or an array of elements
 *     in the first row in the case of ng-repeat-start.
 */
 functions.findRepeaterRows = function(repeater, index, using) {
  using = using || document;

  var prefixes = ['ng-', 'ng_', 'data-ng-', 'x-ng-', 'ng\\:'];
  var rows = [];
  for (var p = 0; p < prefixes.length; ++p) {
    var attr = prefixes[p] + 'repeat';
    var repeatElems = using.querySelectorAll('[' + attr + ']');
    attr = attr.replace(/\\/g, '');
    for (var i = 0; i < repeatElems.length; ++i) {
      if (repeatElems[i].getAttribute(attr).indexOf(repeater) != -1) {
        rows.push(repeatElems[i]);
      }
    }
  }
  /* multiRows is an array of arrays, where each inner array contains
     one row of elements. */
  var multiRows = [];
  for (var p = 0; p < prefixes.length; ++p) {
    var attr = prefixes[p] + 'repeat-start';
    var repeatElems = using.querySelectorAll('[' + attr + ']');
    attr = attr.replace(/\\/g, '');
    for (var i = 0; i < repeatElems.length; ++i) {
      if (repeatElems[i].getAttribute(attr).indexOf(repeater) != -1) {
        var elem = repeatElems[i];
        var row = [];
        while (elem.nodeType != 8 ||
            elem.nodeValue.indexOf(repeater) == -1) {
          if (elem.nodeType == 1) {
            row.push(elem);
          }
          elem = elem.nextSibling;
        }
        multiRows.push(row);
      }
    }
  }
  return [rows[index]].concat(multiRows[index]);
 };

 /**
 * Find all rows of an ng-repeat.
 *
 * @param {string} repeater The text of the repeater, e.g. 'cat in cats'.
 * @param {Element} using The scope of the search.  Defaults to 'document'.
 *
 * @return {Array.<Element>} All rows of the repeater.
 */
 functions.findAllRepeaterRows = function(repeater, using) {
  using = using || document;

  var rows = [];
  var addIfElem = function(elem) {
    if (elem.nodeType == 1) {
      rows.push(elem);
    }
  }

  var prefixes = ['ng-', 'ng_', 'data-ng-', 'x-ng-', 'ng\\:'];
  for (var containerMode = 0; containerMode < 2; ++containerMode) {
    var suffix = containerMode ? 'repeat' : 'repeat-start';
    for (var p = 0; p < prefixes.length; ++p) {
      var attr = prefixes[p] + suffix;
      var repeatElems = using.querySelectorAll('[' + attr + ']');
      attr = attr.replace(/\\/g, '');
      for (var i = 0; i < repeatElems.length; ++i) {
        var elem = repeatElems[i];
        if (containerMode) {
          if (elem.getAttribute(attr).indexOf(repeater) != -1) {
            addIfElem(elem);
          }
        } else {
          while (elem.nodeType != 8 ||
                 (elem.nodeValue && elem.nodeValue.indexOf(repeater) == -1)) {
            addIfElem(elem);
            elem = elem.nextSibling;
          }
        }
      }
    }
  }

  return rows;
 };

/**
 * Find an element within an ng-repeat by its row and column.
 *
 * @param {string} repeater The text of the repeater, e.g. 'cat in cats'.
 * @param {number} index The row index.
 * @param {string} binding The column binding, e.g. '{{cat.name}}'.
 * @param {Element} using The scope of the search.  Defaults to 'document'.
 *
 * @return {Array.<Element>} The element in an array.
 */
functions.findRepeaterElement = function(repeater, index, binding, using) {
  throw "findRepeaterElement is deprecated";
}

/**
 * Find the elements in a column of an ng-repeat.
 *
 * @param {string} repeater The text of the repeater, e.g. 'cat in cats'.
 * @param {string} binding The column binding, e.g. '{{cat.name}}'.
 * @param {Element} using The scope of the search.  Defaults to 'document'.
 *
 * @return {Array.<Element>} The elements in the column.
 */
functions.findRepeaterColumn = function(repeater, binding, using) {
  throw "findRepeaterColumn is deprecated";
};

/**
 * Find elements by model name.
 *
 * @param {string} model The model name.
 * @param {Element} using The scope of the search.  Defaults to 'document'.
 *
 * @return {Array.<Element>} The matching elements.
 */
functions.findByModel = function(model, using) {
  var testability = angular.getTestability(using || document);
  return testability.findModels(model);
};


/**
 * Find buttons by textual content.
 *
 * @param {string} searchText The exact text to match.
 * @param {Element} using The scope of the search.  Defaults to 'document'.
 *
 * @return {Array.<Element>} The matching elements.
 */
functions.findByButtonText = function(searchText, using) {
  using = using || document;
  var elements = using.querySelectorAll('button, input[type="button"], input[type="submit"]');
  var matches = [];
  for (var i = 0; i < elements.length; ++i) {
    var element = elements[i];
    var elementText;
    if (element.tagName.toLowerCase() == 'button') {
      elementText = element.innerText || element.textContent;
    } else {
      elementText = element.value;
    }
    if (elementText === searchText) {
      matches.push(element);
    }
  }

  return matches;
};

/**
 * Find buttons by textual content.
 *
 * @param {string} searchText The exact text to match.
 * @param {Element} using The scope of the search.  Defaults to 'document'.
 *
 * @return {Array.<Element>} The matching elements.
 */
functions.findByPartialButtonText = function(searchText, using) {
  using = using || document;
  var elements = using.querySelectorAll('button, input[type="button"], input[type="submit"]');
  var matches = [];
  for (var i = 0; i < elements.length; ++i) {
    var element = elements[i];
    var elementText;
    if (element.tagName.toLowerCase() == 'button') {
      elementText = element.innerText || element.textContent;
    } else {
      elementText = element.value;
    }
    if (elementText.indexOf(searchText) > -1) {
      matches.push(element);
    }
  }

  return matches;
};

/**
 * Find elements by css selector and textual content.
 *
 * @param {string} cssSelector The css selector to match.
 * @param {string} searchText The exact text to match.
 * @param {Element} using The scope of the search. Defaults to 'document'.
 *
 * @return {Array.<Element>} An array of matching elements.
 */
functions.findByCssContainingText = function(cssSelector, searchText, using) {
  var using = using || document;
  var elements = using.querySelectorAll(cssSelector);
  var matches = [];
  for (var i = 0; i < elements.length; ++i) {
    var element = elements[i];
    var elementText = element.innerText || element.textContent;
    if (elementText.indexOf(searchText) > -1) {
      matches.push(element);
    }
  }
  return matches;
};

/**
 * Tests whether the angular global variable is present on a page. Retries
 * in case the page is just loading slowly.
 *
 * Asynchronous.
 *
 * @param {number} attempts Number of times to retry.
 * @param {function} asyncCallback callback
 */
functions.testForAngular = function(attempts, asyncCallback) {
  var callback = function(args) {
    setTimeout(function() {
      asyncCallback(args);
    }, 0);
  };
  var check = function(n) {
    try {
      if (window.angular && window.angular.resumeBootstrap) {
        callback([true, null]);
      } else if (n < 1) {
        if (window.angular) {
          callback([false, 'angular never provided resumeBootstrap']);
        } else {
          callback([false, 'retries looking for angular exceeded']);
        }
      } else {
        window.setTimeout(function() {check(n - 1);}, 1000);
      }
    } catch (e) {
      callback([false, e]);
    }
  };
  check(attempts);
};

/**
 * Evalute an Angular expression in the context of a given element.
 *
 * @param {Element} element The element in whose scope to evaluate.
 * @param {string} expression The expression to evaluate.
 *
 * @return {?Object} The result of the evaluation.
 */
functions.evaluate = function(element, expression) {

  var testability = angular.getTestability(element);
  return testability.eval(expression);
};

functions.allowAnimations = function(element, allow) {
  var testability = angular.getTestability(element);
  return testability.allowAnimations(allow);
};

/**
 * Return the current url using $location.absUrl().
 *
 * @param {string} selector The selector housing an ng-app
 */
functions.getLocationAbsUrl = function(selector) {
  var testability = angular.getTestability(document.querySelector(selector));
  return testability.getLocation();
};

/**
 * Browse to another page using in-page navigation.
 *
 * @param {string} selector The selector housing an ng-app
 * @param {string} url In page URL using the same syntax as $location.url(),
 *     /path?search=a&b=c#hash
 */
functions.setLocation = function(selector, url) {
  var testability = angular.getTestability(document.querySelector(selector));
  if (url !== testability.getLocation()) {
    testability.setLocation(url);
  }
};

/* Publish all the functions as strings to pass to WebDriver's
 * exec[Async]Script.  In addition, also include a script that will
 * install all the functions on window (for debugging.)
 *
 * We also wrap any exceptions thrown by a clientSideScripts function
 * that is not an instance of the Error type into an Error type.  If we
 * don't do so, then the resulting stack trace is completely unhelpful
 * and the exception message is just "unknown error."  These types of
 * exceptins are the common case for dart2js code.  This wrapping gives
 * us the Dart stack trace and exception message.
 */
var util = require('util');
var scriptsList = [];
var scriptFmt = (
    'try { return (%s).apply(this, arguments); }\n' +
    'catch(e) { throw (e instanceof Error) ? e : new Error(e); }');
for (var fnName in functions) {
  if (functions.hasOwnProperty(fnName)) {
    exports[fnName] = util.format(scriptFmt, functions[fnName]);
    scriptsList.push(util.format('%s: %s', fnName, functions[fnName]));
  }
}

exports.installInBrowser = (util.format(
    'window.clientSideScripts = {%s};', scriptsList.join(', ')));
