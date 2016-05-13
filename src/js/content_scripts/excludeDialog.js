(function(window, document) {
  "use strict";

  //{{{ variable in script.
  const STYLE_BASE_FONT_SIZE      = '12px';
  const STYLE_FONT_COLOR          = '#212121';
  const STYLE_PRIMARY_COLOR       = '#03A9F4';
  const STYLE_LIGHT_PRIMARY_COLOR = '#BBDEFB';
  const BORDER_COLOR              = '#727272';

  const HOST_NAME = window.location.hostname;
  const PATH_NAME = '';

  const HOSTS = getHosts();
  const PATHS = getPathNames();

  const PARENT_WIDTH = '42em';
  const PARENT_HEIGHT = '32em';

  // idNames
  const ID_NAME_OF_TARGET_URL   = "_TMP_ADDURL";

  // main elements.
  let parent_element      = document.createDocumentFragment();
  let body_element        = document.getElementsByTagName('body')[0];
  let br_base_element     = document.createElement('br');
  let div_base_element    = document.createElement('div');
  let span_base_element   = document.createElement('span');
  let button_base_element = document.createElement('button');
  let input_base_element  = document.createElement('input');
  initTextStyle(div_base_element);
  initTextStyle(span_base_element);
  initTextStyle(button_base_element);
  initTextStyle(input_base_element);
  input_base_element.type           = 'range';
  input_base_element.style.position = "relative";
  input_base_element.style.top      = "0.4em";
  //}}}

  function getNumber(pTarget) {//{{{
    let results = pTarget.match(/(\d+)/);
    if (results === null) {
      throw new Error("Doesn't get width and height.");
    } else {
      return parseInt(results[1], 10);
    }
  }//}}}

  function getPathNames()//{{{
  {
    let replaced_path_name = window.location.pathname.replace(/(^\/|\/$)/g, '');
    let path_names         = replaced_path_name.split('/');
    if (path_names && replaced_path_name.length > 0) {
      return path_names;
    } else {
      return null;
    }
  }//}}}

  function getHosts()//{{{
  {
    let regex_host = /^(\w+)[.]+(.*):*(\d*)/i;
    let host_match = window.location.hostname.match(regex_host);
    if (host_match) {
      return host_match.filter((v, i) => (i !== 0 && v !== ""));
    } else {
      return [ window.location.hostname ];
    }
  }//}}}

  function initTextStyle(pElement)//{{{
  {
    pElement.style.fontFamily = 'sans-serif';
    pElement.style.fontSize   = STYLE_BASE_FONT_SIZE;
    textStyleLikeAdobe(pElement);
  }//}}}

  function textStyleLikeAdobe(pElement)//{{{
  {
    pElement.style.color      = STYLE_FONT_COLOR;
    pElement.style.textshadow = `0 0 1px rgba(${STYLE_FONT_COLOR}, .1)`;
    pElement.style.fontSmoothing = 'antialiased';
  }//}}}

  function createParentElement()//{{{
  {
    let parent_div = div_base_element.cloneNode();
    parent_div.style.position   = 'fixed';
    parent_div.style.background = STYLE_LIGHT_PRIMARY_COLOR;
    parent_div.style.boxShadow  = `0px 1px 3px 0 ${BORDER_COLOR}`;
    parent_div.style.width      = PARENT_WIDTH;
    parent_div.style.height     = PARENT_HEIGHT;
    parent_div.style.display    = 'none';
    parent_div.style.zIndex     = '100';

    parent_div.style.left =
      (window.innerWidth - (getNumber(parent_div.style.width) *
      getNumber(STYLE_BASE_FONT_SIZE))) / 2.0 + 'px';
    parent_div.style.top =
      (window.innerHeight - (getNumber(parent_div.style.height) *
      getNumber(STYLE_BASE_FONT_SIZE))) / 2.0 + 'px';

    return parent_div;
  }//}}}

  // title
  function createTitleBar()//{{{
  {
    let title_bar = div_base_element.cloneNode();
    title_bar.style.padding    = '1em';
    title_bar.style.fontWeight = 'bold';
    title_bar.style.background = STYLE_PRIMARY_COLOR;

    let title = span_base_element.cloneNode();
    title.style.fontSize = '1.5em';
    title.textContent    = "Tab Memory Purge";

    let title_bar_button = button_base_element.cloneNode();
    title_bar_button.style.position = 'absolute';
    title_bar_button.style.right    = '1em';
    title_bar_button.textContent    = "x";
    title_bar_button.onclick        = parentClose;

    title_bar.appendChild(title);
    title_bar.appendChild(title_bar_button);

    return title_bar;
  }//}}}


  function changeParentHeightByUrlLength(pUrl, pLength, pValue)//{{{
  {
    if (pLength === void 0 || pLength === null) {
      pLength = getNumber(STYLE_BASE_FONT_SIZE) * 4;
    }
    if (pValue === void 0 || pValue === null) {
      // base-line-height(20px) / STYLE_BASE_FONT_SIZE(12px) = 1.666...
      pValue = 1.7;
    }

    let add_line = Math.floor(pUrl.length / pLength) * pValue;
    let height   = getNumber(PARENT_HEIGHT) + add_line + 'em';
    parent_element.style.height = height;
  }//}}}

  // inside exclude dialog.
  function createExcludeDialog()//{{{
  {
    let host_name = HOST_NAME;
    let path_name = PATH_NAME;

    let dialog = div_base_element.cloneNode();
    dialog.style.padding   = "1em";
    dialog.style.textAlign = "center";

    let url_element = div_base_element.cloneNode();
    url_element.setAttribute('id', ID_NAME_OF_TARGET_URL);
    url_element.style.fontSize = '1.5em';
    url_element.style.padding  = '2em 0';
    url_element.style.wordWrap = 'break-word';
    url_element.textContent    = HOST_NAME + PATH_NAME;

    let message1_element = div_base_element.cloneNode();
    message1_element.textContent =
      chrome.i18n.getMessage('exclude_dialog_mes1');

    let message2_in_1_element = div_base_element.cloneNode();
    let message2_in_2_element = div_base_element.cloneNode();
    message2_in_1_element.textContent =
      chrome.i18n.getMessage('exclude_dialog_mes2');
    message2_in_2_element.textContent =
      chrome.i18n.getMessage('exclude_dialog_mes3');

    let host_element = span_base_element.cloneNode();
    host_element.style.padding = "0 1.5em;";
    host_element.textContent   = "Host:";

    let host_control_element = input_base_element.cloneNode();
    host_control_element.min   = 0;
    host_control_element.max   = HOSTS.length-1;
    host_control_element.value = 0;
    host_control_element.addEventListener('change', pEvent => {
      host_name = HOST_NAME;

      for (let i = 0; i < pEvent.target.value; ++i) {
        host_name = host_name.replace(new RegExp(`${HOSTS[i]}[.]+`), '*');
      }
      let url = host_name + path_name;
      url_element.textContent = url;
      changeParentHeightByUrlLength(url);
    });

    let message2_element = div_base_element.cloneNode();
    message2_element.appendChild(message2_in_1_element);
    message2_element.appendChild(message2_in_2_element);

    dialog.appendChild(message1_element);
    dialog.appendChild(url_element);
    dialog.appendChild(message2_element);

    let ranges_element = div_base_element.cloneNode();
    host_element.appendChild(host_control_element);
    ranges_element.appendChild(host_element);

    if (PATHS) {
      let page_element = document.createDocumentFragment();
      page_element = host_element.cloneNode();
      page_element.textContent = "Page:";
      
      let page_control_element   = input_base_element.cloneNode();
      page_control_element.min   = 0;
      page_control_element.max   = PATHS.length;
      page_control_element.value = 0;
      page_control_element.addEventListener('change', pEvent => {
        let value_length = pEvent.target.value;
        path_name = '';

        let i = 0;
        for (i = 0; i < value_length; i = (i + 1) | 0) {
          path_name += '/' + PATHS[i];
        }
        path_name +=
          (i !== 0 && page_control_element.max > value_length) ?
          '/*' :
          (location.pathname[location.pathname.length - 1] === '/' ? '/' : '');

        let url = host_name + path_name;
        url_element.textContent = url;
        changeParentHeightByUrlLength(url);
      });

      page_element.appendChild(page_control_element);
      ranges_element.appendChild(page_element);
    }

    dialog.appendChild(ranges_element);

    return dialog;
  }//}}}

  function getAddUrl()//{{{
  {
    let add_url_element =
      parent_element.querySelector(`#${ID_NAME_OF_TARGET_URL}`);
    let add_uri = add_url_element.textContent.replace(/\*/g, '');

    return add_uri;
  }//}}}

  function setAddUrlToExcludeList(pStorageName)//{{{
  {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(pStorageName, pItems => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        let add_uri = getAddUrl();
        let item    = pItems[pStorageName] ||
                      gMapDefaultValues.get(pStorageName);
        item = item.replace(/\n$/, '').trim();

        let check_items = item.split('\n');
        let is_exclude = check_items.some(pValue => {
          return pValue.trim() === add_uri;
        });
        if (is_exclude) {
          resolve();
          return;
        }

        item += '\n' + add_uri;

        let write = {};
        write[pStorageName] = item;
        chrome.storage.local.set(write, resolve);
      });
    });
  }//}}}

  function addExclusionListClicked(pOptionName)//{{{
  {
    setAddUrlToExcludeList(pOptionName)
    .then(() => {
      chrome.runtime.sendMessage(
        { event: 'load_options_and_reload_current_tab' });
      parentClose();
    })
    .catch(e => console.error(e));
  }//}}}

  function parentClose() {//{{{
    parent_element.style.display = 'none';
  }//}}}

  chrome.runtime.onMessage.addListener(
    (pMessage, pSender, pSendResponse) => {//{{{
    switch (pMessage.event) {
      case 'hideExcludeDialog':
        parent_element.style.display = 'none';
        break;
      case 'showExcludeDialog':
        parent_element.style.display = 'block';
        break;
      case 'getExcludeDialogState':
        if (typeof pSendResponse === 'function') {
          pSendResponse(parent_element.style.display !== 'none');
        } else {
          throw new Error("Doesn't find callback function.");
        }
        break;
    }
  });//}}}

  // buttons
  let exclude_dialog_buttons             = div_base_element.cloneNode();
  exclude_dialog_buttons.style.position  = "absolute";
  exclude_dialog_buttons.style.right     = "1em";
  exclude_dialog_buttons.style.bottom    = "1em";
  exclude_dialog_buttons.style.textAlign = "right";

  let exclude_button_template          = button_base_element.cloneNode();
  exclude_button_template.style.width  = '50%';
  exclude_button_template.style.margin = '0.16em';

  let add_exclude_list_button         = exclude_button_template.cloneNode();
  let add_keybind_exclude_list_button = exclude_button_template.cloneNode();
  let add_temp_exclude_list_button    = exclude_button_template.cloneNode();

  let calcel_button         = exclude_button_template.cloneNode();
  calcel_button.textContent = chrome.i18n.getMessage('cancel');
  calcel_button.onclick     = parentClose;

  add_exclude_list_button.textContent =
    chrome.i18n.getMessage('exclude_dialog_add_to_exclude_list');
  add_exclude_list_button.addEventListener('click', () => {
    addExclusionListClicked('exclude_url');
  });

  add_keybind_exclude_list_button.textContent =
    chrome.i18n.getMessage('exclude_dialog_add_to_keybind_exclude_list');
  add_keybind_exclude_list_button.addEventListener('click', () => {
    addExclusionListClicked('keybind_exclude_url');
  });

  add_temp_exclude_list_button.textContent =
    chrome.i18n.getMessage('exclude_dialog_add_to_temp_exclude_list');
  add_temp_exclude_list_button.addEventListener('click', () => {
    let url = getAddUrl();
    chrome.runtime.sendMessage(
      { event: 'add_to_temp_exclude_list', url: url });
    parentClose();
  });

  // be adding the elements to parent elements.
  parent_element = createParentElement();
  parent_element.appendChild(createTitleBar());
  parent_element.appendChild(createExcludeDialog());

  let buttons = [
    add_exclude_list_button,
    add_keybind_exclude_list_button,
    add_temp_exclude_list_button
  ];
  buttons.forEach(v => {
    exclude_dialog_buttons.appendChild(v);
    exclude_dialog_buttons.appendChild(br_base_element);
  });
  exclude_dialog_buttons.appendChild(calcel_button);

  parent_element.appendChild(exclude_dialog_buttons); // add to parent.

  // show.
  body_element.appendChild(parent_element);

  console.debug("exclude Dialog of Tab Memory Purge is loaded.");
})(this, this.document);
