(function(window, document) {
  "use strict";

  function getKeyBinds()//{{{
  {
    return new Promise((resolve, reject) => {
      var lMapKeys    = new Map();
      var lObjKeyInfo = {};
      var lStrKeyName = "";

      chrome.storage.local.get(null, pObjItems => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.messsage));
          return;
        }

        lMapKeys = new Map();
        for (lStrKeyName in pObjItems) {
          if (pObjItems.hasOwnProperty(lStrKeyName) &&
              lStrKeyName.indexOf('keybind_') !== -1) {
            try {
              lObjKeyInfo = JSON.parse(pObjItems[lStrKeyName]);
              if (toType(lObjKeyInfo) !== 'object') {
                continue;
              }

              lMapKeys.set(lStrKeyName,
                pObjItems[lStrKeyName] || gMapDefaultValues.get(lStrKeyName));
            } catch (e) {
              continue;
            }
          }
        }

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
        var iter    = null;
        var i       = null;

        if (pBoolResult) {
          getKeyBinds()
          .then(pMapKeys => {
            pushKey = JSON.stringify(keyCheck(pEvent));
            iter    = pMapKeys.entries();
            i       = iter.next();
            while (!i.done) {
              if (i.value[1] === pushKey) {
                chrome.runtime.sendMessage(
                  { event: i.value[0].replace(/^keybind_/, '') });
              }
              i = iter.next();
            }
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
