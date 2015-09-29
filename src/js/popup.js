(function(window, document) {
  "use strict";

  var sElRelease          = document.querySelector('#release');
  var sElRestore          = document.querySelector('#restore_release');
  var sElNotRelease       = document.querySelector('#not_release');
  var sElRemoveNotRelease = document.querySelector('#remove_not_release');

  document.addEventListener('DOMContentLoaded', () => {
    initButtons()
    .then(loadTranslation(document, gStrTranslationPath))
    .then(updatePurgeOrRestoreButton)
    .then(updateNotReleaseButton)
    .catch(e => console.error(e));
  }, true);

  function getCurrentIconState()//{{{
  {
    return new Promise((resolve, reject) => {
      chrome.tabs.query(
        { active: true, currentWindow: true }, tabs => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError));
            return;
          }

          chrome.runtime.sendMessage(
            { event: 'get_icon_state', tabId: tabs[0].id }, state => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError));
                return;
              }
              resolve(state);
            }
          );
        }
      );
    });
  }//}}}

  function updatePurgeOrRestoreButton()//{{{
  {
    return new Promise((resolve, reject) => {
      getCurrentIconState()
      .then(pNumIconValue => {
        if (sElRelease === null || sElRestore === null) {
          reject(new Error("fail updatePurgeOrRestoreButton function. " +
                 "Doesn't find release and restore."));
          return;
        }

        if (pNumIconValue & (USE_EXCLUDE | NORMAL | TEMP_EXCLUDE)) {
          sElRelease.style.display = 'block';
          sElRestore.style.display = 'none';
        } else if (pNumIconValue & EXTENSION_EXCLUDE) {
          sElRelease.style.display = 'none';
          sElRestore.style.display = 'block';
        } else {
          sElRelease.style.display = 'none';
          sElRestore.style.display = 'none';
        }

        resolve();
      });
    });
  }//}}}

  function updateNotReleaseButton()//{{{
  {
    return new Promise((resolve, reject) => {
      getCurrentIconState()
      .then(pNumIconValue => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError));
          return;
        }

        if (sElNotRelease === null || sElRemoveNotRelease === null) {
          reject("fail updateNotReleaseButton function. " +
                 "Doesn't find sElNotRelease and sElRemoveNotRelease.");
          return;
        }

        if (pNumIconValue &
            (USE_EXCLUDE | EXTENSION_EXCLUDE | CHROME_EXCLUDE)) {
          sElNotRelease.style.display       = 'none';
          sElRemoveNotRelease.style.display = 'none';
        } else if (pNumIconValue & TEMP_EXCLUDE) {
          sElNotRelease.style.display       = 'none';
          sElRemoveNotRelease.style.display = 'block';
        } else {
          sElRemoveNotRelease.style.display = 'none';
          sElNotRelease.style.display       = 'block';
        }
        resolve();
      });
    });
  }//}}}

  function popupClose()//{{{
  {
    window.close();
  }//}}}

  function buttonClicked(pEvent)//{{{
  {
    var lElMenu       = document.createDocumentFragment();
    var lStrClassName = "";
    var lStrId        = "";
    var lObjCreateTab = {};

    lStrId = pEvent.target.getAttribute('id');
    switch (lStrId) {
    case 'option_prev':
      lElMenu = document.querySelectorAll('.menu');

      Array.prototype.slice.call(lElMenu).forEach(pValue => {
        lStrClassName = pValue.getAttribute('class')
                        .replace('option_menu_show', '').trim();
        pValue.setAttribute('class', lStrClassName);
      });
      return; // return.
    case 'option_menu':
      lElMenu = document.querySelectorAll('.menu');

      Array.prototype.slice.call(lElMenu).forEach(pValue => {
        lStrClassName = pValue.getAttribute('class');
        pValue.setAttribute('class', `${lStrClassName} option_menu_show`);
      });
      return; // return.
    case 'restore_release':
      chrome.runtime.sendMessage({ event: 'release' });
      popupClose();
      break;
    case 'not_release':
    case 'remove_not_release':
      chrome.runtime.sendMessage({ event: 'switch_not_release' });
      popupClose();
      break;
    case 'switchTimer':
      chrome.runtime.sendMessage({ event: 'switchTimerState' });
      popupClose();
      break;
    case 'add_current_tab_exclude_list':
      chrome.runtime.sendMessage({ event: 'excludeDialogMenu' });
      popupClose();
      break;
    case 'normal':
    case 'keybind':
    case 'history':
    case 'session_history':
    case 'change_history':
    case 'information':
    case 'operate_settings':
      chrome.tabs.query({ url: gStrOptionPage + '*' }, results => {
        lObjCreateTab = {
          url:    `${gStrOptionPage}?page=${lStrId}`,
          active: true,
        };

        if (results.length === 0) {
          chrome.tabs.create(lObjCreateTab, popupClose);
        } else {
          chrome.tabs.update(results[0].id, lObjCreateTab, popupClose);
        }
      });
      break;
    default:
      chrome.runtime.sendMessage({ event: lStrId }, popupClose);
      break;
    }
  }//}}}

  function initButtons()//{{{
  {
    return new Promise(resolve => {
      var lElButtons = document.createDocumentFragment();
      var lElInAll   = document.createDocumentFragment();

      lElButtons = document.querySelectorAll('div.btn');
      Array.prototype.slice.call(lElButtons).forEach(pValue => {
        pValue.addEventListener('click', buttonClicked, true);

        // The elements of the all are setting id into item.
        lElInAll = pValue.querySelectorAll('*');
        Array.prototype.slice.call(lElInAll).forEach(pValueJ => {
          if (!(pValueJ.getAttribute('id'))) {
            pValueJ.setAttribute('id', pValue.getAttribute('id'));
          }
        });
      });
      resolve();
    });
  }//}}}
})(this, this.document);
