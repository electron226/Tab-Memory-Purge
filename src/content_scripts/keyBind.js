/*global keyCheck: true */
(function(window, document) {
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
      var keybinds = items[storageName];
      for (var key in keybinds) {
        if (keybinds.hasOwnProperty(key)) {
          keys[key] = keybinds[key] || defaultValues.keybind[key];
        }
      }

      (callback || function() {})(keys);
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
        if (result) {
          getKeyBinds(function(keys) {
            var pushKey = JSON.stringify(keyCheck(e));
            for (var key in keys) {
              if (keys[key] === pushKey) {
                chrome.runtime.sendMessage({ event: key });
              }
            }
          });
        } else {
          console.error('Tab Memory Purge: This url contain the exclude list.');
        }
      }
    );
  });

  console.log('Loading keybinds of Tab Memory Purge.');
})(window, document);
