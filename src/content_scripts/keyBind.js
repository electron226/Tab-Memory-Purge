/*global keyCheck: true */
(function() {
  "use strict";

  function getKeyBinds(callback)
  {
    var storageName = 'keybind';
    chrome.storage.local.get(storageName, function(items) {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.messsage);
        return;
      }

      var keys = {};
      angular.forEach(items[storageName], function(value, key) {
        keys[key] = value || defaultValues.keybind[key];
      });

      (callback || angular.noop)(keys);
    });
  }

  document.addEventListener('keyup', function(e) {
    var currentFocus = document.activeElement;
    var activeElementName = currentFocus.tagName.toLowerCase();
    if (activeElementName === 'input' || activeElementName === 'textarea') {
      return;
    }

    chrome.runtime.sendMessage(
      { event: 'keybind_check_exclude_list', location: window.location },
      function(result) {
        if (result === true) {
          getKeyBinds(function(keys) {
            var pushKey = angular.toJson(keyCheck(e));
            angular.forEach(keys, function(value, key) {
              if (angular.equals(value, pushKey)) {
                chrome.runtime.sendMessage({ event: key });
              }
            });
          });
        } else {
          console.error('Tab Memory Purge: This url contain the exclude list.');
        }
      }
    );
  });

  console.log('Loading keybinds of Tab Memory Purge.');
})(document);
