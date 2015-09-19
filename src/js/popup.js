(function(window, document) {
  "use strict";

  document.addEventListener('DOMContentLoaded', () => {
    initButtons()
    .then(loadTranslation(document, translationPath))
    .catch(e => {
      console.error(
        "Doesn't initialize the translation correctly.\n error: %s", e);
    });
  }, true);

  window.addEventListener('load', () => {
    updatePurgeOrRestoreButton()
    .then(updateNotReleaseButton);
  });

  function updatePurgeOrRestoreButton()
  {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { event: 'current_icon' }, iconValue => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError.messsage);
            return;
          }

          var p = document.querySelector('div[name="release"]');
          var r = document.querySelector('div[name="restore_release"]');
          if (p === null || r === null) {
            reject("fail updatePurgeOrRestoreButton function. " +
                   "Doesn't find release and restore.");
            return;
          }

          if (iconValue & (USE_EXCLUDE | NORMAL | TEMP_EXCLUDE)) {
            p.style.display = 'block';
            r.style.display = 'none';
          } else {
            p.style.display = 'none';
            r.style.display = 'block';
          }

          resolve();
        }
      );
    });
  }

  function updateNotReleaseButton()
  {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { event: 'current_icon' }, iconValue => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError.messsage);
          return;
        }

        var nr = document.querySelector('div[name="not_release"]');
        var rnr = document.querySelector('div[name="remove_not_release"]');
        if (nr === null || rnr === null) {
          reject("fail updateNotReleaseButton function. " +
                 "Doesn't find not_release and remove_not_release.");
          return;
        }

        if (iconValue & (USE_EXCLUDE | EXTENSION_EXCLUDE)) {
          nr.style.display = 'none';
          rnr.style.display = 'none';
        } else if (iconValue & TEMP_EXCLUDE) {
          nr.style.display = 'none';
          rnr.style.display = 'block';
        } else {
          rnr.style.display = 'none';
          nr.style.display = 'block';
        }
        resolve();
      });
    });
  }

  function popupClose()
  {
    window.close();
  }

  function buttonClicked(event)
  {
    var i, m, s;
    var name = event.target.getAttribute('name');

    switch (name) {
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
      chrome.runtime.sendMessage({ event: 'release' }, popupClose);
      break;
    case 'not_release':
    case 'remove_not_release':
      chrome.runtime.sendMessage({ event: 'switch_not_release' }, popupClose);
      break;
    case 'switchTimer':
      chrome.runtime.sendMessage({ event: 'switchTimerState' }, popupClose);
      break;
    case 'add_current_tab_exclude_list':
      chrome.runtime.sendMessage({ event: 'excludeDialogMenu' }, popupClose);
      break;
    case 'normal':
    case 'keybind':
    case 'history':
    case 'session_history':
    case 'change_history':
    case 'information':
    case 'operate_settings':
      chrome.tabs.query({ url: optionPage + '*' }, results => {
        var url = optionPage + '?page=' + name;
        if (results.length === 0) {
          chrome.tabs.create({ url: url }, popupClose);
        } else {
          chrome.tabs.update(results[0].tabId, { url: url }, popupClose);
        }
      });
      break;
    default:
      chrome.runtime.sendMessage({ event: name }, popupClose);
      break;
    }
  }

  function initButtons()
  {
    return new Promise(function(resolve) {
      var buttons = document.querySelectorAll('div.btn');
      var i, j, el, inAll;
      for (i = 0; i < buttons.length; i = (i + 1) | 0) {
        el = buttons[i];
        el.addEventListener('click', buttonClicked, true);

        // The elements of the all are setting name into item.
        inAll = el.querySelectorAll('*');
        for (j = 0; j < inAll.length; j = (j + 1) | 0) {
          if (!(inAll[j].getAttribute('name'))) {
            inAll[j].setAttribute('name', el.getAttribute('name'));
          }
        }
      }
      resolve();
    });
  }
})(this, this.document);
