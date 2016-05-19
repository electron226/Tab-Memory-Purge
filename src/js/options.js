/* global Database */
(function(window, document) {
  'use strict';

  //{{{ variables
  let db = null; // indexedDB class.

  const DEFAULT_MENU = "normal";

  const CLASS_NAME_OF_DOES_NOT = 'doNotShow';
  const STYLE_DISPLAY_NONE     = 'display: none';

  const CLASS_NAME_OF_MENU     = 'sectionMenu';
  const CLASS_NAME_OF_BUTTON   = 'sectionButton';
  const CLASS_NAME_WHEN_SELECT = 'select';

  const CLASS_NAME_OF_COPY_BUTTON  = 'copy';
  const CLASS_NAME_OF_APPLY_BUTTON = 'apply';

  const CLASS_NAME_OF_SET_KEYBIND_BUTTON   = 'keybind_set';
  const CLASS_NAME_OF_CLEAR_KEYBIND_BUTTON = 'keybind_clear';
  const CLASS_NAME_OF_KEYBIND_OPTION       = 'keyOption';
  const CLASS_NAME_OF_SHOW_KEYBIND         = 'pressKey';
  const CLASS_NAME_OF_KEYBIND_VALUE        = 'keybindValue';

  const CLASS_NAME_OF_HISTORY_ITEM        = 'historyItem';
  const CLASS_NAME_OF_HISTORY_DATE        = 'historyDate';
  const CLASS_NAME_OF_HISTORY_ITEM_DELETE = 'itemDelete';
  const CLASS_NAME_OF_HISTORY_ITEM_ICON   = 'itemIcon';
  const CLASS_NAME_OF_HISTORY_ITEM_URL    = 'itemUrl';
  const CLASS_NAME_OF_HISTORY_ITEM_DATE   = 'itemDate';
  const CLASS_NAME_OF_HISTORY_ITEM_TITLE  = 'itemTitle';
  const CLASS_NAME_OF_HISTORY_ITEM_LIST   = 'itemList';
  const ATTR_NAME_OF_WINDOW_ID            = 'windowId';
  const ATTR_NAME_OF_DATABASE             = 'databaseName';
  const ATTR_NAME_OF_ITEM_ID              = 'historyItemId';

  const ID_NAME_OF_HISTORY_LIST             = 'historyList';
  const ID_NAME_OF_SEARCH_HISTORY_DATE      = 'searchHistoryDate';
  const ID_NAME_OF_SEARCH_HISTORY_ITEM      = 'searchHistoryItem';
  const ID_NAME_OF_SEARCH_HISTORY_DATE_LIST = 'historyDateList';

  const ID_NAME_OF_DATE_LIST_NAV               = 'dateListNav';
  const ID_NAME_OF_DATE_LIST                   = 'dateList';
  const ID_NAME_OF_ADD_SAVED_SESSION_DATE_LIST = 'savedSessionDateList';
  const ID_NAME_OF_SESSION_DATE_LIST           = 'sessionDateList';
  const ID_NAME_OF_SESSION_NOT_FOUND           = 'sessionNotFound';
  const ID_NAME_OF_SAVED_SESSION_DATE_TITLE    = 'savedSessionDateTitle';
  const ID_NAME_OF_SESSION_LIST                = 'sessionList';
  const ID_NAME_OF_SESSION_TITLE               = 'sessionTitle';
  const ID_NAME_OF_SESSION_SAVE                = 'sessionSave';
  const ID_NAME_OF_SESSION_DELETE              = 'sessionDelete';
  const ID_NAME_OF_SESSION_RESTORE             = 'sessionRestore';
  const ID_NAME_OF_SESSION_ICON_CONTROL        = 'sessionIconControl';
  const ID_NAME_OF_CHANGE_HISTORY              = 'change_history';
  const ID_NAME_OF_EXPORT                      = 'export';
  const ID_NAME_OF_IMPORT                      = 'import';

  const opts_for_create_history_date = {
    className:  CLASS_NAME_OF_HISTORY_DATE,
    deleteFunc: function(pEvent) {
      return removeHistoryDate(pEvent)
             .then(getAllHistory)
             .then(pHistoryArray => {
               let search_history_date_element =
                 document.querySelector(`#${ID_NAME_OF_SEARCH_HISTORY_DATE}`);
               search_history_date_element.value = null;

               return showAutoCompleteDateList(pHistoryArray.reverse());
             });
    },
    itemDelete: CLASS_NAME_OF_HISTORY_ITEM_DELETE,
    itemDate:   CLASS_NAME_OF_HISTORY_ITEM_DATE,
    itemList:   CLASS_NAME_OF_HISTORY_ITEM_LIST,
  };
  const opts_for_create_history_item = {
    attrNameOfDatabase: ATTR_NAME_OF_DATABASE,
    deleteFunc: function(pEvent) {
      return removeHistoryItem(pEvent);
    },
    className:  CLASS_NAME_OF_HISTORY_ITEM,
    itemDelete: CLASS_NAME_OF_HISTORY_ITEM_DELETE,
    itemDate:   CLASS_NAME_OF_HISTORY_ITEM_DATE,
    itemUrl:    CLASS_NAME_OF_HISTORY_ITEM_URL,
    itemIcon:   CLASS_NAME_OF_HISTORY_ITEM_ICON,
    itemTitle:  CLASS_NAME_OF_HISTORY_ITEM_TITLE,
  };

  let exclude_key_names = new Set();
  exclude_key_names.add(gStrVersionKey);
  exclude_key_names.add(gStrPreviousSessionTimeKey);
  //}}}

  let OperateOptionValue = function() {//{{{
  };
  OperateOptionValue.prototype.get = function(pElement, pName) {//{{{
    console.assert(toType(pName) === 'string', "not string type.");

    return this.call(pElement, pName, null, 'get');
  };//}}}
  OperateOptionValue.prototype.set = //{{{
    function(pElement, pName, pValue) {
    console.assert(toType(pName) === 'string', "not string type.");

    return this.call(pElement, pName, pValue, 'set');
  };//}}}
  OperateOptionValue.prototype.call = //{{{
    function(pElement, pName, pValue, pType) {
    console.assert(toType(pName) === 'string', "not string type.");
    console.assert(
        toType(pType) === 'string' || pType === void 0 || pType === null,
        "not any type in string, undefined, null.");

    let $this = this;
    return new Promise((resolve, reject) => {
      pType = pType || 'get';

      let opts         = {};
      let name_element = pElement.querySelector(`[name="${pName}"`);
      if (name_element) {
        try {
          opts = {
            element: name_element,
            value:   pValue,
            type:    pType,
          };
          switch (name_element.type) {
          case 'checkbox':
            opts = Object.assign(opts, {
              property:  'checked',
              valueType: 'boolean',
            });
            break;
          case 'number':
          case 'text':
          case 'textarea':
            opts = Object.assign(opts, {
              property:  'value',
              valueType: (name_element.type === 'number') ? 'number' : 'string',
            });
            break;
          case 'select-one':
            {
              let option_element = name_element.querySelectorAll('option');
              if (pType === 'get') {
                Array.prototype.slice.call(option_element).forEach(value => {
                  if (value.selected === true) {
                    resolve(value.getAttribute('value'));
                  }
                });
              } else {
                Array.prototype.slice.call(option_element).forEach(value => {
                  if (value.getAttribute('value') === pValue) {
                    value.selected = true;
                  } else {
                    value.selected = false;
                  }
                });
              }
            }
            return;
          default:
            reject(new Error(
              `Doesn't write the code of each element type.` +
              ` name: ${pName}, type: ${name_element.type}`));
            break;
          }

          $this._call(opts).then(resolve).catch(reject);
          return;
        } catch (pErr) {
          reject(new Error(pErr));
          return;
        }
      }

      if (!exclude_key_names.has(pName)) {
        console.warn(`Doesn't find the elememt name: ${pName}`);
      }
      resolve();
    });
  };//}}}
  OperateOptionValue.prototype._call = function(pOptions) {//{{{
    console.assert(toType(pOptions) === 'object', "not object type.");

    return new Promise((resolve, reject) => {
      let element   = pOptions.element;
      let value     = pOptions.value;
      let type      = pOptions.type;
      let property  = pOptions.property;
      let valueType = pOptions.valueType;
      let any_value = (type === 'get') ? element[property] : value;

      if (valueType === 'number') {
        let lNumMin = parseInt(element.getAttribute('min'), 10);
        let lNumMax = parseInt(element.getAttribute('max'), 10);
        any_value   = parseInt(any_value, 10);

        if (lNumMin && any_value < lNumMin) {
          any_value = lNumMin;
          element.value = lNumMin;
        } else if (lNumMax && lNumMax < any_value){
          any_value = lNumMax;
          element.value = lNumMax;
        }
      }

      if (toType(any_value) !== valueType) {
        reject(new Error(
          `${any_value} is not ${valueType} type: ${toType(any_value)}`));
        return;
      }

      if (type === 'get') {
        resolve(any_value);
      } else {
        element[property] =
          (toType(any_value) === 'string') ? any_value.trim() : any_value;
        resolve();
      }
    });
  };//}}}
  OperateOptionValue.prototype.init = function(pElement) {//{{{
    return this.load(pElement, gMapDefaultValues);
  };//}}}
  OperateOptionValue.prototype.load = function(pElement, pOptions) {//{{{
    console.assert(
        toType(pOptions) === 'object' ||
        toType(pOptions) === 'map' ||
        pOptions === void 0 ||
        pOptions === null,
        "any type in object, map, undefined, null.");

    let $this = this;
    return new Promise((resolve, reject) => {
      let promise_results = [];
      let new_options     = new Map();

      $this.export()
      .then(rOptions => {
        switch (toType(pOptions)) {
        case 'map':
          new_options = pOptions;
          break;
        case 'object':
          new_options = new Map();
          Object.keys(pOptions).forEach(pKey => {
            new_options.set(pKey, pOptions[pKey]);
          });
          break;
        default:
          new_options = rOptions;
        }

        new_options.forEach((pValue, pKey) => {
          promise_results.push( $this.set(pElement, pKey, pValue) );
        });

        return Promise.all(promise_results);
      })
      .then(resolve)
      .catch(reject);
    });
  };//}}}
  OperateOptionValue.prototype.export = function() {//{{{
    return new Promise(resolve => {
      chrome.storage.local.get(items => {
        let results = new Map();
        gMapDefaultValues.forEach((v, key) => {
          results.set(key, items.hasOwnProperty(key) ? items[key] : v);
        });
        resolve(results);
      });
    });
  };//}}}
  OperateOptionValue.prototype.import = function(pElement, pOptions) {//{{{
    console.assert(toType(pOptions) === 'object', "not object type.");

    let $this = this;
    return new Promise((resolve, reject) => {
      $this.load(pElement, pOptions)
        .then(resolve(pOptions))
        .catch(reject);
    });
  };//}}}
  //}}}

  let ShowMenuSelection = function(pSelectors, pClassNameWhenSelect) {//{{{
    console.assert(toType(pSelectors) === 'object', "not object type.");
    console.assert(
        toType(pClassNameWhenSelect) === 'string', "not string type.");

    ShowMenuSelection.toggleSectionRegex = /(display:\s*)(\w+);/i;

    this.strMenuSelector        = pSelectors.menu;
    this.strButtonSelector      = pSelectors.button;
    this.strClassNameWhenSelect = pClassNameWhenSelect;
  };
  ShowMenuSelection.prototype.showMenu = function(pSelector) {//{{{
    console.assert(toType(pSelector) === 'string', "not string type.");

    return function(pIdName) {
      console.assert(toType(pIdName) === 'string', "not string type.");

      let show_menu = document.querySelector(`${pSelector}#${pIdName}`);
      let does_not_show_menu =
        document.querySelectorAll(`${pSelector}:not(#${pIdName})`);

      removeStringFromAttributeOfElement(
        show_menu, 'style', STYLE_DISPLAY_NONE);
      Array.prototype.slice.call(does_not_show_menu).forEach(pValue => {
        addStringToAttributeOfElement(pValue, 'style', STYLE_DISPLAY_NONE);
      });
    };
  };//}}}
  ShowMenuSelection.prototype.changeSelectionButtonColor = //{{{
    function(pSelector) {
    console.assert(toType(pSelector) === 'string', "not string type.");

    let $this   = this;

    return function(pName) {
      console.assert(toType(pName) === 'string', "not string type.");

      let prev_select = document.querySelector(
        `${pSelector}.${$this.strClassNameWhenSelect}`);
      if (prev_select !== null) {
        removeStringFromAttributeOfElement(
          prev_select, 'class', $this.strClassNameWhenSelect);
      }

      let new_select = document.querySelector(`${pSelector}[name="${pName}"]`);
      addStringToAttributeOfElement(
        new_select, 'class', $this.strClassNameWhenSelect);
    };
  };//}}}
  ShowMenuSelection.prototype.show = function(pName) {//{{{
    console.assert(toType(pName) === 'string', "not string type.");

    let show_menu_area     = this.showMenu(this.strMenuSelector);
    let select_menu_button =
      this.changeSelectionButtonColor(this.strButtonSelector);

    return new Promise(resolve => {
      show_menu_area(pName);
      select_menu_button(pName);

      resolve(pName);
    });
  };//}}}
  //}}}

  let KeyTrace = function(pId) {//{{{
    console.assert(
        toType(pId) === 'string' ||
        pId === void 0 ||
        pId === null,
        "not any type in string, undefined, null.");

    this.id        = pId || null;
    this.objResult = null;
  };
  KeyTrace.prototype.start = function(pId) {//{{{
    console.assert(toType(pId) === 'string', "not string type.");

    this.id = pId;
  };//}}}
  KeyTrace.prototype.traceEvent = function(pEvent) {//{{{
    if (this.id === null || this.id === void 0) {
      throw new Error("Doesn't set the id in this instance yet.");
    }

    this.objResult = { id: this.id, key: keyCheck(pEvent) };
    this.stop();

    return this.objResult;
  };//}}}
  KeyTrace.prototype.stop = function() {//{{{
    this.id = null;
  };//}}}
  KeyTrace.prototype.clear = function() {//{{{
    this.id        = null;
    this.objResult = null;
  };//}}}
  KeyTrace.prototype.isRun = function() {//{{{
    return this.id !== void 0 && this.id !== null;
  };//}}}
  KeyTrace.prototype.getResult = function() {//{{{
    return Object.assign({}, this.objResult);
  };//}}}
  //}}}

  function historyFuncForAfterMenuSelection()//{{{
  {
    return new Promise(resolve => {
      showAllHistory()
        .then(resolve)
        .catch(e => console.error(e));
    });
  }//}}}

  function sessionHistoryFuncForAfterMenuSelection()//{{{
  {
    return new Promise(resolve => {
      initSessionHistory()
        .then(resolve)
        .catch(e => console.error(e));
    });
  }//}}}

  function processAfterMenuSelection(pName)//{{{
  {
    console.assert(toType(pName) === 'string', "not string type.");

    return new Promise((resolve, reject) => {
      switch (pName) {
      case 'normal':
      case 'popup':
        break;
      case 'keybind':
        setTimeout(showAllKeybindString, 500);
        break;
      case 'information':
        break;
      case 'history':
        if (db.isOpened()) {
          historyFuncForAfterMenuSelection();
        } else {
          setTimeout(historyFuncForAfterMenuSelection, 1000);
        }
        break;
      case 'session_history':
        if (db.isOpened()) {
          sessionHistoryFuncForAfterMenuSelection();
        } else {
          setTimeout(sessionHistoryFuncForAfterMenuSelection, 1000);
        }
        break;
      case 'change_history':
        showChangeHistory()
          .then(resolve)
          .catch(e => console.error(e));
        break;
      case 'operate_settings':
        showOptionValuesToOperateSettingsPage()
          .then(resolve)
          .catch(e => console.error(e));
        break;
      default:
        reject(new Error("The Invalid menu name."));
        return;
      }

      history.pushState(pName,
        `${document.title} ${chrome.i18n.getMessage(pName)}`,
        `${gStrOptionPage}?page=${pName}`);
    });
  }//}}}

  //{{{ A variable of a function of using closure.
  const operateOption = new OperateOptionValue();
  const keybindTrace  = new KeyTrace();
  const menuToggle    = new ShowMenuSelection(
    {
      menu:   `.${CLASS_NAME_OF_MENU}`,
      button: `.${CLASS_NAME_OF_BUTTON}`,
    },
    CLASS_NAME_WHEN_SELECT);
  //}}}
  //
  window.addEventListener('popstate', e => {//{{{
    if (e.state) {
      menuToggle.show(e.state || DEFAULT_MENU);
    }
  }, true);//}}}

  function clearItemInElement(pNode)//{{{
  {
    while(pNode.firstChild) {
      pNode.removeChild(pNode.firstChild);
    }
    return pNode;
  }//}}}

  function deleteKeyItemFromObject(pBaseObj, pDeleteKeys)//{{{
  {
    console.assert(
        toType(pBaseObj) === 'object' ||
        toType(pBaseObj) === 'set' ||
        toType(pBaseObj) === 'map',
        "not any type in object, set, or map.");
    console.assert(
        toType(pDeleteKeys) === 'array' ||
        toType(pDeleteKeys) === 'object' ||
        toType(pDeleteKeys) === 'set' ||
        toType(pDeleteKeys) === 'map',
        "not any type in array, object, set, or map.");

    let new_object       = pBaseObj;
    let type             = toType(pBaseObj);
    let delete_keys_type = toType(pDeleteKeys);

    if (delete_keys_type === 'object') {
      Object.keys(pDeleteKeys).forEach(pKey => {
        if (type === 'object') {
          delete new_object[ pDeleteKeys[pKey] ];
        } else {
          new_object.delete(pDeleteKeys[pKey]);
        }
      });
    } else {
      // the deleteKeysType is Array, map, or set.
      pDeleteKeys.forEach((pValue, pKey) => {
        if (type === 'object') {
          delete new_object[ pKey ];
        } else {
          // the objType is map or set.
          new_object.delete(pKey);
        }
      });
    }

    return new_object;
  }//}}}

  function showOptionValuesToOperateSettingsPage()//{{{
  {
    return new Promise(resolve => {
      operateOption.export()
      .then(pOptions => {
        let old_options = {};
        pOptions.forEach( (pValue, pKey) => (old_options[ pKey ] = pValue) );

        let new_options =
          deleteKeyItemFromObject(old_options, exclude_key_names);

        let export_element = document.querySelector(`#${ID_NAME_OF_EXPORT}`);
        export_element.value = JSON.stringify(new_options, null, '    ');

        resolve();
      });
    });
  }//}}}

  function showChangeHistory()//{{{
  {
    return new Promise(resolve => {
      ajax({ url: gStrChangeHistory, responseType: 'text' })
      .then(result => {
        let change_history_element =
          document.querySelector(`#${ID_NAME_OF_CHANGE_HISTORY}`);
        clearItemInElement(change_history_element);

        let pre_element = document.createElement('pre');
        pre_element.textContent = result.response;

        change_history_element.appendChild(pre_element);

        resolve();
      });
    });
  }//}}}

  function showAllKeybindString()//{{{
  {
    let keybind_elements =
      document.querySelectorAll(`.${CLASS_NAME_OF_KEYBIND_OPTION}`);
    Array.prototype.slice.call(keybind_elements).forEach(pValue => {
      let key_json    = pValue.querySelector(`.${CLASS_NAME_OF_KEYBIND_VALUE}`);
      let key_element = pValue.querySelector(`.${CLASS_NAME_OF_SHOW_KEYBIND}`);
      try {
        if (key_json.value === '{}' ||
            key_json.value === ''   ||
            key_json.value === null ||
            key_json.value === void 0) {
          return;
        }

        key_element.value = generateKeyString(JSON.parse(key_json.value));
      } catch (e) {
        console.warn(e, key_json.value);
      }
    });
  }//}}}

  function setKeybindOption(pClassName, pKeyInfo)//{{{
  {
    console.assert(toType(pClassName) === 'string', "not string type.");
    console.assert(toType(pKeyInfo) === 'object', "not object type.");

    let keybind_option =
      document.querySelector(`.${pClassName}.${CLASS_NAME_OF_KEYBIND_OPTION}`);
    let keybind_value =
      keybind_option.querySelector(`.${CLASS_NAME_OF_KEYBIND_VALUE}`);
    let show_keybind =
      keybind_option.querySelector(`.${CLASS_NAME_OF_SHOW_KEYBIND}`);

    keybind_value.value = JSON.stringify(pKeyInfo);
    try {
      show_keybind.value = generateKeyString(pKeyInfo);
    } catch (e) {
      show_keybind.value = '';
    }
  }//}}}

  function keyupEvent(pEvent)//{{{
  {
    if (keybindTrace.isRun()) {
      let info = keybindTrace.traceEvent(pEvent);
      setKeybindOption(info.id, info.key);

      // save the keybind with using event to storage.
      let new_event = document.createEvent('HTMLEvents');
      new_event.initEvent('change', false, true);

      let trace_target = document.querySelector(
        `[name="${info.id}"].${CLASS_NAME_OF_KEYBIND_VALUE}`);
      trace_target.dispatchEvent(new_event);
    }
  }//}}}

  function buttonClicked(pEvent)//{{{
  {
    let msg        = "";
    let target     = pEvent.target;
    let class_name = target.getAttribute('class');

    // keybind only.
    let class_name_of_parent = target.parentNode.getAttribute('class');
    let option_name          = "";
    if (class_name_of_parent) {
      option_name = class_name_of_parent.replace(
        CLASS_NAME_OF_KEYBIND_OPTION, '').trim();
    }

    switch (class_name) {
    case CLASS_NAME_OF_SET_KEYBIND_BUTTON:
      if (keybindTrace.isRun()) {
        keybindTrace.stop();
      }
      keybindTrace.start(option_name);
      break;
    case CLASS_NAME_OF_CLEAR_KEYBIND_BUTTON:
      {
        setKeybindOption(option_name, {});

        // save the keybind with using event to storage.
        let element = document.querySelector(
          `[name="${option_name}"].${CLASS_NAME_OF_KEYBIND_VALUE}`);

        let new_event = document.createEvent('HTMLEvents');
        new_event.initEvent('change', false, true);
        element.dispatchEvent(new_event);
        break;
      }
    case CLASS_NAME_OF_COPY_BUTTON:
      {
        let export_element = document.querySelector(`#${ID_NAME_OF_EXPORT}`);
        export_element.select();

        let result = document.execCommand('copy');
        msg = result ? 'successed' : 'failured';
        console.log(`have copied the string of import area. it is ${msg}.`);

        window.getSelection().removeAllRanges();
        break;
      }
    case CLASS_NAME_OF_APPLY_BUTTON:
      {
        let import_element = document.querySelector(`#${ID_NAME_OF_IMPORT}`);

        let value = "";
        try {
          value = JSON.parse(import_element.value.trim());
        } catch (e) {
          if (e instanceof SyntaxError) {
            msg = "Invalid the json string. The value doesn't correct:\n" +
                      e.message;
            console.error(msg);
            alert(msg);
          } else {
            console.error(e);
          }
          break;
        }

        value = deleteKeyItemFromObject(value, exclude_key_names);
        operateOption.import(document, value)
        .then(writeOptions => {
          return new Promise(
            resolve => chrome.storage.local.set(writeOptions, resolve));
        })
        .then(showOptionValuesToOperateSettingsPage)
        .then(applyNewOptionToExtensionProcess)
        .catch(e => console.error(e));
        break;
      }
    }
  }//}}}

  function addAutocompleteDateList(pElement)//{{{
  {
    let complete_element = pElement;
    let option_element   = document.createElement('option');

    while (complete_element.firstChild) {
      complete_element.removeChild(complete_element.firstChild);
    }

    return function(pDate) {
      let lElNewOption   = option_element.cloneNode(true);
      lElNewOption.value = formatDate(pDate, 'YYYY-MM-DD');
      complete_element.appendChild(lElNewOption);
    };
  }//}}}

  function getFormatEachLanguages(pTime, pFormat)//{{{
  {
    console.assert(
        toType(pTime) === 'number' ||
        toType(pTime) === 'date',
        "not any type in number or date.");
    console.assert(
        toType(pFormat) === 'object' ||
        pFormat === void 0 ||
        pFormat === null,
        "not any type in object, undefined, null.");

    if (pTime === void 0 || pTime === null) {
      throw new Error(`Invalid arguments is pTime: ${pTime}`);
    }

    if (pFormat === void 0 || pFormat === null) {
      pFormat = {
        'ja':      'YYYY/MM/DD hh:mm:ss',
        'default': 'MM/DD/YYYY hh:mm:ss',
      };
    }

    let lStrLang       = chrome.i18n.getUILanguage();
    let lStrFormatType = pFormat.hasOwnProperty(lStrLang) ?
                         pFormat[lStrLang] :
                         pFormat['default'];
    return formatDate(new Date(pTime), lStrFormatType);
  }//}}}

  function changeSessionIconControlState(pState)//{{{
  {
    console.assert(toType(pState) === 'boolean', "not boolean type.");

    let session_icon_control_element =
      document.querySelector(`#${ID_NAME_OF_SESSION_ICON_CONTROL}`);
    if (pState) {
      removeStringFromAttributeOfElement(
        session_icon_control_element, 'class', CLASS_NAME_OF_DOES_NOT);
    } else {
      addStringToAttributeOfElement(
        session_icon_control_element, 'class', CLASS_NAME_OF_DOES_NOT);
    }
  }//}}}

  function clearSessionTitleInSessionControlBar()//{{{
  {
    return new Promise(resolve => {
      let session_title_element =
        document.querySelector(`#${ID_NAME_OF_SESSION_TITLE}`);
      session_title_element.textContent = '';
      resolve();
    });
  }//}}}

  function saveSession()//{{{
  {
    return new Promise((resolve, reject) => {
      let add_location_where_session_list_element =
        document.querySelector(`#${ID_NAME_OF_SESSION_LIST}`);
      let show_field_elements =
        add_location_where_session_list_element.querySelectorAll(
          `fieldset:not(.${CLASS_NAME_OF_DOES_NOT})`);
      if (show_field_elements.length === 0) {
        resolve();
        return;
      }

      let urls_of_each_window = new Map();
      let item_url            = opts_for_create_history_item.itemUrl;

      Array.prototype.slice.call(show_field_elements).forEach(pValue => {
        let urls      = [];
        let window_id = pValue.getAttribute(ATTR_NAME_OF_WINDOW_ID);
        let item_url_list_elements = pValue.querySelectorAll(`.${item_url}`);

        Array.prototype.slice.call(
            item_url_list_elements).forEach(v => urls.push(v.href));
        urls_of_each_window.set(window_id, urls);
      });

      let now          = Date.now();
      let new_sessions = [];
      urls_of_each_window.forEach((pValue, pKey) => {
        new_sessions = new_sessions.concat(
          pValue.map(v => {
            return {
              date:     now,
              url:      v,
              windowId: parseInt(pKey, 10) || 0
            };
          })
        );
      });

      db.put({
        name: gStrDbSavedSessionName,
        data: new_sessions,
      })
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function deleteSession()//{{{
  {
    return new Promise((resolve, reject) => {
      let session_title_element =
        document.querySelector(`#${ID_NAME_OF_SESSION_TITLE}`);
      let date_value = parseInt(session_title_element.getAttribute('name'), 10);
      let db_name = session_title_element.getAttribute(ATTR_NAME_OF_DATABASE);

      if (toType(date_value) !== 'number' ||
          toType(db_name) !== 'string' ||
          db_name.length === 0) {
        reject(new Error(
          `Doesn't get date_value: ${date_value} or` +
          ` db_name: ${db_name} correctly.`));
        return;
      }

      db.getCursor({
        name:      db_name,
        range:     IDBKeyRange.only(date_value),
        indexName: 'date',
      })
      .then(pArrayResults => {
        let delete_keys = pArrayResults.map(v => v.id);
        return db.delete({
          name: db_name,
          keys: delete_keys,
        });
      })
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function restoreSession()//{{{
  {
    let add_location_where_session_list_element =
      document.querySelector(`#${ID_NAME_OF_SESSION_LIST}`);
    let show_field_elements =
      add_location_where_session_list_element.querySelectorAll(
        `fieldset:not(.${CLASS_NAME_OF_DOES_NOT})`);
    if (show_field_elements.length === 0) {
      console.warn(
          'The length of show_field_elements in restoreSession is zero.');
      return;
    }

    let restores = [];
    Array.prototype.slice.call(show_field_elements).forEach(pValue => {
      let window_id = parseInt(pValue.getAttribute(ATTR_NAME_OF_WINDOW_ID), 10);
      let history_item_urls =
        pValue.querySelectorAll(`.${CLASS_NAME_OF_HISTORY_ITEM_URL}`);

      Array.prototype.slice.call(history_item_urls).forEach(
        v => restores.push({ url: v.href, windowId: window_id }));
    });

    chrome.runtime.sendMessage({ event: 'restore', session: restores });
  }//}}}

  function closureCreateSessionDateList(pOptions)//{{{
  {
    console.assert(toType(pOptions) === 'object', "not object type.");

    //{{{ local variable.
    const db_name               = pOptions.databaseName;
    const ATTR_NAME_OF_DATABASE = pOptions.attrNameOfDatabase || 'database';
    const to_add_date_list      = pOptions.dateList;
    const to_add_item_list      = pOptions.itemList;
    const current_time          = pOptions.currentTime;

    if (toType(db_name) !== 'string') {
      throw new Error("db_name isn't correctly.");
    }
    if (toType(ATTR_NAME_OF_DATABASE) !== 'string') {
      throw new Error("ATTR_NAME_OF_DATABASE isn't correctly.");
    }
    if (to_add_date_list === void 0 || to_add_date_list === null) {
      throw new Error("dateList isn't found in arguments");
    }
    if (to_add_item_list === void 0 || to_add_item_list === null) {
      throw new Error("itemList isn't found in arguments");
    }
    if (current_time !== void 0 && current_time !== null &&
        toType(current_time) !== 'number') {
      throw new Error('currentTime in arguments is not number.');
    }
    //}}}

    function onClicked(pEvent)//{{{
    {
      let target    = pEvent.target;
      let list_name = target.parentNode.getAttribute('id');
      let name      = target.getAttribute('name');
      let session_save_element =
        document.querySelector(`#${ID_NAME_OF_SESSION_SAVE}`);
      let session_title_element =
        document.querySelector(`#${ID_NAME_OF_SESSION_TITLE}`);
      let show_lists     =
        to_add_item_list.querySelectorAll(`fieldset[name="${name}"]`);
      let not_show_lists =
        to_add_item_list.querySelectorAll(`fieldset:not([name="${name}"])`);
      let date_list    = document.querySelector(`#${ID_NAME_OF_DATE_LIST}`);
      let select_dates = date_list.querySelector(`[name="${name}"]`);
      let not_select_dates =
        date_list.querySelectorAll(`:not([name="${name}"])`);

      // select which is showed a list of a session date.
      Array.prototype.slice.call(show_lists).forEach(pValue => {
        removeStringFromAttributeOfElement(
          pValue, 'class', CLASS_NAME_OF_DOES_NOT);
      });

      Array.prototype.slice.call(not_show_lists).forEach(pValue => {
        addStringToAttributeOfElement(pValue, 'class', CLASS_NAME_OF_DOES_NOT);
      });

      changeSessionIconControlState(true);

      // If clicking date is saved sesssion, add button is not show.
      if (list_name === ID_NAME_OF_ADD_SAVED_SESSION_DATE_LIST) {
        addStringToAttributeOfElement(
          session_save_element, 'class', CLASS_NAME_OF_DOES_NOT);
      } else {
        removeStringFromAttributeOfElement(
          session_save_element, 'class', CLASS_NAME_OF_DOES_NOT);
      }

      // a button of session date is changed by state.
      addStringToAttributeOfElement(
        select_dates, 'class', CLASS_NAME_WHEN_SELECT);

      session_title_element.setAttribute('name', name);
      session_title_element.setAttribute(ATTR_NAME_OF_DATABASE, db_name);
      session_title_element.textContent = select_dates.textContent;

      Array.prototype.slice.call(not_select_dates).forEach(pValue => {
        removeStringFromAttributeOfElement(
          pValue, 'class', CLASS_NAME_WHEN_SELECT);
      });
    }//}}}

    function closureCreateSessionDate()//{{{
    {
      let div_base = document.createElement('div');

      return function(pTime) {
        console.assert(toType(pTime) === 'number', "not number type.");

        let text  = "";

        if (current_time !== void 0 &&
            current_time !== undefined &&
            current_time === parseInt(pTime, 10)) {
          text = 'Current Session';
        } else {
          text = getFormatEachLanguages(pTime);
        }

        let div_clone = div_base.cloneNode(true);
        div_clone.setAttribute('name', pTime);
        div_clone.textContent = text;
        div_clone.addEventListener('click', onClicked, true);

        return div_clone;
      };
    }//}}}

    function createSessionDateListItem(pItems)//{{{
    {
      console.assert(toType(pItems) === 'array', "not array type.");

      let create_history_item = closureCreateHistoryItem(
        Object.assign(opts_for_create_history_item, {
          databaseName: db_name,
          deleteFunc:   removeSessionHistoryItem,
        })
      );
      let opts = {
        date: false,
      };
      let lists = [];

      pItems.forEach(pValue => {
        lists.push(create_history_item(pValue, opts));
      });

      return lists;
    }//}}}

    function getDictSplitEachSession(pSessions, pAttrName)//{{{
    {
      console.assert(toType(pSessions) === 'array', "not array type.");
      console.assert(toType(pAttrName) === 'string', "not string type.");

      let attr, value;
      let result = new Map();
      pSessions.forEach(pValue => {
        attr  = pValue[pAttrName];
        value = result.get(attr) || [];
        value.push(pValue);
        result.set(attr, value);
      });

      return result;
    }//}}}

    function createSessionWindowList(pTime, pWindow)//{{{
    {
      console.assert(toType(pTime) === 'number', "not number type.");
      console.assert(toType(pWindow) === 'map', "not map type.");

      let lCreateHistoryDate = closureCreateHistoryDate(
        Object.assign(opts_for_create_history_date, {
          deleteFunc: removeSessionHistoryWindow,
        })
      );

      let lists     = [];
      let count = 0;
      pWindow.forEach((pValue, pNumWindowId) => {
        let field_element = lCreateHistoryDate({ date: pTime });
        addStringToAttributeOfElement(
          field_element, ATTR_NAME_OF_WINDOW_ID, pNumWindowId);
        addStringToAttributeOfElement(
          field_element, 'class', CLASS_NAME_OF_DOES_NOT);

        let window_title_element =
          field_element.querySelector(`.${CLASS_NAME_OF_HISTORY_ITEM_DATE}`);
        window_title_element.textContent = `Window ${count}`;

        let history_item_delete_element =
          field_element.querySelector(`.${CLASS_NAME_OF_HISTORY_ITEM_DELETE}`);
        addStringToAttributeOfElement(
            history_item_delete_element, ATTR_NAME_OF_WINDOW_ID, pNumWindowId);

        let article_element = field_element.querySelector(
            `.${opts_for_create_history_date.itemList}`);
        createSessionDateListItem(pValue)
          .forEach(v => article_element.appendChild(v));

        lists.push(field_element);

        ++count;
      });

      return lists;
    }//}}}

    function createSessionDateList(pSessions)//{{{
    {
      console.assert(toType(pSessions) === 'array', "not array type.");

      let lCreateSessionDate = closureCreateSessionDate();
      let lArrayDateList     = [];
      let lArrayItemList     = [];

      pSessions.forEach(pValue => {
        let lMapSessionEachDate = getDictSplitEachSession(pValue.data, 'date');

        lMapSessionEachDate.forEach((pValue, pKey) => {
          lArrayDateList.push( lCreateSessionDate(pKey) );

          let lMapSessionEachWindowId =
            getDictSplitEachSession(pValue, ATTR_NAME_OF_WINDOW_ID);
          let lArrayItem =
            createSessionWindowList(pKey, lMapSessionEachWindowId);

          lArrayItemList = lArrayItemList.concat(lArrayItem);
        });
      });

      lArrayDateList.forEach(v => to_add_date_list.appendChild(v));
      lArrayItemList.forEach(v => to_add_item_list.appendChild(v));
    }//}}}

    return createSessionDateList;
  }//}}}

  function selectCurrentSession()//{{{
  {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(pItems => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        let current_session_time = pItems[gStrPreviousSessionTimeKey];
        if (current_session_time === void 0 || current_session_time === null) {
          resolve();
          return;
        }

        let location_where_to_add_session_date_list_element =
          document.querySelector(`#${ID_NAME_OF_SESSION_DATE_LIST}`);
        let current_session_item_element =
          location_where_to_add_session_date_list_element.querySelector(
            `[name="${current_session_time}"]`);
        if (current_session_item_element) {
          current_session_item_element.click();
        }
      });
    });
  }//}}}

  function showAllSessionHistory()//{{{
  {
    let add_saved_session_date_list_element     =
      document.querySelector(`#${ID_NAME_OF_ADD_SAVED_SESSION_DATE_LIST}`);
    let add_session_date_list_element           =
      document.querySelector(`#${ID_NAME_OF_SESSION_DATE_LIST}`);
    let add_location_where_session_list_element =
      document.querySelector(`#${ID_NAME_OF_SESSION_LIST}`);
    let saved_session_date_title_element        =
      document.querySelector(`#${ID_NAME_OF_SAVED_SESSION_DATE_TITLE}`);
    let date_list_nav_element                   =
      document.querySelector(`#${ID_NAME_OF_DATE_LIST_NAV}`);
    let session_not_found_element               =
      document.querySelector(`#${ID_NAME_OF_SESSION_NOT_FOUND}`);

    return new Promise((resolve, reject) => {
      getAllSessionHistory()
      .then(results => {
        let saved_sessions = results[0];
        let sessions       = results[1];

        clearItemInElement(add_saved_session_date_list_element);
        clearItemInElement(add_session_date_list_element);
        clearItemInElement(add_location_where_session_list_element);

        // saved session list.
        if (saved_sessions.length === 0) {
          addStringToAttributeOfElement(
            saved_session_date_title_element, 'class', CLASS_NAME_OF_DOES_NOT);
        } else {
          removeStringFromAttributeOfElement(
            saved_session_date_title_element, 'class', CLASS_NAME_OF_DOES_NOT);

          let create_saved_session_date_list = closureCreateSessionDateList({
            databaseName:       gStrDbSavedSessionName,
            attrNameOfDatabase: ATTR_NAME_OF_DATABASE,
            dateList:           add_saved_session_date_list_element,
            itemList:           add_location_where_session_list_element,
          });
          create_saved_session_date_list(saved_sessions);
        }

        //{{{ session list.
        chrome.storage.local.get(gStrPreviousSessionTimeKey, items => {
          let current_time = items[gStrPreviousSessionTimeKey];

          // new
          let create_session_date_list = closureCreateSessionDateList({
            databaseName:       gStrDbSessionName,
            attrNameOfDatabase: ATTR_NAME_OF_DATABASE,
            dateList:           add_session_date_list_element,
            itemList:           add_location_where_session_list_element,
            currentTime:        current_time,
          });
          create_session_date_list(sessions);

          // If savedSession list or session list are empty,
          // showing the message of session is empty.
          if (saved_sessions.length > 0 || sessions.length > 0) {
            addStringToAttributeOfElement(
              session_not_found_element, 'class', CLASS_NAME_OF_DOES_NOT);
            removeStringFromAttributeOfElement(
              date_list_nav_element, 'style', STYLE_DISPLAY_NONE);
          } else {
            removeStringFromAttributeOfElement(
              session_not_found_element, 'class', CLASS_NAME_OF_DOES_NOT);
            addStringToAttributeOfElement(
              date_list_nav_element, 'style', STYLE_DISPLAY_NONE);
          }

          resolve();
        });
        //}}}
      })
      .catch(reject);
    });
  }//}}}

  function getAllSessionHistory()//{{{
  {
    return new Promise((resolve, reject) => {
      if (db === void 0 || db === null) {
        reject(new Error("IndexedDB doesn't initialize yet."));
        return;
      }

      let promise_results = [];
      promise_results.push( db.getAll({ name: gStrDbSavedSessionName }) );
      promise_results.push( db.getAll({ name: gStrDbSessionName }) );
      promise_results.push( db.getAll({ name: gStrDbPageInfoName }) );
      promise_results.push( db.getAll({ name: gStrDbDataURIName }) );

      Promise.all(promise_results)
      .then(pResults => {
        let saved_sessions = pResults[0];
        let sessions       = pResults[1];
        let page_infos     = pResults[2];
        let data_urls      = pResults[3];

        promise_results = [];
        promise_results.push(
          getListAfterJoinHistoryDataOnDB(
            [ saved_sessions, page_infos, data_urls ])
        );
        promise_results.push(
          getListAfterJoinHistoryDataOnDB(
            [ sessions, page_infos, data_urls ])
        );

        return Promise.all(promise_results);
      })
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function showAutoCompleteDateList(pHistories)//{{{
  {
    console.assert(toType(pHistories) === 'array', "not array type.");

    let search_history_date_elementList =
      document.querySelector(`#${ID_NAME_OF_SEARCH_HISTORY_DATE_LIST}`);
    let autocomplete_date_list =
      addAutocompleteDateList(search_history_date_elementList);

    pHistories.forEach(pValue => autocomplete_date_list(pValue.date));
  }//}}}

  function removeHistoryDate(pEvent)//{{{
  {
    return new Promise((resolve, reject) => {
      let target              = pEvent.target;
      let history_date_legend = target.parentNode;
      let history_date_field  = history_date_legend.parentNode;
      let history_list        = history_date_field.parentNode;

      let target_date = new Date( parseInt(target.getAttribute('name'), 10) );
      let fullyear    = target_date.getFullYear();
      let month       = target_date.getMonth();
      let day         = target_date.getDate();
      let lDateBegin  = new Date(fullyear, month, day, 0, 0, 0, 0);
      let lDateEnd    = new Date(fullyear, month, day, 23, 59, 59, 999);

      db.getCursor({
        name:  gStrDbHistoryName,
        range: IDBKeyRange.bound(lDateBegin.getTime(), lDateEnd.getTime()),
      })
      .then(histories => {
        let delete_keys = histories.map(v => v.date);
        return db.delete({
          name: gStrDbHistoryName,
          keys: delete_keys,
        });
      })
      .then(ret => {
        history_list.removeChild(history_date_field);
        return ret;
      })
      .then(resolve)
      .catch(e => {
        console.error(e);
        reject(e);
      });
    });
  }//}}}

  function removeHistoryItem(pEvent)//{{{
  {
    return new Promise((resolve, reject) => {
      let target            = pEvent.target;
      let history_item      = target.parentNode;
      let history_item_list = history_item.parentNode;

      let db_name = target.getAttribute(ATTR_NAME_OF_DATABASE);
      let item_id = parseInt(target.getAttribute(ATTR_NAME_OF_ITEM_ID), 10);
      let time    = parseInt(target.getAttribute('name'), 10);

      db.delete({
        name: db_name,
        keys: item_id ? item_id : time,
      })
      .then(ret => {
        history_item_list.removeChild(history_item);
        return ret;
      })
      .then(resolve)
      .catch(e => {
        console.error(e);
        reject(e);
      });
    });
  }//}}}

  function removeSessionHistoryItem(pEvent)//{{{
  {
    return new Promise((resolve, reject) => {
      let session_list_element =
        document.querySelector(`#${ID_NAME_OF_SESSION_LIST}`);
      let getShowField = () => {
        return session_list_element.querySelectorAll(
          `fieldset:not(.${CLASS_NAME_OF_DOES_NOT})`);
      };
      let show_field_element = getShowField();

      removeHistoryItem(pEvent)
      .then(() => {
        Array.prototype.slice.call(show_field_element).forEach(pValue => {
          let item_list_element =
            pValue.querySelector(`.${CLASS_NAME_OF_HISTORY_ITEM_LIST}`);
          if (item_list_element.childNodes.length === 0) {
            session_list_element.removeChild(pValue);
          }
        });

        return (getShowField().length === 0) ? initSessionHistory() : null;
      })
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function removeSessionHistoryWindow(pEvent)//{{{
  {
    return new Promise((resolve, reject) => {
      let session_list_element =
        document.querySelector(`#${ID_NAME_OF_SESSION_LIST}`);
      let getShowField = () => {
        return session_list_element.querySelectorAll(
          `fieldset:not(.${CLASS_NAME_OF_DOES_NOT})`);
      };
      let target = pEvent.target;
      let window_id = parseInt(target.getAttribute(ATTR_NAME_OF_WINDOW_ID), 10);
      let date_time = parseInt(target.getAttribute('name'), 10);
      let db_names = [ gStrDbSessionName, gStrDbSavedSessionName ];

      // get from all the databases of a session history.
      let promise_results  = [];
      db_names.forEach(pValue => {
        promise_results.push(
          db.getCursor({
            name:      pValue,
            range:     IDBKeyRange.only(date_time),
            indexName: 'date',
          })
        );
      });

      Promise.all(promise_results)
      .then(pResults => {
        // create the array for to delete session history from database.
        let sessions = [];
        pResults.forEach(pValue => {
          sessions = sessions.concat(pValue);
        });
        let delete_keys = sessions.filter(v => {
          return window_id ? v.windowId === window_id : true;
        })
        .map(v => v.id);

        // delete specified window from the databases of a session history.
        promise_results = [];
        db_names.forEach(pValue => {
          promise_results.push(
            db.delete({
              name: pValue,
              keys: delete_keys,
            })
          );
        });

        return Promise.all(promise_results);
      })
      .then(() => {
        // deletes the deleted window item from DOM.
        let show_field_element = getShowField();
        Array.prototype.slice.call(show_field_element).forEach(pValue => {
          let window_id_of_field =
            parseInt(pValue.getAttribute(ATTR_NAME_OF_WINDOW_ID), 10);
          if (window_id_of_field === window_id) {
            session_list_element.removeChild(pValue);
          }
        });

        // If the session history of the same Date in empty, deletes the field.
        return (getShowField().length === 0) ? initSessionHistory() : null;
      })
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function closureCreateHistoryDate(pOptions)//{{{
  {
    console.assert(toType(pOptions) === 'object', "not object type.");
    console.assert(
        pOptions.hasOwnProperty('deleteFunc'), "not found deleteFunc");

    //{{{ local variables.
    const delete_function                 = pOptions.deleteFunc;
    const CLASS_NAME_OF_HISTORY_DATE_item = pOptions.className || 'historyDate';
    const class_name_of_delete_button     = pOptions.itemDelete || 'itemDelete';
    // itemDate also be used as DateTitle.
    const CLASS_NAME_OF_HISTORY_DATE     = pOptions.itemDate || 'itemDate';
    const class_name_to_add_history_item = pOptions.itemList || 'itemList';
    //}}}

    function createPrototype()//{{{
    {
      let fieldset        = document.createElement('fieldset');
      let legend          = document.createElement('legend');
      let span            = document.createElement('span');
      let img             = document.createElement('img');
      let article_element = document.createElement('article');

      addStringToAttributeOfElement(
        fieldset, 'class', CLASS_NAME_OF_HISTORY_DATE_item);
      addStringToAttributeOfElement(fieldset, 'class', 'historyField');

      addStringToAttributeOfElement(
        span, 'class', CLASS_NAME_OF_HISTORY_DATE);

      addStringToAttributeOfElement(img, 'src', gStrDeleteIconPath);
      addStringToAttributeOfElement(img, 'alt', 'Delete button');
      addStringToAttributeOfElement(img, 'class', class_name_of_delete_button);
      addStringToAttributeOfElement(img, 'class', 'icon16_rev');

      addStringToAttributeOfElement(
        article_element, 'class', class_name_to_add_history_item);
      addStringToAttributeOfElement(article_element, 'class', 'ellipsis_over');

      legend.appendChild(span);
      legend.appendChild(img);
      fieldset.appendChild(legend);
      fieldset.appendChild(article_element);

      return fieldset;
    }//}}}

    function createHistoryDate(pItem, pOptions)//{{{
    {
      let default_opts = {
        deleteButton: true,
        date:         true,
        title:        true,
      };

      console.assert(toType(pItem) === 'object', "not object type.");
      console.assert(
          pItem.hasOwnProperty('date'), "date property is not found.");

      console.assert(
          toType(pOptions) === 'object' ||
          pOptions === void 0 ||
          pOptions === null,
          "not any type in object, undefined, or null.");

      let prototype_element = createPrototype();
      let history_date  = prototype_element.cloneNode(true);
      let delete_button =
        history_date.querySelector(`.${class_name_of_delete_button}`);
      let date_title    =
        history_date.querySelector(`.${CLASS_NAME_OF_HISTORY_DATE}`);

      if (pOptions !== void 0 && pOptions !== null) {
        Object.keys(pOptions).forEach(v => default_opts[v] = pOptions[v]);
      }

      let time = new Date(pItem.date).getTime();
      addStringToAttributeOfElement(history_date, 'name', time);

      if (default_opts.deleteButton) {
        addStringToAttributeOfElement(delete_button, 'name', time);
        delete_button.addEventListener('click', delete_function, true);
      }

      if (default_opts.title || default_opts.date) {
        date_title.textContent = getFormatEachLanguages(pItem.date, {
          'ja':      'YYYY/MM/DD',
          'default': 'MM/DD/YYYY',
        });
      }

      return history_date;
    }//}}}

    return createHistoryDate;
  }//}}}

  function closureCreateHistoryItem(pOptions)//{{{
  {
    console.assert(toType(pOptions) === 'object', "not object type.");
    ['databaseName', 'deleteFunc'].forEach(pKey => {
      console.assert(
          pOptions.hasOwnProperty(pKey), `${pKey} property is not found.`);
    });

    //{{{ local variable
    const db_name         = pOptions.databaseName;
    const delete_function = pOptions.deleteFunc;
    const CLASS_NAME_OF_HISTORY_ITEM  = pOptions.className || 'historyItem';
    const class_name_of_delete_button = pOptions.itemDelete || 'itemDelete';
    const class_name_of_page_icon = pOptions.itemIcon || 'itemIcon';
    const class_name_of_title     = pOptions.itemTitle || 'itemTitle';
    const class_name_of_date      = pOptions.itemDate || 'itemDate';
    const class_name_of_link      = pOptions.itemUrl || 'itemUrl';
    const ATTR_NAME_OF_DATABASE = pOptions.attrNameOfDatabase || 'database';
    const ATTR_NAME_OF_ITEM_ID  = pOptions.attrNameOfItemId || 'historyItemId';
    //}}}

    function createPrototype()//{{{
    {
      let section = document.createElement('section');
      let span    = document.createElement('span');
      let a_tag   = document.createElement('a');
      let img     = document.createElement('img');
      addStringToAttributeOfElement(img, 'class', 'icon16_rev');

      let delete_icon   = img.cloneNode(true);
      let page_icon     = img.cloneNode(true);
      let title_element = span.cloneNode(true);
      let date_element  = span.cloneNode(true);

      addStringToAttributeOfElement(
        section, 'class', CLASS_NAME_OF_HISTORY_ITEM);
      addStringToAttributeOfElement(section, 'class', 'ellipsis');
      addStringToAttributeOfElement(
        section, ATTR_NAME_OF_DATABASE, db_name);

      addStringToAttributeOfElement(delete_icon, 'src', gStrDeleteIconPath);
      addStringToAttributeOfElement(delete_icon, 'alt', 'Delete button');
      addStringToAttributeOfElement(
        delete_icon, 'class', class_name_of_delete_button);

      addStringToAttributeOfElement(page_icon, 'alt', 'page icon');
      addStringToAttributeOfElement(
        page_icon, 'class', class_name_of_page_icon);

      addStringToAttributeOfElement(
          title_element, 'class', class_name_of_title);
      addStringToAttributeOfElement(date_element, 'class', class_name_of_date);

      addStringToAttributeOfElement(a_tag, 'target', '_blank');
      addStringToAttributeOfElement(a_tag, 'class', class_name_of_link);

      a_tag.appendChild(page_icon);
      a_tag.appendChild(title_element);

      section.appendChild(delete_icon);
      section.appendChild(date_element);
      section.appendChild(a_tag);

      return section;
    }//}}}

    function createHistoryItem(pObjItem, pOptions)//{{{
    {
      let default_opts = { // default.
        deleteButton: true,
        date:         true,
        link:         true,
        title:        true,
        icon:         true,
      };

      console.assert(toType(pObjItem) === 'object', "not object type.");
      ['date'].forEach(pKey => {
        console.assert(
            pObjItem.hasOwnProperty(pKey), `${pKey} property is not found.`);
      });

      console.assert(
          toType(pOptions) === 'object' ||
          pOptions === void 0 ||
          pOptions === null,
          "not any type in object, undefined, or null.");

      let prototype_element = createPrototype();
      let item_element      = prototype_element.cloneNode(true);
      let delete_button =
        item_element.querySelector(`.${class_name_of_delete_button}`);
      let date_element  = item_element.querySelector(`.${class_name_of_date}`);
      let link_element  = item_element.querySelector(`.${class_name_of_link}`);
      let icon_element =
        item_element.querySelector(`.${class_name_of_page_icon}`);
      let title_element = item_element.querySelector(`.${class_name_of_title}`);

      if (pOptions !== void 0 && pOptions !== null) {
        Object.keys(pOptions).forEach(v => default_opts[v] = pOptions[v]);
      }

      item_element.setAttribute('name', pObjItem.date);

      if (default_opts.deleteButton) {
        delete_button.setAttribute('name', pObjItem.date);
        delete_button.setAttribute(ATTR_NAME_OF_DATABASE, db_name);
        delete_button.addEventListener('click', delete_function, true);
        if (pObjItem.hasOwnProperty('id')) {
          delete_button.setAttribute(ATTR_NAME_OF_ITEM_ID, pObjItem.id);
        }
      }

      if (default_opts.date !== false) {
        date_element.textContent =
          formatDate(new Date(pObjItem.date), 'hh:mm:ss');
      }

      if (pObjItem.hasOwnProperty('url') && default_opts.link) {
        link_element.setAttribute('href', pObjItem.url);
      }

      if (pObjItem.hasOwnProperty('dataURI') && default_opts.icon) {
        icon_element.setAttribute('src', pObjItem.dataURI);
      }

      if (pObjItem.hasOwnProperty('title') && default_opts.title) {
        title_element.textContent = pObjItem.title;
      }

      return item_element;
    }//}}}

    return createHistoryItem;
  }//}}}

  function showAllHistory()//{{{
  {
    return new Promise((resolve, reject) => {
      getAllHistory()
      .then(pHistoryArray => {
        pHistoryArray = pHistoryArray.reverse();
        showAutoCompleteDateList(pHistoryArray);

        let history_date_list_element =
          document.querySelector(`#${ID_NAME_OF_HISTORY_LIST}`);
        clearItemInElement(history_date_list_element);

        let createHistoryDateFunc =
          closureCreateHistoryDate(opts_for_create_history_date);
        let createHistoryItemFunc =
          closureCreateHistoryItem(
            Object.assign(opts_for_create_history_item,
              { databaseName: gStrDbHistoryName }));

        pHistoryArray.forEach(pValue => {
          let lists = [];
          pValue.data.forEach(pValueJ => {
            lists.push( createHistoryItemFunc(pValueJ) );
          });
          lists = lists.reverse();

          let history_date = createHistoryDateFunc(pValue);
          let history_item_list_element =
            history_date.querySelector(`.${CLASS_NAME_OF_HISTORY_ITEM_LIST}`);
          lists.forEach(pValueZ => {
            history_item_list_element.appendChild(pValueZ);
          });

          history_date_list_element.appendChild(history_date);
        });

        resolve();
      })
      .catch(reject);
    });
  }//}}}

  function getAllHistory()//{{{
  {
    return new Promise((resolve, reject) => {
      if (db === void 0 || db === null) {
        reject(new Error("IndexedDB doesn't initialize yet."));
        return;
      }

      getHistoryListFromIndexedDB(db, gStrDbHistoryName)
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function showSpecificHistoryDateAndItem()//{{{
  {
    let search_history_date_element =
      document.querySelector(`#${ID_NAME_OF_SEARCH_HISTORY_DATE}`);
    let search_history_value        = search_history_date_element.value;
    let search_history_value_length = search_history_value.length;
    let search_history_item_element =
      document.querySelector(`#${ID_NAME_OF_SEARCH_HISTORY_ITEM}`);
    let search_history_item_value = search_history_item_element.value.trim();
    let search_history_item_value_length = search_history_item_value.length;
    let date_list_element =
      document.querySelectorAll(`.${CLASS_NAME_OF_HISTORY_DATE}`);
    let regex_item = new RegExp(search_history_item_value, 'ig');

    let search_time = 0;
    if (search_history_value_length > 0) {
      let matchies    = search_history_value.match(/(\d+)-(\d+)-(\d+)/);
      let date_search = new Date(matchies[1], matchies[2] - 1, matchies[3]);
      search_time = date_search.getTime();
    }

    Array.prototype.slice.call(date_list_element).forEach(pValue => {
      let date = new Date(parseInt(pValue.name, 10));

      if (search_history_value_length === 0 || date.getTime() === search_time) {
        removeStringFromAttributeOfElement(
          pValue, 'class', CLASS_NAME_OF_DOES_NOT);
      } else {
        addStringToAttributeOfElement(pValue, 'class', CLASS_NAME_OF_DOES_NOT);
        return;
      }

      let history_item_element =
        pValue.querySelectorAll(`.${CLASS_NAME_OF_HISTORY_ITEM}`);
      let count = 0;
      Array.prototype.slice.call(history_item_element).forEach(pValueJ => {
        let item_title_element =
          pValueJ.querySelector(`.${CLASS_NAME_OF_HISTORY_ITEM_TITLE}`);
        let item_url_element   =
          pValueJ.querySelector(`.${CLASS_NAME_OF_HISTORY_ITEM_URL}`);
        if (search_history_item_value_length === 0 ||
            regex_item.test(item_title_element.textContent) ||
            regex_item.test(item_url_element.href)) {
          removeStringFromAttributeOfElement(
            pValueJ, 'class', CLASS_NAME_OF_DOES_NOT);
        } else {
          addStringToAttributeOfElement(
            pValueJ, 'class', CLASS_NAME_OF_DOES_NOT);
          ++count;
        }
      });

      if (count === history_item_element.length) {
        addStringToAttributeOfElement(pValue, 'class', CLASS_NAME_OF_DOES_NOT);
      } else {
        removeStringFromAttributeOfElement(
          pValue, 'class', CLASS_NAME_OF_DOES_NOT);
      }
    });
  }//}}}

  function changeMenu(pName)//{{{
  {
    console.assert(toType(pName) === 'string', "not string type.");

    return new Promise((resolve, reject) => {
      menuToggle.show(pName)
        .then(processAfterMenuSelection(pName))
        .then(resolve)
        .catch(reject);
    });
  }//}}}

  function sectionButtonClicked(pEvent)//{{{
  {
    let target = pEvent.target;
    if (target.getAttribute('class') !== CLASS_NAME_OF_BUTTON) {
      return;
    }

    changeMenu(target.getAttribute('name'));
  }//}}}

  function applyNewOptionToExtensionProcess()//{{{
  {
    return new Promise(resolve => {
      console.log("apply new option to this extension's process.");
      chrome.runtime.sendMessage({ event: 'reload_option_value' });
      resolve();
    });
  }//}}}

  function updateOptionValueToStorage(pEvent)//{{{
  {
    let target = pEvent.target;
    let name = target.getAttribute('name');
    if (name === void 0 || name === null || name.length === 0) {
      return;
    }

    operateOption.get(document, name)
      .then(rItem => {
        return new Promise(resolve => {
          let write   = {};
          write[name] = rItem;
          chrome.storage.local.set(write, () => {
            console.log(
              `have wrote the data. name: ${name}, value: ${rItem}`);
            resolve();
          });
        });
      })
      .then(applyNewOptionToExtensionProcess)
      .catch(rMes => console.error(rMes));
  }//}}}

  function initSessionHistory()//{{{
  {
    return new Promise((resolve, reject)=> {
      clearSessionTitleInSessionControlBar()
        .then(changeSessionIconControlState(false))
        .then(showAllSessionHistory)
        .then(selectCurrentSession)
        .then(resolve)
        .catch(reject);
    });
  }//}}}

  let initSessionHistoryEvent = (() => {//{{{
    let session_save_element =
      document.querySelector(`#${ID_NAME_OF_SESSION_SAVE}`);
    let session_delete_element =
      document.querySelector(`#${ID_NAME_OF_SESSION_DELETE}`);
    let session_restore_element =
        document.querySelector(`#${ID_NAME_OF_SESSION_RESTORE}`);

    let commonFunc = function(pEvent) {//{{{
      return new Promise((resolve, reject)=> {
        (() => {
          let lStrIdName = pEvent.target.getAttribute('id');
          if (lStrIdName === session_save_element.getAttribute('id')) {
            return saveSession();
          } else if (lStrIdName === session_delete_element.getAttribute('id')) {
            return deleteSession();
          }
        })()
        .then(initSessionHistory)
        .then(resolve)
        .catch(reject);
      });
    };//}}}

    return function() {
      session_save_element.addEventListener('click', commonFunc, true);
      session_delete_element.addEventListener('click', commonFunc, true);
      session_restore_element.addEventListener('click', restoreSession, true);

      clearSessionTitleInSessionControlBar()
      .then(changeSessionIconControlState(false));
    };
  })();//}}}

  function initHistoryEvent()//{{{
  {
    return new Promise(resolve => {
      let search_history_date_element =
        document.querySelector(`#${ID_NAME_OF_SEARCH_HISTORY_DATE}`);
      let search_history_item_element =
        document.querySelector(`#${ID_NAME_OF_SEARCH_HISTORY_ITEM}`);

      search_history_date_element.addEventListener(
        'change', showSpecificHistoryDateAndItem, true);
      search_history_item_element.addEventListener(
        'keyup', showSpecificHistoryDateAndItem, true);

      resolve();
    });
  }//}}}

  function initSectionBarEvent(pEvent)//{{{
  {
    return new Promise((resolve, reject) => {
      try {
        let button_elements =
          pEvent.querySelectorAll(`.${CLASS_NAME_OF_BUTTON}`);
        Array.prototype.slice.call(button_elements).forEach(pValue => {
          pValue.addEventListener('click', sectionButtonClicked, true);
        });
        resolve();
      } catch (rError) {
        reject(rError);
      }
    });
  }//}}}

  function initOptionElementEvent(pEvent)//{{{
  {
    return new Promise(resolve => {
      let input_elements    = pEvent.querySelectorAll("input");
      let textarea_elements = pEvent.querySelectorAll("textarea");
      let select_elements   = pEvent.querySelectorAll("select");

      Array.prototype.slice.call(input_elements).forEach(pValue => {
        pValue.addEventListener('keyup', updateOptionValueToStorage, true);
        pValue.addEventListener('change', updateOptionValueToStorage, true);
      });

      Array.prototype.slice.call(textarea_elements).forEach(pValue => {
        pValue.addEventListener('keyup', updateOptionValueToStorage, true);
      });

      Array.prototype.slice.call(select_elements).forEach(pValue => {
        pValue.addEventListener('change', updateOptionValueToStorage, true);
      });

      resolve();
    });
  }//}}}

  function initKeybindEvent(pEvent)//{{{
  {
    return new Promise(resolve => {
      pEvent.addEventListener('keyup', keyupEvent, true);
      resolve();
    });
  }//}}}

  function initButtonEvent(pEvent)//{{{
  {
    return new Promise(resolve => {
      let button_elements = pEvent.querySelectorAll('button');
      Array.prototype.slice.call(button_elements).forEach(pValue => {
        pValue.addEventListener('click', buttonClicked, true);
      });

      resolve();
    });
  }//}}}

  document.addEventListener('DOMContentLoaded', () => {//{{{
    (() => {
      return new Promise(resolve => {
        db = new Database(gStrDbName, gNumDbVersion);
        db.open(gObjDbCreateStores);
        resolve();
      });
    })()
    .then(loadTranslation(document, gStrTranslationPath))
    .then(operateOption.load(document))
    .then(initSectionBarEvent(document))
    .then(initOptionElementEvent(document))
    .then(initButtonEvent(document))
    .then(initKeybindEvent(document))
    .then(initHistoryEvent(document))
    .then(initSessionHistoryEvent(document))
    .then(() => {
      let args_in_url = getQueryString(document);
      let menu = (args_in_url === void 0 ||
                  args_in_url === null ||
                  !args_in_url.hasOwnProperty('page')) ? DEFAULT_MENU :
                                                         args_in_url.page;
      return changeMenu(menu);
    })
    .catch(rErr => console.error(rErr));
  }, true);//}}}
}(this, this.document));
