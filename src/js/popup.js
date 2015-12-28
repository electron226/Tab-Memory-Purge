(function(window, document) {
  "use strict";

  const sElRelease          = document.querySelector('#release');
  const sElRestore          = document.querySelector('#restore_release');
  const sElNotRelease       = document.querySelector('#not_release');
  const sElRemoveNotRelease = document.querySelector('#remove_not_release');
  const sElNotReleaseText   = sElNotRelease.querySelector('span');
  const sElRemoveNotReleaseText = sElRemoveNotRelease.querySelector('span');

  const sStrNotRelease       = chrome.i18n.getMessage('not_release');
  const sStrRemoveNotRelease = chrome.i18n.getMessage('remove_not_release');
  const sStrNotReleaseHost   = chrome.i18n.getMessage('not_release_host');
  const sStrRemoveNotReleaseHost =
    chrome.i18n.getMessage('remove_not_release_host');

  var sObjPressKey = null;

  if (typeof sElRelease !== 'object' ||
      typeof sElRestore !== 'object' ||
      typeof sElNotRelease !== 'object' ||
      typeof sElRemoveNotRelease !== 'object') {
    throw new Error(
      "Doesn't find the elements that want to use in the script.");
  }

  function updateButtonState()//{{{
  {
    return updatePurgeOrRestoreButton()
           .then(updateNotReleaseButton);
  }//}}}

  document.addEventListener('keyup', () => {
    sObjPressKey = null;

    sElNotReleaseText.textContent       = sStrNotReleaseHost;
    sElRemoveNotReleaseText.textContent = sStrRemoveNotReleaseHost;
  });

  document.addEventListener('keydown', pEvent => {
    if (sObjPressKey === null) {
      sObjPressKey = keyCheck(pEvent);
      if (sObjPressKey.ctrl === true) {
        sElNotReleaseText.textContent       = sStrNotRelease;
        sElRemoveNotReleaseText.textContent = sStrRemoveNotRelease;
      }
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    initButtons()
    .then(loadTranslation(document, gStrTranslationPath))
    .then(updateButtonState)
    .catch(e => console.error(e));
  }, true);

  function getCurrentIconState()//{{{
  {
    return new Promise((resolve, reject) => {
      chrome.tabs.query(
        { active: true, currentWindow: true }, tabs => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
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
    return new Promise(resolve => {
      getCurrentIconState()
      .then(pNumIconValue => {
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
          reject(new Error(chrome.runtime.lastError.message));
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
    var lElMenu        = document.createDocumentFragment();
    var lObjCreateTab  = {};
    var lStrClassName  = "";
    var lStrId         = "";
    var lStrErrMsg     = "";
    var lBoolPressCtrl = false;
    var lBoolDelete    = false;

    lStrErrMsg = checkFunctionArguments(arguments, [
      function(pValue) { return (typeof pValue !== 'object'); },
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

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
    case 'remove_not_release':
      lBoolDelete = true;
      /* falls through */
    case 'not_release':
      lBoolPressCtrl = sObjPressKey !== null &&
                       sObjPressKey.hasOwnProperty('ctrl') &&
                       sObjPressKey.ctrl === true;
      chrome.runtime.sendMessage({
        event:   'switch_not_release',
        type:    lBoolDelete ? 'delete' : 'add',
        addType: lBoolPressCtrl ? 'url' : 'host',
      });
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
    case 'clear_temporary_exclusion_list':
      chrome.runtime.sendMessage({ event: lStrId });
      updateButtonState();
      break;
    default:
      chrome.runtime.sendMessage({ event: lStrId });
      popupClose();
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
