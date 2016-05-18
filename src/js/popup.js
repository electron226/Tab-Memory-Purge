(function(window, document) {
  "use strict";

  const release_element     = document.querySelector('#release');
  const restore_element     = document.querySelector('#restore_release');
  const not_release_element = document.querySelector('#not_release');
  const remove_not_release_element =
    document.querySelector('#remove_not_release');
  const not_releaes_text_element =
    not_release_element.querySelector('span');
  const remove_not_releaes_text_element =
    remove_not_release_element.querySelector('span');

  const not_release        = chrome.i18n.getMessage('not_release');
  const remove_not_release = chrome.i18n.getMessage('remove_not_release');
  const not_release_host   = chrome.i18n.getMessage('not_release_host');
  const remove_not_release_host =
    chrome.i18n.getMessage('remove_not_release_host');

  let press_key = null;

  if (typeof release_element !== 'object' ||
      typeof restore_element !== 'object' ||
      typeof not_release_element !== 'object' ||
      typeof remove_not_release_element !== 'object') {
    throw new Error(
      "Doesn't find the elements that want to use in the script.");
  }

  function updateButtonState()//{{{
  {
    return updatePurgeOrRestoreButton()
             .then(updateNotReleaseButton);
  }//}}}

  document.addEventListener('keyup', () => {
    press_key = null;

    not_releaes_text_element.textContent        = not_release_host;
    remove_not_releaes_text_element.textContent = remove_not_release_host;
  });

  document.addEventListener('keydown', pEvent => {
    if (press_key === null) {
      press_key = keyCheck(pEvent);
      if (press_key.ctrl === true) {
        not_releaes_text_element.textContent        = not_release;
        remove_not_releaes_text_element.textContent = remove_not_release;
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
      .then(pIconValue => {
        if (pIconValue & (USE_EXCLUDE | NORMAL | TEMP_EXCLUDE)) {
          release_element.style.display = 'block';
          restore_element.style.display = 'none';
        } else if (pIconValue & EXTENSION_EXCLUDE) {
          release_element.style.display = 'none';
          restore_element.style.display = 'block';
        } else {
          release_element.style.display = 'none';
          restore_element.style.display = 'none';
        }

        resolve();
      });
    });
  }//}}}

  function updateNotReleaseButton()//{{{
  {
    return new Promise((resolve, reject) => {
      getCurrentIconState()
      .then(pIconValue => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (pIconValue & (USE_EXCLUDE | EXTENSION_EXCLUDE | CHROME_EXCLUDE)) {
          not_release_element.style.display        = 'none';
          remove_not_release_element.style.display = 'none';
        } else if (pIconValue & TEMP_EXCLUDE) {
          not_release_element.style.display        = 'none';
          remove_not_release_element.style.display = 'block';
        } else {
          remove_not_release_element.style.display = 'none';
          not_release_element.style.display        = 'block';
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
    console.assert(toType(pEvent) === 'object', "not object type.");

    let menu_element = document.createDocumentFragment();
    let class_name   = "";
    let is_delete    = false;

    let id_name = pEvent.target.getAttribute('id');
    switch (id_name) {
    case 'option_prev':
      menu_element = document.querySelectorAll('.menu');

      Array.prototype.slice.call(menu_element).forEach(pValue => {
        class_name = pValue.getAttribute('class')
                        .replace('option_menu_show', '').trim();
        pValue.setAttribute('class', class_name);
      });
      return; // return.
    case 'option_menu':
      menu_element = document.querySelectorAll('.menu');

      Array.prototype.slice.call(menu_element).forEach(pValue => {
        class_name = pValue.getAttribute('class');
        pValue.setAttribute('class', `${class_name} option_menu_show`);
      });
      return; // return.
    case 'restore_release':
      chrome.runtime.sendMessage({ event: 'release' });
      popupClose();
      break;
    case 'remove_not_release':
      is_delete = true;
      /* falls through */
    case 'not_release':
      {
        let press_ctrl = press_key !== null &&
                         press_key.hasOwnProperty('ctrl') &&
                         press_key.ctrl === true;
        chrome.runtime.sendMessage({
          event:   'switch_not_release',
          type:    is_delete ? 'delete' : 'add',
          addType: press_ctrl ? 'url' : 'host',
        });
        popupClose();
        break;
      }
    case 'normal':
    case 'keybind':
    case 'popup':
    case 'history':
    case 'session_history':
    case 'change_history':
    case 'information':
    case 'operate_settings':
      chrome.tabs.query({ url: gStrOptionPage + '*' }, results => {
        let create_tab = {
          url:    `${gStrOptionPage}?page=${id_name}`,
          active: true,
        };

        if (results.length === 0) {
          chrome.tabs.create(create_tab, popupClose);
        } else {
          chrome.tabs.update(results[0].id, create_tab, popupClose);
        }
      });
      break;
    case 'clear_temporary_exclusion_list':
      chrome.runtime.sendMessage({ event: id_name });
      updateButtonState();
      break;
    default:
      chrome.runtime.sendMessage({ event: id_name });
      popupClose();
      break;
    }
  }//}}}

  function initButtons()//{{{
  {
    return new Promise(resolve => {
      let button_elements = document.querySelectorAll('div.btn');
      Array.prototype.slice.call(button_elements).forEach(pValue => {
        pValue.addEventListener('click', buttonClicked, true);

        // The elements of the all are setting id into item.
        let all_elements = pValue.querySelectorAll('*');
        Array.prototype.slice.call(all_elements).forEach(pValueJ => {
          if (!(pValueJ.getAttribute('id'))) {
            pValueJ.setAttribute('id', pValue.getAttribute('id'));
          }
        });
      });
      resolve();
    });
  }//}}}
})(this, this.document);
