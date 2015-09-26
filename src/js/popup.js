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
    var lStrUrl       = "";
    var lStrClassName = "";
    var lStrId        = "";
    var i             = 0;

    lStrId = pEvent.target.getAttribute('id');
    switch (lStrId) {
    case 'option_prev':
      lElMenu = document.querySelectorAll('.menu');

      i = 0;
      while (i < lElMenu.length) {
        lStrClassName = lElMenu[i].getAttribute('class')
                        .replace('option_menu_show', '').trim();
        lElMenu[i].setAttribute('class', lStrClassName);
        ++i;
      }
      return; // return.
    case 'option_menu':
      lElMenu = document.querySelectorAll('.menu');

      i = 0;
      while (i < lElMenu.length) {
        lStrClassName = lElMenu[i].getAttribute('class');
        lElMenu[i].setAttribute('class', `${lStrClassName} option_menu_show`);
        ++i;
      }
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
        lStrUrl = `${gStrOptionPage}?page=${lStrId}`;
        if (results.length === 0) {
          chrome.tabs.create({ url: lStrUrl }, popupClose);
        } else {
          chrome.tabs.update(results[0].tabId, { url: lStrUrl }, popupClose);
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
      var lElement   = document.createDocumentFragment();
      var lElInAll   = document.createDocumentFragment();
      var i = 0;
      var j = 0;

      lElButtons = document.querySelectorAll('div.btn');
      i = 0;
      while (i < lElButtons.length) {
        lElement = lElButtons[i];
        lElement.addEventListener('click', buttonClicked, true);

        // The elements of the all are setting id into item.
        lElInAll = lElement.querySelectorAll('*');
        j = 0;
        while (j < lElInAll.length) {
          if (!(lElInAll[j].getAttribute('id'))) {
            lElInAll[j].setAttribute('id', lElement.getAttribute('id'));
          }
          ++j;
        }
        ++i;
      }
      resolve();
    });
  }//}}}
})(this, this.document);
