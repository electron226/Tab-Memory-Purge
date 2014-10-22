/*jshint forin: true*/
/*global keyCheck: true, compareObject: true */
(function() {
  "use strict";

  document.addEventListener('keyup', function(e) {
    var currentFocus = document.activeElement;
    var activeElementName = currentFocus.tagName.toLowerCase();
    if (activeElementName === 'input' || activeElementName === 'textarea') {
      return;
    }

    chrome.storage.local.get(null, function(items) {
      var keys = {};
      var command = ['release', 'switch_not_release', 'all_unpurge', 'restore'];
      var stName;
      for (var i = 0; i < command.length; i++) {
        stName = command[i] + '_keybind';
        keys[command[i]] = JSON.parse(items[stName] || defualtValues[stName]);
      }

      var pushKey = keyCheck(e);
      for (var key in keys) {
        if (compareObject(keys[key], pushKey)) {
          chrome.runtime.sendMessage({ event: key });
        }
      }
    });
  });

  console.log('Loading keybinds of Tab Memory Purge.');
})(document);
