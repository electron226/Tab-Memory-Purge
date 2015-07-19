/*global keyCheck: true */
(function(window, document) {
  "use strict";

  function getKeyBinds()
  {
    return new Promise(function(resolve, reject) {
      chrome.storage.local.get(null, function(items) {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError.messsage);
          return;
        }

        let keyInfo;
        let keys = {};
        for (let keyName in items) {
          if (items.hasOwnProperty(keyName) &&
              keyName.indexOf('keybind_') !== -1) {
            try {
              keyInfo = JSON.parse(items[keyName]);
              if (toType(keyInfo) !== 'object') {
                continue;
              }

              keys[keyName] = items[keyName] || defaultValues[keyName];
            } catch (e) {
              continue;
            }
          }
        }

        resolve(keys);
      });
    });
  }

  document.addEventListener('keyup', function(e) {
    let currentFocus = document.activeElement;
    let activeElementName = currentFocus.tagName.toLowerCase();
    if (activeElementName === 'input' || activeElementName === 'textarea') {
      return;
    }

    chrome.runtime.sendMessage(
      { event: 'keybind_check_exclude_list', location: window.location },
      function(result) {
        if (result) {
          getKeyBinds()
          .then(function(keys) {
            let pushKey = JSON.stringify(keyCheck(e));

            for (let key in keys) {
              if (keys.hasOwnProperty(key) && keys[key] === pushKey) {
                chrome.runtime.sendMessage(
                  { event: key.replace(/^keybind_/, '') });
              }
            }
          })
          .catch(function(e) {
            console.error(e);
          });
        } else {
          console.error('Tab Memory Purge: This url contain the exclude list.');
        }
      }
    );
  });

  console.log('Loading keybinds of Tab Memory Purge.');
})(this, this.document);
