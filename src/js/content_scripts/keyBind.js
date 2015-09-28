(function(window, document) {
  "use strict";

  function getKeyBinds()//{{{
  {
    return new Promise((resolve, reject) => {
      var lMapKeys    = new Map();
      var lObjKeyInfo = {};

      chrome.storage.local.get(null, pObjItems => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.messsage));
          return;
        }

        lMapKeys = new Map();
        Object.keys(pObjItems).forEach(pKey => {
          if (pKey.indexOf('keybind_') !== -1) {
            try {
              lObjKeyInfo = JSON.parse(pObjItems[pKey]);
              if (toType(lObjKeyInfo) !== 'object') {
                return;
              }

              lMapKeys.set(
                pKey, pObjItems[pKey] || gMapDefaultValues.get(pKey));
            } catch (e) {
              return;
            }
          }
        });

        resolve(lMapKeys);
      });
    });
  }//}}}

  document.addEventListener('keyup', pEvent => {//{{{
    var lElCurrentFocus      = document.activeElement;
    var lElActiveElementName = lElCurrentFocus.tagName.toLowerCase();
    if (lElActiveElementName === 'input' ||
        lElActiveElementName === 'textarea') {
      return;
    }

    chrome.runtime.sendMessage(
      { event: 'keybind_check_exclude_list', location: window.location },
      pBoolResult => {
        var pushKey = "";

        if (pBoolResult) {
          getKeyBinds()
          .then(pMapKeys => {
            pushKey = JSON.stringify(keyCheck(pEvent));
            pMapKeys.forEach((pValue, pKey) => {
              if (pValue === pushKey) {
                chrome.runtime.sendMessage(
                  { event: pKey.replace(/^keybind_/, '') });
              }
            });
          })
          .catch(eErr => console.error(eErr));
        } else {
          console.error('Tab Memory Purge: This url contain the exclude list.');
        }
      }
    );
  });//}}}

  console.log('Loading keybinds of Tab Memory Purge.');
})(this, this.document);
