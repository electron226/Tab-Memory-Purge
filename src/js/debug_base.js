(function(window){
  "use strict";

  //var debugMode = true;
  var debugMode = @@debugMode;

  // all debug methods.
  var debugMethods = [
    'log',
    'debug',
    'info',
    'warn',
    'error',
    'dir',
    'trace',
    'assert',
    'dirxml',
    'group',
    'groupEnd',
    'time',
    'timeEnd',
    'count',
    'profile',
    'profileEnd',
  ];

  // The methods change behavior in value.
  var changeMethods = [
    'log',
    'debug',
    'info',
    'warn',
    'dir',
    'trace',
    'assert',
    'dirxml',
    'group',
    'groupEnd',
    'time',
    'timeEnd',
    'count',
    'profile',
    'profileEnd',
  ];

  // The methods don't change behavior in value.
  var notChangeMethods = debugMethods.filter(function(v) {
    for (var i = 0, len = changeMethods.length; i < len; i++) {
      if (v === changeMethods[i]) {
        return false;
      }
    }
    return true;
  });

  if (window.console === undefined) {
    window.console = {};
  }

  function setDebugMethods(m, debugMode) {
    if (console[m] && debugMode && typeof console[m] === 'function') {
      window[m] = (function() {
        return console[m].bind(console);
      })();
    } else {
      window[m] = function() {};
    }
  }

  notChangeMethods.forEach(function(v) {
    setDebugMethods(v, true);
  });

  changeMethods.forEach(function(v) {
    setDebugMethods(v, debugMode);
  });
})(window);
