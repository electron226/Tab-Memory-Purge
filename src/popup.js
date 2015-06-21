(function(window, document) {
  "use strict";

  document.addEventListener('DOMContentLoaded', function() {
    initButtons()
    .then(updatePurgeOrRestoreButton)
    .then(updateNotReleaseButton)
    .then(loadTranslation(document, translationPath))
    .catch(function(e) {
      error("Doesn't initialize the translation correctly.\n error: %s", e);
    });
  }, true);

  function updatePurgeOrRestoreButton()
  {
    return new Promise(function(resolve, reject) {
      chrome.runtime.sendMessage(
        { event: 'current_icon' }, function(iconValue) {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError.messsage);
            return;
          }

          let p = document.querySelector('div[name="release"]');
          let r = document.querySelector('div[name="restore_release"]');
          if (p === null || r === null) {
            reject("fail updatePurgeOrRestoreButton function. " +
                   "Doesn't find release and restore.");
            return;
          }

          if (iconValue & USE_EXCLUDE) {
            p.style.display = 'none';
            r.style.display = 'none';
          } else if (iconValue & (NORMAL | TEMP_EXCLUDE)) {
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
    return new Promise(function(resolve, reject) {
      chrome.runtime.sendMessage(
        { event: 'current_icon' }, function(iconValue) {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError.messsage);
          return;
        }

        let nr = document.querySelector('div[name="not_release"]');
        let rnr = document.querySelector('div[name="remove_not_release"]');
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

  function buttonClicked(event)
  {
    let m, s;
    let name = event.target.getAttribute('name');

    switch (name) {
    case 'option_prev':
      m = document.querySelectorAll('.menu');
      debug(m);
      for (let i = 0; i < m.length; i++) {
        s = m[i].getAttribute('class').replace('option_menu', '').trim();
        m[i].setAttribute('class', s);
      }
      return; // return.
    case 'option_menu':
      m = document.querySelectorAll('.menu');
      for (let i = 0; i < m.length; i++) {
        s = m[i].getAttribute('class');
        m[i].setAttribute('class', s + ' ' + 'option_menu');
      }
      return; // return.
    case 'restore_release':
      chrome.runtime.sendMessage({ event: 'release' });
      break;
    case 'not_release':
    case 'remove_not_release':
      chrome.runtime.sendMessage({ event: 'switch_not_release' });
      break;
    default:
      chrome.runtime.sendMessage({ event: name });
      break;
    }
    window.close();
  }

  function initButtons()
  {
    return new Promise(function(resolve) {
      let buttons = document.querySelectorAll('div.btn');
      let el, inAll;
      for (let i = 0; i < buttons.length; i++) {
        el = buttons[i];
        el.addEventListener('click', buttonClicked, true);

        // The elements of the all are setting name into item.
        inAll = el.querySelectorAll('*');
        for (let j = 0; j < inAll.length; j++) {
          if (!(inAll[j].getAttribute('name'))) {
            inAll[j].setAttribute('name', el.getAttribute('name'));
          }
        }
      }
      resolve();
    });
  }
})(window, document);
