var util = require('util');
var webdriver = require('selenium-webdriver');

var clientSideScripts = require('./clientsidescripts.js');

/**
 * The Protractor Locators. These provide ways of finding elements in
 * Angular applications by binding, model, etc.
 *
 * @augments webdriver.Locator.Strategy
 */
var ProtractorBy = function() {};
var WebdriverBy = function() {};

/**
 * webdriver's By is an enum of locator functions, so we must set it to
 * a prototype before inheriting from it.
 */
WebdriverBy.prototype = webdriver.By;
util.inherits(ProtractorBy, WebdriverBy);

/**
 * Add a locator to this instance of ProtractorBy. This locator can then be
 * used with element(by.locatorName(args)).
 *
 * @view
 * <button ng-click="doAddition()">Go!</button>
 *
 * @example
 * // Add the custom locator.
 * by.addLocator('buttonTextSimple', function(buttonText, opt_parentElement) {
 *   // This function will be serialized as a string and will execute in the
 *   // browser. The first argument is the text for the button. The second
 *   // argument is the parent element, if any.
 *   var using = opt_parentElement || document,
 *   buttons = using.querySelectorAll('button');
 *
 *   // Return an array of buttons with the text.
 *   return Array.prototype.filter.call(buttons, function(button) {
 *     return button.textContent === buttonText;
 *   });
 * });
 *
 * // Use the custom locator.
 * element(by.buttonTextSimple('Go!')).click();
 *
 * @alias by.addLocator(locatorName, functionOrScript)
 * @param {string} name The name of the new locator.
 * @param {Function|string} script A script to be run in the context of
 *     the browser. This script will be passed an array of arguments
 *     that contains any args passed into the locator followed by the
 *     element scoping the search. It should return an array of elements.
 */
ProtractorBy.prototype.addLocator = function(name, script) {
  this[name] = function() {
    var locatorArguments = arguments;
    return {
      findElementsOverride: function(driver, using) {
        var findElementArguments = [script];
        for (var i = 0; i < locatorArguments.length; i++) {
          findElementArguments.push(locatorArguments[i]);
        }
        findElementArguments.push(using);

        return driver.findElements(
            webdriver.By.js.apply(webdriver.By, findElementArguments));
      },
      message: 'by.' + name + '("' + Array.prototype.join.call(locatorArguments, '", "') + '")'
    };
  };
};

/**
 * Find an element by binding.
 *
 * @alias by.binding()
 * @view
 * <span>{{person.name}}</span>
 * <span ng-bind="person.email"></span>
 *
 * @example
 * var span1 = element(by.binding('person.name'));
 * expect(span1.getText()).toBe('Foo');
 *
 * var span2 = element(by.binding('person.email'));
 * expect(span2.getText()).toBe('foo@bar.com');
 *
 * @param {string} bindingDescriptor
 * @return {{findElementsOverride: findElementsOverride, message: string}}
 */
ProtractorBy.prototype.binding = function(bindingDescriptor) {
  return {
    findElementsOverride: function(driver, using) {
      return driver.findElements(
          webdriver.By.js(clientSideScripts.findBindings,
              bindingDescriptor, false, using));
    },
    message: 'by.binding("' + bindingDescriptor + '")'
  };
};

/**
 * Find an element by exact binding.
 *
 * @alias by.exactBinding()
 * Same as by.binding() except this does not allow for partial matches
 *
 * @param {string} bindingDescriptor
 * @return {{findElementsOverride: findElementsOverride, message: string}}
 */
ProtractorBy.prototype.exactBinding = function(bindingDescriptor) {
  return {
    findElementsOverride: function(driver, using) {
      return driver.findElements(
          webdriver.By.js(clientSideScripts.findBindings,
              bindingDescriptor, true, using));
    },
    message: 'by.exactBinding("' + bindingDescriptor + '")'
  };
};

/**
 * Find an element by ng-model expression.
 *
 * @alias by.model(modelName)
 * @view
 * <input type="text" ng-model="person.name"/>
 *
 * @example
 * var input = element(by.model('person.name'));
 * input.sendKeys('123');
 * expect(input.getAttribute('value')).toBe('Foo123');
 *
 * @param {string} model ng-model expression.
 */
ProtractorBy.prototype.model = function(model) {
  return {
    findElementsOverride: function(driver, using) {
      return driver.findElements(
          webdriver.By.js(clientSideScripts.findByModel, model, using));
    },
    message: 'by.model("' + model + '")'
  };
};

/**
 * Find a button by text.
 *
 * @view
 * <button>Save</button>
 *
 * @example
 * element(by.buttonText('Save'));
 *
 * @param {string} searchText
 * @return {{findElementsOverride: findElementsOverride, message: string}}
 */
ProtractorBy.prototype.buttonText = function(searchText) {
  return {
    findElementsOverride: function(driver, using) {
      return driver.findElements(
          webdriver.By.js(clientSideScripts.findByButtonText,
          searchText, using));
    },
    message: 'by.buttonText("' + searchText + '")'
  };
};

/**
 * Find a button by partial text.
 *
 * @view
 * <button>Save my file</button>
 *
 * @example
 * element(by.partialButtonText('Save'));
 *
 * @param {string} searchText
 * @return {{findElementsOverride: findElementsOverride, message: string}}
 */
ProtractorBy.prototype.partialButtonText = function(searchText) {
  return {
    findElementsOverride: function(driver, using) {
      return driver.findElements(
          webdriver.By.js(clientSideScripts.findByPartialButtonText,
          searchText, using));
    },
    message: 'by.partialButtonText("' + searchText + '")'
  };
};


/**
 * Find elements inside an ng-repeat.
 *
 * @view
 * <div ng-repeat="cat in pets">
 *   <span>{{cat.name}}</span>
 *   <span>{{cat.age}}</span>
 * </div>
 *
 * <div class="book-img" ng-repeat-start="book in library">
 *   <img ng-src="{{book.imgUrl}}"></img>
 * </div>
 * <div class="book-info" ng-repeat-end>
 *   <h4>{{book.name}}</h4>
 *   <p>{{book.blurb}}</p>
 * </div>
 *
 * @example
 * // Returns the DIV for the second cat.
 * var secondCat = element(by.repeater('cat in pets').row(1));
 *
 * // Returns the SPAN for the first cat's name.
 * var firstCatName = element(by.repeater('cat in pets').
 *     row(0).column('{{cat.name}}'));
 *
 * // Returns a promise that resolves to an array of WebElements from a column
 * var ages = element.all(
 *     by.repeater('cat in pets').column('{{cat.age}}'));
 *
 * // Returns a promise that resolves to an array of WebElements containing
 * // all top level elements repeated by the repeater. For 2 pets rows resolves
 * // to an array of 2 elements.
 * var rows = element.all(by.repeater('cat in pets'));
 *
 * // Returns a promise that resolves to an array of WebElements containing all
 * // the elements with a binding to the book's name.
 * var divs = element.all(by.repeater('book in library').column('book.name'));
 *
 * // Returns a promise that resolves to an array of WebElements containing
 * // the DIVs for the second book.
 * var bookInfo = element.all(by.repeater('book in library').row(1));
 *
 * // Returns the H4 for the first book's name.
 * var firstBookName = element(by.repeater('book in library').
 *     row(0).column('{{book.name}}'));
 *
 * // Returns a promise that resolves to an array of WebElements containing
 * // all top level elements repeated by the repeater. For 2 books divs
 * // resolves to an array of 4 elements.
 * var divs = element.all(by.repeater('book in library'));
 */
ProtractorBy.prototype.repeater = function(repeatDescriptor) {
  return {
    findElementsOverride: function(driver, using) {
      return driver.findElements(
        webdriver.By.js(clientSideScripts.findAllRepeaterRows,
            repeatDescriptor, using));
    },
    message: 'by.repeater("' + repeatDescriptor + '")',
    row: function(index) {
      return {
        findElementsOverride: function(driver, using) {
          return driver.findElements(
            webdriver.By.js(clientSideScripts.findRepeaterRows,
                repeatDescriptor, index, using));
        },
        message: 'by.repeater(' + repeatDescriptor + '").row("' + index + '")"',
        column: function(binding) {
          return {
            findElementsOverride: function(driver, using) {
              return driver.findElements(
                  webdriver.By.js(clientSideScripts.findRepeaterElement,
                      repeatDescriptor, index, binding, using));
            },
            message: 'by.repeater("' + repeatDescriptor + '").row("' + index +
                '").column("' + binding + '")'
          };
        }
      };
    },
    column: function(binding) {
      return {
        findElementsOverride: function(driver, using) {
          return driver.findElements(
              webdriver.By.js(clientSideScripts.findRepeaterColumn,
                  repeatDescriptor, binding, using));
        },
        message: 'by.repeater("' + repeatDescriptor + '").column("' + binding +
            '")',
        row: function(index) {
          return {
            findElementsOverride: function(driver, using) {
              return driver.findElements(
                  webdriver.By.js(clientSideScripts.findRepeaterElement,
                      repeatDescriptor, index, binding, using));
            },
            message: 'by.repeater("' + repeatDescriptor + '").column("' +
                binding + '").row("' + index + '")'
          };
        }
      };
    }
  };
};

/**
 * Find elements by CSS which contain a certain string.
 *
 * @view
 * <ul>
 *   <li class="pet">Dog</li>
 *   <li class="pet">Cat</li>
 * </ul>
 *
 * @example
 * // Returns the DIV for the dog, but not cat.
 * var dog = element(by.cssContainingText('.pet', 'Dog'));
 */
ProtractorBy.prototype.cssContainingText = function(cssSelector, searchText) {
  return {
    findElementsOverride: function(driver, using) {
      return driver.findElements(
        webdriver.By.js(clientSideScripts.findByCssContainingText,
        cssSelector, searchText, using));
    },
    message: 'by.cssContainingText("' + cssSelector + '", "' + searchText + '")'
  };
};

exports.ProtractorBy = ProtractorBy;
