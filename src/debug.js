(function(window){
  "use strict";

  var debugMode = false;

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

  if (window.console === undefined) {
    window.console = {};
  }

  function setDebugMethods(m) {
    if (console[m] && debugMode && typeof console[m] === 'function') {
      window[m] = (function() {
        return console[m].bind(console);
      })();
    } else {
      window[m] = function() {};
    }
  }

  debugMethods.forEach(function(v) {
    setDebugMethods(v);
  });
})(window);
