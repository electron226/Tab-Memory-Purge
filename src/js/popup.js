(function(window, document) {
  "use strict";

  var release = document.querySelector('#release');
  var restore = document.querySelector('#restore_release');
  var not_release = document.querySelector('#not_release');
  var removeNotRelease = document.querySelector('#remove_not_release');

  document.addEventListener('DOMContentLoaded', () => {
    initButtons()
    .then(loadTranslation(document, translationPath))
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
      .then(iconValue => {
        if (release === null || restore === null) {
          reject(new Error("fail updatePurgeOrRestoreButton function. " +
                 "Doesn't find release and restore."));
          return;
        }

        if (iconValue & (USE_EXCLUDE | NORMAL | TEMP_EXCLUDE)) {
          release.style.display = 'block';
          restore.style.display = 'none';
        } else if (iconValue & EXTENSION_EXCLUDE) {
          release.style.display = 'none';
          restore.style.display = 'block';
        } else {
          release.style.display = 'none';
          restore.style.display = 'none';
        }

        resolve();
      });
    });
  }//}}}

  function updateNotReleaseButton()//{{{
  {
    return new Promise((resolve, reject) => {
      getCurrentIconState()
      .then(iconValue => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError));
          return;
        }

        if (not_release === null || removeNotRelease === null) {
          reject("fail updateNotReleaseButton function. " +
                 "Doesn't find not_release and remove_not_release.");
          return;
        }

        if (iconValue & (USE_EXCLUDE | EXTENSION_EXCLUDE | CHROME_EXCLUDE)) {
          not_release.style.display      = 'none';
          removeNotRelease.style.display = 'none';
        } else if (iconValue & TEMP_EXCLUDE) {
          not_release.style.display      = 'none';
          removeNotRelease.style.display = 'block';
        } else {
          removeNotRelease.style.display = 'none';
          not_release.style.display      = 'block';
        }
        resolve();
      });
    });
  }//}}}

  function popupClose()//{{{
  {
    window.close();
  }//}}}

  function buttonClicked(event)//{{{
  {
    var i, m, s;
    var id = event.target.getAttribute('id');

    switch (id) {
    case 'option_prev':
      m = document.querySelectorAll('.menu');
      for (i = 0; i < m.length; i = (i + 1) | 0) {
        s = m[i].getAttribute('class').replace('option_menu_show', '').trim();
        m[i].setAttribute('class', s);
      }
      return; // return.
    case 'option_menu':
      m = document.querySelectorAll('.menu');
      for (i = 0; i < m.length; i = (i + 1) | 0) {
        s = m[i].getAttribute('class');
        m[i].setAttribute('class', s + ' ' + 'option_menu_show');
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
      chrome.tabs.query({ url: optionPage + '*' }, results => {
        var url = optionPage + '?page=' + id;
        if (results.length === 0) {
          chrome.tabs.create({ url: url }, popupClose);
        } else {
          chrome.tabs.update(results[0].tabId, { url: url }, popupClose);
        }
      });
      break;
    default:
      chrome.runtime.sendMessage({ event: id }, popupClose);
      break;
    }
  }//}}}

  function initButtons()//{{{
  {
    return new Promise(function(resolve) {
      var buttons = document.querySelectorAll('div.btn');
      var i, j, el, inAll;
      for (i = 0; i < buttons.length; i = (i + 1) | 0) {
        el = buttons[i];
        el.addEventListener('click', buttonClicked, true);

        // The elements of the all are setting id into item.
        inAll = el.querySelectorAll('*');
        for (j = 0; j < inAll.length; j = (j + 1) | 0) {
          if (!(inAll[j].getAttribute('id'))) {
            inAll[j].setAttribute('id', el.getAttribute('id'));
          }
        }
      }
      resolve();
    });
  }//}}}
})(this, this.document);
