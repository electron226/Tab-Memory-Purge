(function(window, document) {
  "use strict";

  function getKeyBinds()//{{{
  {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(null, pItems => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.messsage));
          return;
        }

        let keys = new Map();
        Object.keys(pItems).forEach(pKey => {
          if (pKey.indexOf('keybind_') !== -1) {
            try {
              let key_info = JSON.parse(pItems[pKey]);
              if (toType(key_info) !== 'object') {
                return;
              }

              keys.set(pKey, pItems[pKey] || gMapDefaultValues.get(pKey));
            } catch (e) {
              return;
            }
          }
        });

        resolve(keys);
      });
    });
  }//}}}

  document.addEventListener('keyup', pEvent => {//{{{
    let current_focus_element = document.activeElement;
    let active_element_name   = current_focus_element.tagName.toLowerCase();
    if (active_element_name === 'input' ||
        active_element_name === 'textarea') {
      return;
    }

    chrome.runtime.sendMessage(
      { event: 'keybind_check_exclude_list', location: window.location },
      pResult => {
        if (pResult) {
          getKeyBinds()
          .then(pKeys => {
            let pushKey = JSON.stringify(keyCheck(pEvent));
            pKeys.forEach((pValue, pKey) => {
              if (pValue === pushKey) {
                chrome.runtime.sendMessage(
                  { event: pKey.replace(/^keybind_/, '') });
              }
            });
          })
          .catch(e => console.error(e));
        } else {
          console.error('Tab Memory Purge: This url contain the exclude list.');
        }
      }
    );
  });//}}}

  console.log('Loading keybinds of Tab Memory Purge.');
})(this, this.document);
