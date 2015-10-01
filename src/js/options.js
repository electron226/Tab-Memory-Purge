(function(window, document) {
  'use strict';

  //{{{ variables
  var db = null; // indexedDB class.

  const sStrDefaultMenu = "normal";

  const sStrClassNameOfDoesNot  = 'doNotShow';
  const sStrStyleDisplayNone    = 'display: none;';

  const sStrClassNameOfMenu   = 'sectionMenu';
  const sStrClassNameOfButton = 'sectionButton';
  const sStrClassNameWhenSelect = 'select';

  const sStrClassNameOfCopyBtn  = 'copy';
  const sStrClassNameOfApplyBtn = 'apply';

  const sStrClassNameOfSetKeybindButton   = 'keybind_set';
  const sStrClassNameOfClearKeybindButton = 'keybind_clear';
  const sStrClassNameOfKeybindOption      = 'keyOption';
  const sStrClassNameOfShowKeybind        = 'pressKey';
  const sStrClassNameOfKeybindValue       = 'keybindValue';

  const sStrClassNameOfHistoryItem       = 'historyItem';
  const sStrClassNameOfHistoryDate       = 'historyDate';
  const sStrClassNameOfHistoryItemDelete = 'itemDelete';
  const sStrClassNameOfHistoryItemIcon   = 'itemIcon';
  const sStrClassNameOfHistoryItemUrl    = 'itemUrl';
  const sStrClassNameOfHistoryItemDate   = 'itemDate';
  const sStrClassNameOfHistoryItemTitle  = 'itemTitle';
  const sStrClassNameOfHistoryItemList   = 'itemList';
  const sStrAttrNameOfWindowId           = 'windowId';
  const sStrAttrNameOfDatabase           = 'databaseName';
  const sStrAttrNameOfItemId             = 'historyItemId';

  const sStrIdNameOfHistoryList             = 'historyList';
  const sStrIdNameOfSearchHistoryDate       = 'searchHistoryDate';
  const sStrIdNameOfSearchHistoryItem       = 'searchHistoryItem';
  const sStrIdNameOfSearchHistoryDateList   = 'historyDateList';

  const sStrIdNameOfDateListNav             = 'dateListNav';
  const sStrIdNameOfDateList                = 'dateList';
  const sStrIdNameOfAddSavedSessionDateList = 'savedSessionDateList';
  const sStrIdNameOfSessionDateList         = 'sessionDateList';
  const sStrIdNameOfSessionNotFound         = 'sessionNotFound';
  const sStrIdNameOfSavedSessionDateTitle   = 'savedSessionDateTitle';
  const sStrIdNameOfSessionList             = 'sessionList';
  const sStrIdNameOfSessionTitle            = 'sessionTitle';
  const sStrIdNameOfSessionSave             = 'sessionSave';
  const sStrIdNameOfSessionDelete           = 'sessionDelete';
  const sStrIdNameOfSessionRestore          = 'sessionRestore';
  const sStrIdNameOfSessionIconControl      = 'sessionIconControl';
  const sStrIdNameOfChangeHistory           = 'change_history';
  const sStrIdNameOfExport                  = 'export';
  const sStrIdNameOfImport                  = 'import';

  const sObjOptsForCreateHistoryDate = {
    className:  sStrClassNameOfHistoryDate,
    deleteFunc: function(pEvent) {
      var lElSearchHistoryDate = document.createDocumentFragment();
      var lStrErrMsg = "";

      lStrErrMsg = checkFunctionArguments(arguments, [
        function(pValue) { return (typeof pValue !== 'object'); },
      ]);
      if (lStrErrMsg) {
        throw new Error(lStrErrMsg);
      }

      return removeHistoryDate(pEvent)
             .then(getAllHistory)
             .then(historyArray => {
               lElSearchHistoryDate =
                 document.querySelector(`#${sStrIdNameOfSearchHistoryDate}`);
               lElSearchHistoryDate.value = null;

               return showAutoCompleteDateList(historyArray.reverse());
             });
    },
    itemDelete: sStrClassNameOfHistoryItemDelete,
    itemDate:   sStrClassNameOfHistoryItemDate,
    itemList:   sStrClassNameOfHistoryItemList,
  };
  const sObjOptsForCreateHistoryItem = {
    attrNameOfDatabase: sStrAttrNameOfDatabase,
    deleteFunc: function(pEvent) {
      var lStrErrMsg = "";

      lStrErrMsg = checkFunctionArguments(arguments, [
        function(pValue) { return (typeof pValue !== 'object'); },
      ]);
      if (lStrErrMsg) {
        throw new Error(lStrErrMsg);
      }

      return removeHistoryItem(pEvent);
    },
    className:  sStrClassNameOfHistoryItem,
    itemDelete: sStrClassNameOfHistoryItemDelete,
    itemDate:   sStrClassNameOfHistoryItemDate,
    itemUrl:    sStrClassNameOfHistoryItemUrl,
    itemIcon:   sStrClassNameOfHistoryItemIcon,
    itemTitle:  sStrClassNameOfHistoryItemTitle,
  };

  var sMapExcludeKeyNames = new Set();
  sMapExcludeKeyNames.add(gStrVersionKey);
  sMapExcludeKeyNames.add(gStrPreviousSessionTimeKey);
  //}}}

  var OperateOptionValue = function() {//{{{
  };
  OperateOptionValue.prototype.get = function(pElement, pStrName) {//{{{
    var lStrErrMsg = "";

    lStrErrMsg = checkFunctionArguments(arguments, [
      function(pValue) { return (typeof pValue !== 'object'); },
      [ 'string' ],
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    return this.call(pElement, pStrName, null, 'get');
  };//}}}
  OperateOptionValue.prototype.set =//{{{
    function(pElement, pStrName, pStrValue) {
    var lStrErrMsg = "";

    lStrErrMsg = checkFunctionArguments(arguments, [
      function(pValue) { return (typeof pValue !== 'object'); },
      [ 'string' ],
      [],
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    return this.call(pElement, pStrName, pStrValue, 'set');
  };//}}}
  OperateOptionValue.prototype.call =//{{{
    function(pElement, pStrName, pStrValue, pStrType) {
    var $this      = this;
    var lObjOpts   = {};
    var lElement   = document.createDocumentFragment();
    var lElSelect  = document.createDocumentFragment();
    var lStrErrMsg = '';
    var lArrayArgs = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      lStrErrMsg = checkFunctionArguments(lArrayArgs, [
        function(pValue) { return (typeof pValue !== 'object'); },
        [ 'string' ],
        [ ],
        [ 'string', 'null', 'undefined' ],
      ], true);
      if (lStrErrMsg) {
        reject(new Error(lStrErrMsg));
        return;
      }

      pStrType = pStrType || 'get';

      lElement = pElement.querySelector(`[name="${pStrName}"`);
      if (lElement) {
        try {
          lObjOpts = {
            element:   lElement,
            value:     pStrValue,
            type:      pStrType,
          };
          switch (lElement.type) {
          case 'checkbox':
            lObjOpts = Object.assign(lObjOpts, {
              property:  'checked',
              valueType: 'boolean',
            });
            break;
          case 'number':
          case 'text':
          case 'textarea':
            lObjOpts = Object.assign(lObjOpts, {
              property:  'value',
              valueType: (lElement.type === 'number') ? 'number' : 'string',
            });
            break;
          case 'select-one':
            lElSelect = lElement.querySelectorAll('option');
            if (pStrType === 'get') {
              Array.prototype.slice.call(lElSelect).forEach(pValue => {
                if (pValue.selected === true) {
                  resolve(pValue.getAttribute('value'));
                }
              });
            } else {
              Array.prototype.slice.call(lElSelect).forEach(pValue => {
                if (pValue.getAttribute('value') === pStrValue) {
                  pValue.selected = true;
                } else {
                  pValue.selected = false;
                }
              });
            }
            return;
          default:
            reject(new Error(
              `Doesn't write the code of each element type.` +
              ` name: ${pStrName}, type: ${lElement.type}`));
            break;
          }

          $this._call(lObjOpts).then(resolve).catch(reject);
          return;
        } catch (pErr) {
          reject(new Error(pErr));
          return;
        }
      }

      if (!sMapExcludeKeyNames.has(pStrName)) {
        console.warn(`Doesn't find the elememt name: ${pStrName}`);
      }
      resolve();
    });
  };//}}}
  OperateOptionValue.prototype._call = function(pObj) {//{{{
    var lElement      = document.createDocumentFragment();
    var lStrValue     = "";
    var lStrType      = "";
    var lStrProperty  = "";
    var lStrValueType = "";
    var lAnyVal       = "";
    var lNumMax       = 0;
    var lNumMin       = 0;
    var lStrErrMsg    = '';
    var lArrayArgs    = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      lStrErrMsg = checkFunctionArguments(lArrayArgs, [
        [ 'object' ],
      ]);
      if (lStrErrMsg) {
        reject(new Error(lStrErrMsg));
        return;
      }

      lElement      = pObj.element;
      lStrValue     = pObj.value;
      lStrType      = pObj.type;
      lStrProperty  = pObj.property;
      lStrValueType = pObj.valueType;
      lAnyVal       = (lStrType === 'get') ?
                      lElement[lStrProperty] : lStrValue;

      if (lStrValueType === 'number') {
        lNumMin = parseInt(lElement.getAttribute('min'));
        lNumMax = parseInt(lElement.getAttribute('max'));
        lAnyVal = parseInt(lAnyVal);

        if (lNumMin && lAnyVal < lNumMin) {
          lAnyVal = lNumMin;
          lElement.value = lNumMin;
        } else if (lNumMax && lNumMax < lAnyVal){
          lAnyVal = lNumMax;
          lElement.value = lNumMax;
        }
      }

      if (toType(lAnyVal) !== lStrValueType) {
        reject(new Error(
          `${lAnyVal} is not ${lStrValueType} type: ${toType(lAnyVal)}`));
        return;
      }

      if (lStrType === 'get') {
        resolve(lAnyVal);
      } else {
        lElement[lStrProperty] =
          (toType(lAnyVal) === 'string') ? lAnyVal.trim() : lAnyVal;
        resolve();
      }
    });
  };//}}}
  OperateOptionValue.prototype.init = function(pElement) {//{{{
    var lStrErrMsg = checkFunctionArguments(arguments, [
      function(pValue) { return (typeof pValue !== 'object'); },
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    return this.load(pElement, gMapDefaultValues);
  };//}}}
  OperateOptionValue.prototype.load = function(pElement, pObjOpts) {//{{{
    var $this         = this;
    var lMapNew       = new Map();
    var lArrayPromise = [];
    var lStrErrMsg    = '';
    var lArrayArgs    = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      lStrErrMsg = checkFunctionArguments(lArrayArgs, [
        function(pValue) { return (typeof pValue !== 'object'); },
        [ 'object', 'map', 'null', 'undefined' ],
      ], true);
      if (lStrErrMsg) {
        reject(new Error(lStrErrMsg));
        return;
      }

      $this.export()
      .then(rOptions => {
        switch (toType(pObjOpts)) {
        case 'map':
          lMapNew = pObjOpts;
          break;
        case 'object':
          lMapNew = new Map();
          Object.keys(pObjOpts).forEach(pKey => {
            lMapNew.set(pKey, pObjOpts[pKey]);
          });
          break;
        default:
          lMapNew = rOptions;
        }

        lMapNew.forEach((pValue, pKey) => {
          lArrayPromise.push($this.set(pElement, pKey, pValue));
        });

        return Promise.all(lArrayPromise);
      })
      .then(resolve)
      .catch(reject);
    });
  };//}}}
  OperateOptionValue.prototype.export = function() {//{{{
    var lResult = new Map();

    return new Promise(resolve => {
      chrome.storage.local.get(items => {
        lResult = new Map();
        gMapDefaultValues.forEach((v, key) => {
          lResult.set(key, items.hasOwnProperty(key) ? items[key] : v);
        });
        resolve(lResult);
      });
    });
  };//}}}
  OperateOptionValue.prototype.import = function(pElement, pObjOpts) {//{{{
    var $this      = this;
    var lStrErrMsg = '';
    var lArrayArgs = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      lStrErrMsg = checkFunctionArguments(lArrayArgs, [
        function(pValue) { return typeof pValue !== 'object'; },
        [ 'object' ],
      ], true);
      if (lStrErrMsg) {
        reject(new Error(lStrErrMsg));
        return;
      }

      $this.load(pElement, pObjOpts)
      .then(resolve(pObjOpts))
      .catch(reject);
    });
  };//}}}
  //}}}

  var ShowMenuSelection = function(pStrSelectors, pClassNameWhenSelect) {//{{{
    ShowMenuSelection.toggleSectionRegex = /(display:\s*)(\w+);/i;

    var lStrErrMsg = "";

    lStrErrMsg = checkFunctionArguments(arguments, [
      [ 'object' ],
      [ 'string' ],
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    this.strMenuSelector        = pStrSelectors.menu;
    this.strButtonSelector      = pStrSelectors.button;
    this.strClassNameWhenSelect = pClassNameWhenSelect;
  };
  ShowMenuSelection.prototype.showMenu = function(pStrSelector) {//{{{
    var lStrErrMsg = "";

    lStrErrMsg = checkFunctionArguments(arguments, [
      [ 'string' ],
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    return function(pIdName) {
      var lElShowMenu        = document.createDocumentFragment();
      var lElDoesNotShowMenu = document.createDocumentFragment();

      lStrErrMsg = checkFunctionArguments(arguments, [
        [ 'string' ],
      ]);
      if (lStrErrMsg) {
        throw new Error(lStrErrMsg);
      }

      lElShowMenu = document.querySelector(`${pStrSelector}#${pIdName}`);
      lElDoesNotShowMenu =
        document.querySelectorAll(`${pStrSelector}:not(#${pIdName})`);

      removeStringFromAttributeOfElement(
        lElShowMenu, 'style', sStrStyleDisplayNone);
      Array.prototype.slice.call(lElDoesNotShowMenu).forEach(pValue => {
        addStringToAttributeOfElement(pValue, 'style', sStrStyleDisplayNone);
      });
    };
  };//}}}
  ShowMenuSelection.prototype.changeSelectionButtonColor = //{{{
    function(pStrSelector) {

    var $this      = this;
    var lStrErrMsg = "";

    lStrErrMsg = checkFunctionArguments(arguments, [
      [ 'string' ],
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    return function(pName) {
      var lElPrevSelect = document.createDocumentFragment();
      var lElNewSelect  = document.createDocumentFragment();

      lStrErrMsg = checkFunctionArguments(arguments, [
        [ 'string' ],
      ]);
      if (lStrErrMsg) {
        throw new Error(lStrErrMsg);
      }

      lElPrevSelect = document.querySelector(
        `${pStrSelector}.${$this.strClassNameWhenSelect}`);
      if (lElPrevSelect !== null) {
        removeStringFromAttributeOfElement(
          lElPrevSelect, 'class', $this.strClassNameWhenSelect);
      }

      lElNewSelect = document.querySelector(`${pStrSelector}[name="${pName}"]`);
      addStringToAttributeOfElement(
        lElNewSelect, 'class', $this.strClassNameWhenSelect);
    };
  };//}}}
  ShowMenuSelection.prototype.show = function(pName) {//{{{
    var lStrErrMsg = "";

    lStrErrMsg = checkFunctionArguments(arguments, [
      [ 'string' ],
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    var showMenuArea     = this.showMenu(this.strMenuSelector);
    var selectMenuButton =
      this.changeSelectionButtonColor(this.strButtonSelector);

    return new Promise(resolve => {
      showMenuArea(pName);
      selectMenuButton(pName);

      resolve(pName);
    });
  };//}}}
  //}}}

  var KeyTrace = function(pId) {//{{{
    this.id        = pId || null;
    this.objResult = null;
  };
  KeyTrace.prototype.start = function(pId) {//{{{
    var lStrErrMsg = "";

    lStrErrMsg = checkFunctionArguments(arguments, [
      function(pValue) { return pValue === void 0 || pValue === null; },
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    this.id = pId;
  };//}}}
  KeyTrace.prototype.traceEvent = function(pEvent) {//{{{
    var lStrErrMsg = "";

    lStrErrMsg = checkFunctionArguments(arguments, [
      function(pValue) { return (typeof pValue !== 'object'); },
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

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

  function processAfterMenuSelection(name)//{{{
  {
    var lStrErrMsg = "";

    lStrErrMsg = checkFunctionArguments(arguments, [
      [ 'string' ],
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    return new Promise((resolve, reject) => {
      switch (name) {
      case 'normal':
        break;
      case 'keybind':
        setTimeout(showAllKeybindString, 500);
        break;
      case 'information':
        break;
      case 'history':
        var historyFunc = function() {
          showAllHistory()
          .then(resolve)
          .catch(e => console.error(e));
        };

        if (db.isOpened()) {
          historyFunc();
        } else {
          setTimeout(historyFunc, 1000);
        }
        break;
      case 'session_history':
        var sessionHistoryFunc = function() {
          initSessionHistory()
          .then(resolve)
          .catch(e => console.error(e));
        };

        if (db.isOpened()) {
          sessionHistoryFunc();
        } else {
          setTimeout(sessionHistoryFunc, 1000);
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

      history.pushState(name,
        `${document.title} ${chrome.i18n.getMessage(name)}`,
        `${gStrOptionPage}?page=${name}`);
    });
  }//}}}

  //{{{ A variable of a function of using closure.
  const operateOption = new OperateOptionValue();
  const keybindTrace  = new KeyTrace();
  const menuToggle    = new ShowMenuSelection(
    {
      menu:   `.${sStrClassNameOfMenu}`,
      button: `.${sStrClassNameOfButton}`,
    },
    sStrClassNameWhenSelect);
  //}}}
  //
  window.addEventListener('popstate', e => {//{{{
    if (e.state) {
      menuToggle.show(e.state || sStrDefaultMenu);
    }
  }, true);//}}}

  function clearItemInElement(pNode)//{{{
  {
    var lStrErrMsg = "";

    lStrErrMsg = checkFunctionArguments(arguments, [
      function(pValue) { return (typeof pValue !== 'object'); },
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    while(pNode.firstChild) {
      pNode.removeChild(pNode.firstChild);
    }
    return pNode;
  }//}}}

  function deleteKeyItemFromObject(pObj, pDeleteKeys)//{{{
  {
    var lObjNew         = null;
    var lObjType        = "";
    var lDeleteKeysType = "";
    var lStrErrMsg      = "";

    lStrErrMsg = checkFunctionArguments(arguments, [
      [ 'object', 'set', 'map' ],
      [ 'array', 'object', 'map', 'set' ],
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    lObjNew         = pObj;
    lObjType        = toType(pObj);
    lDeleteKeysType = toType(pDeleteKeys);

    if (lDeleteKeysType === 'object') {
      Object.keys(pDeleteKeys).forEach(pKey => {
        if (lObjType === 'object') {
          delete lObjNew[ pDeleteKeys[pKey] ];
        } else {
          lObjNew.delete(pDeleteKeys[pKey]);
        }
      });
    } else {
      // the deleteKeysType is Array, map, or set.
      pDeleteKeys.forEach((pValue, pKey) => {
        if (lObjType === 'object') {
          delete lObjNew[ pKey ];
        } else {
          // the objType is map or set.
          lObjNew.delete(pKey);
        }
      });
    }

    return lObjNew;
  }//}}}

  function showOptionValuesToOperateSettingsPage()//{{{
  {
    var lElExport = document.querySelector(`#${sStrIdNameOfExport}`);
    var lNewOpts  = {};
    var lObj      = {};

    return new Promise(resolve => {
      operateOption.export()
      .then(pMapOptions => {
        lObj = {};
        pMapOptions.forEach((pValue, pKey) => {
          lObj[ pKey ] = pValue;
        });
        lNewOpts        = deleteKeyItemFromObject(lObj, sMapExcludeKeyNames);
        lElExport.value = JSON.stringify(lNewOpts, null, '    ');

        resolve();
      });
    });
  }//}}}

  function showChangeHistory()//{{{
  {
    var lElChangeHistory = document.createDocumentFragment();

    return new Promise(resolve => {
      ajax({ url: gStrChangeHistory, responseType: 'text' })
      .then(result => {
        lElChangeHistory =
          document.querySelector(`#${sStrIdNameOfChangeHistory}`);
        lElChangeHistory.innerText = result.response;

        resolve();
      });
    });
  }//}}}

  function showAllKeybindString()//{{{
  {
    console.log('showAllKeybindString');

    var lElKeybindOptions = document.createDocumentFragment();
    var lElKeyJson        = document.createDocumentFragment();
    var lElKey            = document.createDocumentFragment();

    lElKeybindOptions =
      document.querySelectorAll(`.${sStrClassNameOfKeybindOption}`);
    Array.prototype.slice.call(lElKeybindOptions).forEach(pValue => {
      lElKeyJson = pValue.querySelector(`.${sStrClassNameOfKeybindValue}`);
      lElKey     = pValue.querySelector(`.${sStrClassNameOfShowKeybind}`);
      try {
        if (lElKeyJson.value === '{}' ||
            lElKeyJson.value === ''   ||
            lElKeyJson.value === null ||
            lElKeyJson.value === void 0) {
          return;
        }

        lElKey.value = generateKeyString(JSON.parse(lElKeyJson.value));
      } catch (e) {
        console.warn(e, lElKeyJson.value);
      }
    });
  }//}}}

  function setKeybindOption(pClassName, pKeyInfo)//{{{
  {
    var lElOpt          = document.createDocumentFragment();
    var lElKeybindValue = document.createDocumentFragment();
    var lElShowKeybind  = document.createDocumentFragment();
    var lStrErrMsg      = "";

    lStrErrMsg = checkFunctionArguments(arguments, [
      [ 'string' ],
      [ 'object' ],
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    lElOpt = document.querySelector(
      `.${pClassName}.${sStrClassNameOfKeybindOption}`);
    lElKeybindValue = lElOpt.querySelector(`.${sStrClassNameOfKeybindValue}`);
    lElShowKeybind = lElOpt.querySelector(`.${sStrClassNameOfShowKeybind}`);

    lElKeybindValue.value = JSON.stringify(pKeyInfo);
    try {
      lElShowKeybind.value = generateKeyString(pKeyInfo);
    } catch (e) {
      lElShowKeybind.value = '';
    }
  }//}}}

  function keyupEvent(pEvent)//{{{
  {
    var lObjInfo       = {};
    var lEventNew      = document.createEvent('HTMLEvents');
    var lElTraceTarget = document.createDocumentFragment();
    var lStrErrMsg     = "";

    lStrErrMsg = checkFunctionArguments(arguments, [
      function(pValue) { return (typeof pValue !== 'object'); },
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    if (keybindTrace.isRun()) {
      lObjInfo = keybindTrace.traceEvent(pEvent);
      setKeybindOption(lObjInfo.id, lObjInfo.key);

      // save the keybind with using event to storage.
      lEventNew = document.createEvent('HTMLEvents');
      lEventNew.initEvent('change', false, true);

      lElTraceTarget = document.querySelector(
        `[name="${lObjInfo.id}"].${sStrClassNameOfKeybindValue}`);
      lElTraceTarget.dispatchEvent(lEventNew);
    }
  }//}}}

  function buttonClicked(pEvent)//{{{
  {
    var lElTarget             = document.createDocumentFragment();
    var lElement              = document.createDocumentFragment();
    var lElExport             = document.createDocumentFragment();
    var lElImport             = document.createDocumentFragment();
    var lEventNew             = document.createEvent('HTMLEvents');
    var lStrClassName         = "";
    var lStrClassNameOfParent = "";
    var lStrOptionName        = "";
    var lStrMsg               = "";
    var lStrValue             = "";
    var lStrErrMsg            = "";
    var lBoolResult           = false;

    lStrErrMsg = checkFunctionArguments(arguments, [
      function(pValue) { return (typeof pValue !== 'object'); },
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    lElTarget    = pEvent.target;
    lStrClassName = lElTarget.getAttribute('class');

    // keybind only.
    lStrClassNameOfParent = lElTarget.parentNode.getAttribute('class');
    lStrOptionName        = "";
    if (lStrClassNameOfParent) {
      lStrOptionName = lStrClassNameOfParent.replace(
        sStrClassNameOfKeybindOption, '').trim();
    }

    switch (lStrClassName) {
    case sStrClassNameOfSetKeybindButton:
      if (keybindTrace.isRun()) {
        keybindTrace.stop();
      }
      keybindTrace.start(lStrOptionName);
      break;
    case sStrClassNameOfClearKeybindButton:
      setKeybindOption(lStrOptionName, {});

      // save the keybind with using event to storage.
      lElement  = document.querySelector(
        `[name="${lStrOptionName}"].${sStrClassNameOfKeybindValue}`);
      lEventNew = document.createEvent('HTMLEvents');
      lEventNew.initEvent('change', false, true);
      lElement.dispatchEvent(lEventNew);
      break;
    case sStrClassNameOfCopyBtn:
      lElExport = document.querySelector(`#${sStrIdNameOfExport}`);
      lElExport.select();

      lBoolResult = document.execCommand('copy');
      lStrMsg    = lBoolResult ? 'successed' : 'failured';
      console.log(`have copied the string of import area. it is ${lStrMsg}.`);

      window.getSelection().removeAllRanges();
      break;
    case sStrClassNameOfApplyBtn:
      lElImport = document.querySelector(`#${sStrIdNameOfImport}`);

      try {
        lStrValue = JSON.parse(lElImport.value.trim());
      } catch (e) {
        if (e instanceof SyntaxError) {
          lStrMsg = "Invalid the json string. The value doesn't correct:\n" +
                    e.message;
          console.error(lStrMsg);
          alert(lStrMsg);
        } else {
          console.error(e);
        }
        break;
      }

      lStrValue = deleteKeyItemFromObject(lStrValue, sMapExcludeKeyNames);
      operateOption.import(document, lStrValue)
      .then(writeOptions => {
        return new Promise(
          resolve => chrome.storage.local.set(writeOptions, resolve));
      })
      .then(showOptionValuesToOperateSettingsPage)
      .then(applyNewOptionToExtensionProcess)
      .catch(e => console.error(e));
      break;
    }
  }//}}}

  function addAutocompleteDateList(pElement)//{{{
  {
    var lElAutoComp = document.createDocumentFragment();
    var lElOption   = document.createDocumentFragment();
    var lStrErrMsg  = "";

    lStrErrMsg = checkFunctionArguments(arguments, [
      function(pValue) { return (typeof pValue !== 'object'); },
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    lElAutoComp = pElement;
    lElOption   = document.createElement('option');

    while (lElAutoComp.firstChild) {
      lElAutoComp.removeChild(lElAutoComp.firstChild);
    }

    return function(pDate) {
      var lElNewOption   = lElOption.cloneNode(true);
      lElNewOption.value = formatDate(pDate, 'YYYY-MM-DD');
      lElAutoComp.appendChild(lElNewOption);
    };
  }//}}}

  function getFormatEachLanguages(pTime, pObjFormat)//{{{
  {
    var lStrFormatType = "";
    var lStrLang       = "";
    var lStrErrMsg     = "";

    lStrErrMsg = checkFunctionArguments(arguments, [
      [ 'number', 'date' ],
      [ 'object', 'undefined', 'null' ],
    ], true);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    lStrFormatType = "";
    lStrLang       = chrome.i18n.getUILanguage();

    if (pTime === void 0 || pTime === null) {
      throw new Error(`Invalid arguments is pTime: ${pTime}`);
    }

    if (pObjFormat === void 0 || pObjFormat === null) {
      pObjFormat = {
        'ja':      'YYYY/MM/DD hh:mm:ss',
        'default': 'MM/DD/YYYY hh:mm:ss',
      };
    }

    lStrFormatType = pObjFormat.hasOwnProperty(lStrLang) ?
                     pObjFormat[lStrLang] :
                     pObjFormat['default'];
    return formatDate(new Date(pTime), lStrFormatType);
  }//}}}

  function changeSessionIconControlState(pState)//{{{
  {
    var lElSessionIconControl = document.createDocumentFragment();
    var lStrErrMsg            = "";

    lStrErrMsg = checkFunctionArguments(arguments, [
      [ 'boolean' ]
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    lElSessionIconControl =
      document.querySelector(`#${sStrIdNameOfSessionIconControl}`);
    if (pState) {
      removeStringFromAttributeOfElement(
        lElSessionIconControl, 'class', sStrClassNameOfDoesNot);
    } else {
      addStringToAttributeOfElement(
        lElSessionIconControl, 'class', sStrClassNameOfDoesNot);
    }
  }//}}}

  function clearSessionTitleInSessionControlBar()//{{{
  {
    return new Promise(resolve => {
      var lElSessionTitle = document.createDocumentFragment();

      lElSessionTitle = document.querySelector(`#${sStrIdNameOfSessionTitle}`);
      lElSessionTitle.textContent = '';
      resolve();
    });
  }//}}}

  function saveSession()//{{{
  {
    return new Promise((resolve, reject) => {
      var lElAddLocationWhereSessionList = document.createDocumentFragment();
      var lElShowField                   = document.createDocumentFragment();
      var lElItemUrlList                 = document.createDocumentFragment();
      var lMapUrlsOfEachWin              = new Map();
      var arrayNewSessions               = [];
      var lArrayUrls                     = [];
      var lStrItemUrl                    = "";
      var lNumWinId                      = 0;
      var lDateNow                       = Date.now();

      lElAddLocationWhereSessionList =
        document.querySelector(`#${sStrIdNameOfSessionList}`);
      lElShowField = lElAddLocationWhereSessionList.querySelectorAll(
        `fieldset:not(.${sStrClassNameOfDoesNot})`);
      if (lElShowField.length === 0) {
        resolve();
        return;
      }

      lMapUrlsOfEachWin = new Map();
      lStrItemUrl       = sObjOptsForCreateHistoryItem.itemUrl;

      Array.prototype.slice.call(lElShowField).forEach(pValue => {
        lNumWinId      = pValue.getAttribute(sStrAttrNameOfWindowId);
        lElItemUrlList = pValue.querySelectorAll(`.${lStrItemUrl}`);
        lArrayUrls     = [];
        Array.prototype.slice.call(lElItemUrlList)
          .forEach(v => lArrayUrls.push(v.href));
        lMapUrlsOfEachWin.set(lNumWinId, lArrayUrls);
      });

      lDateNow         = Date.now();
      arrayNewSessions = [];
      lMapUrlsOfEachWin.forEach((pValue, pKey) => {
        arrayNewSessions = arrayNewSessions.concat(
          pValue.map(v => {
            return {
              date: lDateNow,
              url: v,
              windowId: parseInt(pKey) || 0
            };
          })
        );
      });

      db.put({
        name: gStrDbSavedSessionName,
        data: arrayNewSessions,
      })
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function deleteSession()//{{{
  {
    return new Promise((resolve, reject) => {
      var lElSessionTitle = document.createDocumentFragment();
      var lNumDate        = 0;
      var lStrDbName      = "";
      var lArrayDelKeys   = [];

      lElSessionTitle = document.querySelector(`#${sStrIdNameOfSessionTitle}`);
      lNumDate        = parseInt(lElSessionTitle.getAttribute('name'));
      lStrDbName      = lElSessionTitle.getAttribute(sStrAttrNameOfDatabase);

      if (toType(lNumDate) !== 'number' ||
          toType(lStrDbName) !== 'string' ||
          lStrDbName.length === 0) {
        reject(new Error(
          `Doesn't get lNumDate: ${lNumDate} or` +
          ` lStrDbName: ${lStrDbName} correctly.`));
        return;
      }

      db.getCursor({
        name: lStrDbName,
        range: IDBKeyRange.only(lNumDate),
        indexName: 'date',
      })
      .then(pArrayResults => {
        lArrayDelKeys = pArrayResults.map(v => v.id);
        return db.delete({
          name: lStrDbName,
          keys: lArrayDelKeys,
        });
      })
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function restoreSession()//{{{
  {
    var lElAddLocationWhereSessionList = document.createDocumentFragment();
    var lElShowField                   = document.createDocumentFragment();
    var lElA                           = document.createDocumentFragment();
    var lArrayRestore                  = [];
    var lNumWindowId                   = 0;

    lElAddLocationWhereSessionList =
      document.querySelector(`#${sStrIdNameOfSessionList}`);
    lElShowField = lElAddLocationWhereSessionList.querySelectorAll(
      `fieldset:not(.${sStrClassNameOfDoesNot})`);
    if (lElShowField.length === 0) {
      console.warn('The length of lElShowField in restoreSession is zero.');
      return;
    }

    lArrayRestore = [];
    Array.prototype.slice.call(lElShowField).forEach(pValue => {
      lNumWindowId  = parseInt(pValue.getAttribute(sStrAttrNameOfWindowId));
      lElA  = pValue.querySelectorAll(`.${sStrClassNameOfHistoryItemUrl}`);
      Array.prototype.slice.call(lElA).forEach(
        v => lArrayRestore.push({ url: v.href, windowId: lNumWindowId }));
    });

    chrome.runtime.sendMessage({ event: 'restore', session: lArrayRestore });
  }//}}}

  function closureCreateSessionDateList(pObjOpts)//{{{
  {
    var lStrErrMsg = checkFunctionArguments(arguments, [
      [ 'object' ],
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    //{{{ local variable.
    const lStrDbName             = pObjOpts.databaseName;
    const lStrAttrNameOfDatabase = pObjOpts.attrNameOfDatabase || 'database';
    const lElToAddDateList       = pObjOpts.dateList;
    const lElToAddItemList       = pObjOpts.itemList;
    const lNumCurrentTime        = pObjOpts.currentTime;

    if (toType(lStrDbName) !== 'string') {
      throw new Error("lStrDbName isn't correctly.");
    }
    if (toType(lStrAttrNameOfDatabase) !== 'string') {
      throw new Error("lStrAttrNameOfDatabase isn't correctly.");
    }
    if (lElToAddDateList === void 0 || lElToAddDateList === null) {
      throw new Error("dateList isn't found in arguments");
    }
    if (lElToAddItemList === void 0 || lElToAddItemList === null) {
      throw new Error("itemList isn't found in arguments");
    }
    if (lNumCurrentTime !== void 0 && lNumCurrentTime !== null &&
        toType(lNumCurrentTime) !== 'number') {
      throw new Error('currentTime in arguments is not number.');
    }
    //}}}

    function onClicked(pEvent)//{{{
    {
      var lElTarget         = document.createDocumentFragment();
      var lElList           = document.createDocumentFragment();
      var lElShowLists      = document.createDocumentFragment();
      var lElNotShowLists   = document.createDocumentFragment();
      var lElSessionSave    = document.createDocumentFragment();
      var lElDateList       = document.createDocumentFragment();
      var lElSelectDates    = document.createDocumentFragment();
      var lElNotSelectDates = document.createDocumentFragment();
      var lElSessionTitle   = document.createDocumentFragment();
      var lStrName          = "";
      var lStrListName      = "";
      var lStrErrMsg        = "";

      lStrErrMsg = checkFunctionArguments(arguments, [
        function(pValue) { return (typeof pValue !== 'object'); },
      ]);
      if (lStrErrMsg) {
        throw new Error(lStrErrMsg);
      }

      lElTarget       = pEvent.target;
      lElList         = lElTarget.parentNode;
      lStrListName    = lElList.getAttribute('id');
      lStrName        = lElTarget.getAttribute('name');
      lElDateList     = document.querySelector(`#${sStrIdNameOfDateList}`);
      lElSessionSave  = document.querySelector(`#${sStrIdNameOfSessionSave}`);
      lElSessionTitle = document.querySelector(`#${sStrIdNameOfSessionTitle}`);
      lElShowLists      =
        lElToAddItemList.querySelectorAll(`fieldset[name="${lStrName}"]`);
      lElNotShowLists   =
        lElToAddItemList.querySelectorAll(`fieldset:not([name="${lStrName}"])`);
      lElSelectDates    = lElDateList.querySelector(`[name="${lStrName}"]`);
      lElNotSelectDates =
        lElDateList.querySelectorAll(`:not([name="${lStrName}"])`);

      // select which is showed a list of a session date.
      Array.prototype.slice.call(lElShowLists).forEach(pValue => {
        removeStringFromAttributeOfElement(
          pValue, 'class', sStrClassNameOfDoesNot);
      });

      Array.prototype.slice.call(lElNotShowLists).forEach(pValue => {
        addStringToAttributeOfElement(pValue, 'class', sStrClassNameOfDoesNot);
      });

      changeSessionIconControlState(true);

      // If clicking date is saved sesssion, add button is not show.
      if (lStrListName === sStrIdNameOfAddSavedSessionDateList) {
        addStringToAttributeOfElement(
          lElSessionSave, 'class', sStrClassNameOfDoesNot);
      } else {
        removeStringFromAttributeOfElement(
          lElSessionSave, 'class', sStrClassNameOfDoesNot);
      }

      // a button of session date is changed by state.
      addStringToAttributeOfElement(
        lElSelectDates, 'class', sStrClassNameWhenSelect);

      lElSessionTitle.setAttribute('name', lStrName);
      lElSessionTitle.setAttribute(lStrAttrNameOfDatabase, lStrDbName);
      lElSessionTitle.textContent = lElSelectDates.textContent;

      Array.prototype.slice.call(lElNotSelectDates).forEach(pValue => {
        removeStringFromAttributeOfElement(
          pValue, 'class', sStrClassNameWhenSelect);
      });
    }//}}}

    function closureCreateSessionDate()//{{{
    {
      var lElDiv = document.createElement('div');

      return function(pNumTime) {
        var lElDivRet = lElDiv.cloneNode(true);
        var lStrText  = "";
        var lStrErrMsg = "";

        lStrErrMsg = checkFunctionArguments(arguments, [
          [ 'number' ],
        ]);
        if (lStrErrMsg) {
          throw new Error(lStrErrMsg);
        }

        if (lNumCurrentTime !== void 0 &&
            lNumCurrentTime !== undefined &&
            lNumCurrentTime === parseInt(pNumTime)) {
          lStrText = 'Current Session';
        } else {
          lStrText = getFormatEachLanguages(pNumTime);
        }

        lElDivRet.setAttribute('name', pNumTime);
        lElDivRet.textContent = lStrText;
        lElDivRet.addEventListener('click', onClicked, true);

        return lElDivRet;
      };
    }//}}}

    function createSessionDateListItem(pArrayItems)//{{{
    {
      var lCreateHistoryItem = null;
      var lObjOpts           = {};
      var lArrayList         = [];
      var lStrErrMsg         = "";

      lStrErrMsg = checkFunctionArguments(arguments, [
        [ 'array' ],
      ]);
      if (lStrErrMsg) {
        throw new Error(lStrErrMsg);
      }

      lCreateHistoryItem = closureCreateHistoryItem(
        Object.assign(sObjOptsForCreateHistoryItem, {
          databaseName: lStrDbName,
          deleteFunc:   removeSessionHistoryItem,
        })
      );
      lObjOpts = {
        date: false,
      };
      lArrayList = [];

      pArrayItems.forEach(pValue => {
        lArrayList.push(lCreateHistoryItem(pValue, lObjOpts));
      });

      return lArrayList;
    }//}}}

    function getDictSplitEachSession(pArraySessions, pStrAttrName)//{{{
    {
      var lAnyAttr   = null;
      var lAnyValue  = null;
      var lMapResult = new Map();
      var lStrErrMsg = "";

      lStrErrMsg = checkFunctionArguments(arguments, [
        [ 'array' ],
        [ 'string' ],
      ]);
      if (lStrErrMsg) {
        throw new Error(lStrErrMsg);
      }

      lMapResult = new Map();
      pArraySessions.forEach(pValue => {
        lAnyAttr  = pValue[pStrAttrName];
        lAnyValue = lMapResult.get(lAnyAttr) || [];
        lAnyValue.push(pValue);
        lMapResult.set(lAnyAttr, lAnyValue);
      });

      return lMapResult;
    }//}}}

    function createSessionWindowList(lNumTime, lMapWindow)//{{{
    {
      var lElField             = document.createDocumentFragment();
      var lElArticle           = document.createDocumentFragment();
      var lElWindowTitle       = document.createDocumentFragment();
      var lElHistoryItemDelete = document.createDocumentFragment();
      var lArrayList           = [];
      var lStrErrMsg           = "";
      var lNumCount            = 0;
      var lCreateHistoryDate   = null;

      lStrErrMsg = checkFunctionArguments(arguments, [
        [ 'number' ],
        [ 'map' ],
      ]);
      if (lStrErrMsg) {
        throw new Error(lStrErrMsg);
      }

      lCreateHistoryDate = closureCreateHistoryDate(
        Object.assign(sObjOptsForCreateHistoryDate, {
          deleteFunc: removeSessionHistoryWindow,
        })
      );

      lArrayList = [];
      lNumCount  = 0;
      lMapWindow.forEach((pValue, pNumWindowId) => {
        lElField = lCreateHistoryDate({ date: lNumTime });
        addStringToAttributeOfElement(
          lElField, sStrAttrNameOfWindowId, pNumWindowId);
        addStringToAttributeOfElement(
          lElField, 'class', sStrClassNameOfDoesNot);

        lElWindowTitle =
          lElField.querySelector(`.${sStrClassNameOfHistoryItemDate}`);
        lElWindowTitle.textContent = `Window ${lNumCount}`;

        lElHistoryItemDelete =
          lElField.querySelector(`.${sStrClassNameOfHistoryItemDelete}`);
        addStringToAttributeOfElement(
            lElHistoryItemDelete, sStrAttrNameOfWindowId, pNumWindowId);

        lElArticle =
          lElField.querySelector(`.${sObjOptsForCreateHistoryDate.itemList}`);

        createSessionDateListItem(pValue)
        .forEach(v => lElArticle.appendChild(v));

        lArrayList.push(lElField);

        ++lNumCount;
      });

      return lArrayList;
    }//}}}

    function createSessionDateList(pArraySessions)//{{{
    {
      var lMapSessionEachDate     = new Map();
      var lMapSessionEachWindowId = new Map();
      var lArrayDateList          = [];
      var lArrayItemList          = [];
      var lArrayItem              = [];
      var lCreateSessionDate      = null;
      var lStrErrMsg              = "";

      lStrErrMsg = checkFunctionArguments(arguments, [
        [ 'array' ],
      ]);
      if (lStrErrMsg) {
        throw new Error(lStrErrMsg);
      }

      lCreateSessionDate = closureCreateSessionDate();
      lArrayDateList     = [];
      lArrayItemList     = [];

      pArraySessions.forEach(pValue => {
        lMapSessionEachDate = getDictSplitEachSession(pValue.data, 'date');
        lMapSessionEachDate.forEach((pValue, pKey) => {
          lArrayDateList.push( lCreateSessionDate(pKey) );
          lMapSessionEachWindowId =
            getDictSplitEachSession(pValue, sStrAttrNameOfWindowId);
          lArrayItem = createSessionWindowList(pKey, lMapSessionEachWindowId);
          lArrayItemList = lArrayItemList.concat(lArrayItem);
        });
      });

      lArrayDateList.forEach(v => lElToAddDateList.appendChild(v));
      lArrayItemList.forEach(v => lElToAddItemList.appendChild(v));
    }//}}}

    return createSessionDateList;
  }//}}}

  function selectCurrentSession()//{{{
  {
    var lElLocationWhereToAddSessionDateList =
            document.createDocumentFragment();
    var lElCurrentSessionItem  = document.createDocumentFragment();
    var lNumCurrentSessionTime = 0;

    lElLocationWhereToAddSessionDateList =
      document.querySelector(`#${sStrIdNameOfSessionDateList}`);

    return new Promise((resolve, reject) => {
      chrome.storage.local.get(rObjItems => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        lNumCurrentSessionTime = rObjItems[gStrPreviousSessionTimeKey];
        if (lNumCurrentSessionTime === void 0 ||
            lNumCurrentSessionTime === null) {
          resolve();
          return;
        }

        lElCurrentSessionItem =
          lElLocationWhereToAddSessionDateList.querySelector(
            `[name="${lNumCurrentSessionTime}"]`);
        if (lElCurrentSessionItem) {
          lElCurrentSessionItem.click();
        }
      });
    });
  }//}}}

  function showAllSessionHistory()//{{{
  {
    var lElAddSavedSessionDateListLocation = document.createDocumentFragment();
    var lElAddSessionDateListLocation      = document.createDocumentFragment();
    var lElAddLocationWhereSessionList     = document.createDocumentFragment();
    var lElSavedSessionDateTitle           = document.createDocumentFragment();
    var lElDateListNav                     = document.createDocumentFragment();
    var lElSessionNotFound                 = document.createDocumentFragment();
    var lArraySavedSessions                = [];
    var lArraySessions                     = [];
    var lNumCurrentTime                    = 0;
    var lCreateSavedSessionDateList        = null;
    var lCreateSessionDateList             = null;

    lElAddSavedSessionDateListLocation =
      document.querySelector(`#${sStrIdNameOfAddSavedSessionDateList}`);
    lElAddSessionDateListLocation      =
      document.querySelector(`#${sStrIdNameOfSessionDateList}`);
    lElAddLocationWhereSessionList     =
      document.querySelector(`#${sStrIdNameOfSessionList}`);
    lElSavedSessionDateTitle           =
      document.querySelector(`#${sStrIdNameOfSavedSessionDateTitle}`);
    lElDateListNav                     =
      document.querySelector(`#${sStrIdNameOfDateListNav}`);
    lElSessionNotFound                 =
      document.querySelector(`#${sStrIdNameOfSessionNotFound}`);

    return new Promise((resolve, reject) => {
      getAllSessionHistory()
      .then(results => {
        lArraySavedSessions = results[0];
        lArraySessions      = results[1];

        clearItemInElement(lElAddSavedSessionDateListLocation);
        clearItemInElement(lElAddSessionDateListLocation);
        clearItemInElement(lElAddLocationWhereSessionList);

        // saved session list.
        if (lArraySavedSessions.length === 0) {
          addStringToAttributeOfElement(
            lElSavedSessionDateTitle, 'class', sStrClassNameOfDoesNot);
        } else {
          removeStringFromAttributeOfElement(
            lElSavedSessionDateTitle, 'class', sStrClassNameOfDoesNot);

          lCreateSavedSessionDateList = closureCreateSessionDateList({
            databaseName:       gStrDbSavedSessionName,
            attrNameOfDatabase: sStrAttrNameOfDatabase,
            dateList:           lElAddSavedSessionDateListLocation,
            itemList:           lElAddLocationWhereSessionList,
          });
          lCreateSavedSessionDateList(lArraySavedSessions);
        }

        //{{{ session list.
        chrome.storage.local.get(gStrPreviousSessionTimeKey, items => {
          lNumCurrentTime = items[gStrPreviousSessionTimeKey];

          // new
          lCreateSessionDateList = closureCreateSessionDateList({
            databaseName:       gStrDbSessionName,
            attrNameOfDatabase: sStrAttrNameOfDatabase,
            dateList:           lElAddSessionDateListLocation,
            itemList:           lElAddLocationWhereSessionList,
            currentTime:        lNumCurrentTime,
          });
          lCreateSessionDateList(lArraySessions);

          // If savedSession list or session list are empty,
          // showing the message of session is empty.
          if (lArraySavedSessions.length > 0 || lArraySessions.length > 0) {
            addStringToAttributeOfElement(
              lElSessionNotFound, 'class', sStrClassNameOfDoesNot);
            removeStringFromAttributeOfElement(
              lElDateListNav, 'style', sStrStyleDisplayNone);
          } else {
            removeStringFromAttributeOfElement(
              lElSessionNotFound, 'class', sStrClassNameOfDoesNot);
            addStringToAttributeOfElement(
              lElDateListNav, 'style', sStrStyleDisplayNone);
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
    var lArrayPromise       = [];
    var lArraySavedSessions = [];
    var lArraySessions      = [];
    var lArrayPageInfos     = [];
    var lArrayDataURIs      = [];

    return new Promise((resolve, reject) => {
      if (db === void 0 || db === null) {
        reject(new Error("IndexedDB doesn't initialize yet."));
        return;
      }

      lArrayPromise = [];
      lArrayPromise.push( db.getAll({ name: gStrDbSavedSessionName }) );
      lArrayPromise.push( db.getAll({ name: gStrDbSessionName }) );
      lArrayPromise.push( db.getAll({ name: gStrDbPageInfoName }) );
      lArrayPromise.push( db.getAll({ name: gStrDbDataURIName }) );

      Promise.all(lArrayPromise)
      .then(rResults => {
        lArraySavedSessions = rResults[0];
        lArraySessions      = rResults[1];
        lArrayPageInfos     = rResults[2];
        lArrayDataURIs      = rResults[3];

        lArrayPromise = [];
        lArrayPromise.push(
          getListAfterJoinHistoryDataOnDB(
            [ lArraySavedSessions, lArrayPageInfos, lArrayDataURIs ])
        );
        lArrayPromise.push(
          getListAfterJoinHistoryDataOnDB(
            [ lArraySessions, lArrayPageInfos, lArrayDataURIs ])
        );

        return Promise.all(lArrayPromise);
      })
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function showAutoCompleteDateList(pArrayHistories)//{{{
  {
    var lElSearchHistoryDateList = document.createDocumentFragment();
    var lElAutocompleteDateList  = document.createDocumentFragment();
    var lStrErrMsg = "";
    lStrErrMsg = checkFunctionArguments(arguments, [
      [ 'array' ],
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    lElSearchHistoryDateList =
      document.querySelector(`#${sStrIdNameOfSearchHistoryDateList}`);
    lElAutocompleteDateList = addAutocompleteDateList(lElSearchHistoryDateList);

    pArrayHistories.forEach(pValue => {
      lElAutocompleteDateList(pValue.date);
    });
  }//}}}

  function removeHistoryDate(pEvent)//{{{
  {
    var lELTarget            = document.createDocumentFragment();
    var lElHistoryDateLegend = document.createDocumentFragment();
    var lElHistoryDateField  = document.createDocumentFragment();
    var lElHistoryList       = document.createDocumentFragment();
    var lDateNow             = new Date();
    var lDateBegin           = new Date();
    var lDateEnd             = new Date();
    var lNumFullYear         = 0;
    var lNumMonth            = 0;
    var lNumDay              = 0;
    var lArrayDelKeys        = [];
    var lStrErrMsg           = "";
    var lArrayArgs           = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      lStrErrMsg = checkFunctionArguments(lArrayArgs, [
        function(pValue) { return (typeof pValue !== 'object'); },
      ]);
      if (lStrErrMsg) {
        reject(new Error(lStrErrMsg));
        return;
      }

      lELTarget            = pEvent.target;
      lElHistoryDateLegend = lELTarget.parentNode;
      lElHistoryDateField  = lElHistoryDateLegend.parentNode;
      lElHistoryList       = lElHistoryDateField.parentNode;

      lDateNow     = new Date( parseInt(lELTarget.getAttribute('name')) );
      lNumFullYear = lDateNow.getFullYear();
      lNumMonth    = lDateNow.getMonth();
      lNumDay      = lDateNow.getDate();
      lDateBegin = new Date(lNumFullYear, lNumMonth, lNumDay, 0, 0, 0, 0);
      lDateEnd   = new Date(lNumFullYear, lNumMonth, lNumDay, 23, 59, 59, 999);

      db.getCursor({
        name:  gStrDbHistoryName,
        range: IDBKeyRange.bound(lDateBegin.getTime(), lDateEnd.getTime()),
      })
      .then(histories => {
        lArrayDelKeys = histories.map(v => v.date);
        return db.delete({
          name: gStrDbHistoryName,
          keys: lArrayDelKeys,
        });
      })
      .then(ret => {
        lElHistoryList.removeChild(lElHistoryDateField);
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
    var lTarget          = document.createDocumentFragment();
    var lHistoryItem     = document.createDocumentFragment();
    var lHistoryItemList = document.createDocumentFragment();
    var lDbName          = ""; // indexedDB name.
    var lItemId          = 0; // session item only.
    var lTime            = 0; // this value is new Date().getTime().
    var lStrErrMsg       = "";
    var lArrayArgs       = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      lStrErrMsg = checkFunctionArguments(lArrayArgs, [
        function(pValue) { return (typeof pValue !== 'object'); },
      ]);
      if (lStrErrMsg) {
        reject(new Error(lStrErrMsg));
        return;
      }

      lTarget          = pEvent.target;
      lHistoryItem     = lTarget.parentNode;
      lHistoryItemList = lHistoryItem.parentNode;

      lDbName = lTarget.getAttribute(sStrAttrNameOfDatabase);
      lItemId = parseInt(lTarget.getAttribute(sStrAttrNameOfItemId), 10);
      lTime   = parseInt(lTarget.getAttribute('name'), 10);

      db.delete({
        name: lDbName,
        keys: lItemId ? lItemId : lTime,
      })
      .then(ret => {
        lHistoryItemList.removeChild(lHistoryItem);
        return ret;
      })
      .then(resolve)
      .catch(e => {
        console.error(e);
        reject(e);
      });
    });
  }//}}}

  function removeSessionHistoryItem(event)//{{{
  {
    var lElSessionList = document.createDocumentFragment();
    var lElItemList    = document.createDocumentFragment();
    var lElShowField   = document.createDocumentFragment();
    var lStrErrMsg     = "";
    var lArrayArgs     = Array.prototype.slice.call(arguments);
    var lFuncGetShowField   = null;

    return new Promise((resolve, reject) => {
      lStrErrMsg = checkFunctionArguments(lArrayArgs, [
        function(pValue) { return (typeof pValue !== 'object'); },
      ]);
      if (lStrErrMsg) {
        reject(new Error(lStrErrMsg));
        return;
      }

      lElSessionList = document.querySelector(`#${sStrIdNameOfSessionList}`);
      lFuncGetShowField = function(){
        return lElSessionList.querySelectorAll(
          `fieldset:not(.${sStrClassNameOfDoesNot})`);
      };
      lElShowField = lFuncGetShowField();

      removeHistoryItem(event)
      .then(() => {
        Array.prototype.slice.call(lElShowField).forEach(pValue => {
          lElItemList =
            pValue.querySelector(`.${sStrClassNameOfHistoryItemList}`);
          if (lElItemList.childNodes.length === 0) {
            lElSessionList.removeChild(pValue);
          }
        });

        return (lFuncGetShowField().length === 0) ? initSessionHistory() : null;
      })
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function removeSessionHistoryWindow(event)//{{{
  {
    var lTarget             = document.createDocumentFragment();
    var lElShowField        = document.createDocumentFragment();
    var lElSessionList      = document.createDocumentFragment();
    var lArrayDbName        = [];
    var lArrayPromise       = [];
    var lArraySessions      = [];
    var lArrayDelKeys       = [];
    var lNumWindowId        = 0;
    var lNumDateTime        = 0;
    var lNumWindowIdOfField = 0;
    var getShowField        = null;
    var lStrErrMsg          = "";
    var lArrayArgs          = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      lStrErrMsg = checkFunctionArguments(lArrayArgs, [
        function(pValue) { return (typeof pValue !== 'object'); },
      ]);
      if (lStrErrMsg) {
        reject(new Error(lStrErrMsg));
        return;
      }

      lElSessionList = document.querySelector(`#${sStrIdNameOfSessionList}`);
      getShowField = function(){
        return lElSessionList.querySelectorAll(
          `fieldset:not(.${sStrClassNameOfDoesNot})`);
      };
      lTarget        = event.target;
      lNumWindowId   = parseInt(lTarget.getAttribute(sStrAttrNameOfWindowId));
      lNumDateTime   = parseInt(lTarget.getAttribute('name'));
      lArrayDbName   = [ gStrDbSessionName, gStrDbSavedSessionName ];

      // get from all the databases of a session history.
      lArrayPromise  = [];
      lArrayDbName.forEach(pValue => {
        lArrayPromise.push(
          db.getCursor({
            name:      pValue,
            range:     IDBKeyRange.only(lNumDateTime),
            indexName: 'date',
          })
        );
      });

      Promise.all(lArrayPromise)
      .then(rResults => {
        // create the array for to delete session history from database.
        lArraySessions = [];
        rResults.forEach(pValue => {
          lArraySessions = lArraySessions.concat(pValue);
        });
        lArrayDelKeys = lArraySessions.filter(v => {
          return lNumWindowId ? v.windowId === lNumWindowId : true;
        })
        .map(v => v.id);

        // delete specified window from the databases of a session history.
        lArrayPromise = [];
        lArrayDbName.forEach(pValue => {
          lArrayPromise.push(
            db.delete({
              name: pValue,
              keys: lArrayDelKeys,
            })
          );
        });

        return Promise.all(lArrayPromise);
      })
      .then(() => {
        // deletes the deleted window item from DOM.
        lElShowField = getShowField();
        Array.prototype.slice.call(lElShowField).forEach(pValue => {
          lNumWindowIdOfField =
            parseInt(pValue.getAttribute(sStrAttrNameOfWindowId));
          if (lNumWindowIdOfField === lNumWindowId) {
            lElSessionList.removeChild(pValue);
          }
        });

        // If the session history of the same Date in empty, deletes the field.
        return (getShowField().length === 0) ? initSessionHistory() : null;
      })
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function closureCreateHistoryDate(pObjOpts)//{{{
  {
    var lStrErrMsg = checkFunctionArguments(arguments, [
      function(pValue) {
        return toType(pValue) !== 'object' &&
               !pObjOpts.hasOwnProperty(pObjOpts);
      },
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    //{{{ local variables.
    const lFuncDelete                    = pObjOpts.deleteFunc;
    const lStrClassNameOfHistoryDateItem = pObjOpts.className || 'historyDate';
    const lStrClassNameOfDeleteButton    = pObjOpts.itemDelete || 'itemDelete';
    // itemDate also be used as DateTitle.
    const lStrClassNameOfHistoryDate     = pObjOpts.itemDate || 'itemDate';
    const lStrClassNameToAddHistoryItem  = pObjOpts.itemList || 'itemList';
    //}}}

    function createPrototype()//{{{
    {
      var lElFieldset = document.createElement('fieldset');
      var lElLegend   = document.createElement('legend');
      var lElSpan     = document.createElement('span');
      var lElImg      = document.createElement('img');
      var lElArticle  = document.createElement('article');

      addStringToAttributeOfElement(
        lElFieldset, 'class', lStrClassNameOfHistoryDateItem);
      addStringToAttributeOfElement(lElFieldset, 'class', 'historyField');

      addStringToAttributeOfElement(
        lElSpan, 'class', lStrClassNameOfHistoryDate);

      addStringToAttributeOfElement(lElImg, 'src', gStrDeleteIconPath);
      addStringToAttributeOfElement(lElImg, 'alt', 'Delete button');
      addStringToAttributeOfElement(
        lElImg, 'class', lStrClassNameOfDeleteButton);
      addStringToAttributeOfElement(lElImg, 'class', 'icon16_rev');

      addStringToAttributeOfElement(
        lElArticle, 'class', lStrClassNameToAddHistoryItem);
      addStringToAttributeOfElement(lElArticle, 'class', 'ellipsis_over');

      lElLegend.appendChild(lElSpan);
      lElLegend.appendChild(lElImg);
      lElFieldset.appendChild(lElLegend);
      lElFieldset.appendChild(lElArticle);

      return lElFieldset;
    }//}}}

    function createHistoryDate(pItem, pObjOpts)//{{{
    {
      var lElProto        = document.createDocumentFragment();
      var lElHistoryDate  = document.createDocumentFragment();
      var lElDeleteButton = document.createDocumentFragment();
      var lElDateTitle    = document.createDocumentFragment();
      var lNumTime        = 0;
      var lObjDefaultOpts = {}; // default options.
      var lStrErrMsg      = "";

      lObjDefaultOpts = {
        deleteButton: true,
        date:         true,
        title:        true,
      };

      lStrErrMsg = checkFunctionArguments(arguments, [
        function(pValue) {
          return toType(pValue) !== 'object' || !pValue.hasOwnProperty('date');
        },
        function(pValue) {
          if (toType(pValue) !== 'object') {
            return true;
          }

          var rBoolResult = false;
          Object.keys(pValue).forEach(pKey => {
            if (!lObjDefaultOpts.hasOwnProperty(pKey)) {
              rBoolResult = true;
            }
          });
          return rBoolResult;
        },
      ], true);
      if (lStrErrMsg) {
        throw new Error(lStrErrMsg);
      }

      lElProto        = createPrototype();
      lElHistoryDate  = lElProto.cloneNode(true);
      lElDeleteButton =
        lElHistoryDate.querySelector(`.${lStrClassNameOfDeleteButton}`);
      lElDateTitle  =
        lElHistoryDate.querySelector(`.${lStrClassNameOfHistoryDate}`);

      if (pObjOpts !== void 0 && pObjOpts !== null) {
        Object.keys(pObjOpts).forEach(v => lObjDefaultOpts[v] = pObjOpts[v]);
      }

      lNumTime       = new Date(pItem.date).getTime();
      addStringToAttributeOfElement(lElHistoryDate, 'name', lNumTime);

      if (lObjDefaultOpts.deleteButton) {
        addStringToAttributeOfElement(lElDeleteButton, 'name', lNumTime);
        lElDeleteButton.addEventListener('click', lFuncDelete, true);
      }

      if (lObjDefaultOpts.title || lObjDefaultOpts.date) {
        lElDateTitle.textContent = getFormatEachLanguages(pItem.date, {
          'ja':      'YYYY/MM/DD',
          'default': 'MM/DD/YYYY',
        });
      }

      return lElHistoryDate;
    }//}}}

    return createHistoryDate;
  }//}}}

  function closureCreateHistoryItem(pObjOpts)//{{{
  {
    var lStrErrMsg = checkFunctionArguments(arguments, [
      function(pValue) {
        return toType(pValue) !== 'object' &&
               !pValue.hasOwnProperty('databaseName') &&
               !pValue.hasOwnProperty('deleteFunc');
      },
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    //{{{ local variable
    const gStrDbName  = pObjOpts.databaseName;
    const lFuncDelete = pObjOpts.deleteFunc;
    const lStrAttrNameOfDatabase = pObjOpts.attrNameOfDatabase || 'database';
    const lStrClassNameOfHistoryItem  = pObjOpts.className || 'historyItem';
    const lStrClassNameOfDeleteButton = pObjOpts.itemDelete || 'itemDelete';
    const lStrClassNameOfPageIcon     = pObjOpts.itemIcon || 'itemIcon';
    const lStrClassNameOfTitle = pObjOpts.itemTitle || 'itemTitle';
    const lStrClassNameOfDate  = pObjOpts.itemDate || 'itemDate';
    const lStrClassNameOfLink  = pObjOpts.itemUrl || 'itemUrl';
    const lStrAttrNameOfItemId = pObjOpts.attrNameOfItemId || 'historyItemId';
    //}}}

    function createPrototype()//{{{
    {
      var lElSection = document.createElement('section');
      var lElSpan    = document.createElement('span');
      var lElA       = document.createElement('a');
      var lElImg     = document.createElement('img');
      addStringToAttributeOfElement(lElImg, 'class', 'icon16_rev');

      var lElDeleteIcon = lElImg.cloneNode(true);
      var lElPageIcon   = lElImg.cloneNode(true);
      var lElTitle      = lElSpan.cloneNode(true);
      var lElDate       = lElSpan.cloneNode(true);

      addStringToAttributeOfElement(
        lElSection, 'class', lStrClassNameOfHistoryItem);
      addStringToAttributeOfElement(lElSection, 'class', 'ellipsis');
      addStringToAttributeOfElement(
        lElSection, lStrAttrNameOfDatabase, gStrDbName);

      addStringToAttributeOfElement(lElDeleteIcon, 'src', gStrDeleteIconPath);
      addStringToAttributeOfElement(lElDeleteIcon, 'alt', 'Delete button');
      addStringToAttributeOfElement(
        lElDeleteIcon, 'class', lStrClassNameOfDeleteButton);

      addStringToAttributeOfElement(lElPageIcon, 'alt', 'page icon');
      addStringToAttributeOfElement(
        lElPageIcon, 'class', lStrClassNameOfPageIcon);

      addStringToAttributeOfElement(lElTitle, 'class', lStrClassNameOfTitle);
      addStringToAttributeOfElement(lElDate, 'class', lStrClassNameOfDate);

      addStringToAttributeOfElement(lElA, 'target', '_blank');
      addStringToAttributeOfElement(lElA, 'class', lStrClassNameOfLink);

      lElA.appendChild(lElPageIcon);
      lElA.appendChild(lElTitle);

      lElSection.appendChild(lElDeleteIcon);
      lElSection.appendChild(lElDate);
      lElSection.appendChild(lElA);

      return lElSection;
    }//}}}

    function createHistoryItem(pObjItem, pObjOpts)//{{{
    {
      var lElProto        = document.createDocumentFragment();
      var lElItem         = document.createDocumentFragment();
      var lElDeleteButton = document.createDocumentFragment();
      var lElDate         = document.createDocumentFragment();
      var lElLink         = document.createDocumentFragment();
      var lElIcon         = document.createDocumentFragment();
      var lElTitle        = document.createDocumentFragment();
      var lObjDefaultOpts = {}; // default options.
      var lStrErrMsg      = "";

      lObjDefaultOpts = { // default.
        deleteButton: true,
        date:         true,
        link:         true,
        title:        true,
        icon:         true,
      };

      lStrErrMsg = checkFunctionArguments(arguments, [
        function(pValue) {
          return toType(pValue) !== 'object' || !pValue.hasOwnProperty('date');
        },
        function(pValue) {
          if (toType(pValue) !== 'object') {
            return true;
          }

          var rBoolResult = false;
          Object.keys(pObjOpts).forEach(pKey => {
            if (!lObjDefaultOpts.hasOwnProperty(pKey)) {
              rBoolResult = true;
            }
          });
          return rBoolResult;
        },
      ], true);
      if (lStrErrMsg) {
        throw new Error(lStrErrMsg);
      }

      lElProto        = createPrototype();
      lElItem         = lElProto.cloneNode(true);
      lElDeleteButton =
        lElItem.querySelector(`.${lStrClassNameOfDeleteButton}`);
      lElDate         = lElItem.querySelector(`.${lStrClassNameOfDate}`);
      lElLink         = lElItem.querySelector(`.${lStrClassNameOfLink}`);
      lElIcon         = lElItem.querySelector(`.${lStrClassNameOfPageIcon}`);
      lElTitle        = lElItem.querySelector(`.${lStrClassNameOfTitle}`);

      if (pObjOpts !== void 0 && pObjOpts !== null) {
        Object.keys(pObjOpts).forEach(v => lObjDefaultOpts[v] = pObjOpts[v]);
      }

      lElItem.setAttribute('name', pObjItem.date);

      if (lObjDefaultOpts.deleteButton) {
        lElDeleteButton.setAttribute('name', pObjItem.date);
        lElDeleteButton.setAttribute(lStrAttrNameOfDatabase, gStrDbName);
        lElDeleteButton.addEventListener('click', lFuncDelete, true);
        if (pObjItem.hasOwnProperty('id')) {
          lElDeleteButton.setAttribute(lStrAttrNameOfItemId, pObjItem.id);
        }
      }

      if (lObjDefaultOpts.date !== false) {
        lElDate.textContent = formatDate(new Date(pObjItem.date), 'hh:mm:ss');
      }

      if (pObjItem.hasOwnProperty('url') && lObjDefaultOpts.link) {
        lElLink.setAttribute('href', pObjItem.url);
      }

      if (pObjItem.hasOwnProperty('dataURI') && lObjDefaultOpts.icon) {
        lElIcon.setAttribute('src', pObjItem.dataURI);
      }

      if (pObjItem.hasOwnProperty('title') && lObjDefaultOpts.title) {
        lElTitle.textContent = pObjItem.title;
      }

      return lElItem;
    }//}}}

    return createHistoryItem;
  }//}}}

  function showAllHistory()//{{{
  {
    var lElHistoryDateList   = document.createDocumentFragment();
    var lElHistoryItemList   = document.createDocumentFragment();
    var lElHistoryDate       = document.createDocumentFragment();
    var lElCreateHistoryDate = null;
    var lElCreateHistoryItem = null;
    var lArrayList           = [];

    return new Promise((resolve, reject) => {
      getAllHistory()
      .then(historyArray => {
        historyArray = historyArray.reverse();
        lElHistoryDateList =
          document.querySelector(`#${sStrIdNameOfHistoryList}`);

        showAutoCompleteDateList(historyArray);

        clearItemInElement(lElHistoryDateList);

        lElCreateHistoryDate =
          closureCreateHistoryDate(sObjOptsForCreateHistoryDate);
        lElCreateHistoryItem =
          closureCreateHistoryItem(
            Object.assign(sObjOptsForCreateHistoryItem,
              { databaseName: gStrDbHistoryName }));

        historyArray.forEach(pValue => {
          lElHistoryDate = lElCreateHistoryDate(pValue);

          lArrayList = [];
          pValue.data.forEach(pValueJ => {
            lArrayList.push( lElCreateHistoryItem(pValueJ) );
          });
          lArrayList = lArrayList.reverse();

          lElHistoryItemList =
            lElHistoryDate.querySelector(`.${sStrClassNameOfHistoryItemList}`);
          lArrayList.forEach(pValueZ => {
            lElHistoryItemList.appendChild(pValueZ);
          });

          lElHistoryDateList.appendChild(lElHistoryDate);
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
    var lElSearchHistoryDate          = document.createDocumentFragment();
    var lElSearchHistoryItem          = document.createDocumentFragment();
    var lElDateList                   = document.createDocumentFragment();
    var lElHistoryItems               = document.createDocumentFragment();
    var lElItemTitle                  = document.createDocumentFragment();
    var lElItemUrl                    = document.createDocumentFragment();
    var lStrSearchHistoryValue        = '';
    var lStrSearchHistoryItemValue    = "";
    var lNumSearchHistoryValueLen     = 0;
    var lNumSearchHistoryItemValueLen = 0;
    var lDate                         = new Date();
    var lDateSearch                   = new Date();
    var lRegItem                      = null;
    var lArrayMatch                   = [];
    var lNumCount                     = 0;
    var lNumSearchTime                = 0;

    lElSearchHistoryDate      = document.querySelector(
                                  `#${sStrIdNameOfSearchHistoryDate}`);
    lStrSearchHistoryValue    = lElSearchHistoryDate.value;
    lNumSearchHistoryValueLen = lStrSearchHistoryValue.length;
    lElSearchHistoryItem      = document.querySelector(
                                  `#${sStrIdNameOfSearchHistoryItem}`);
    lStrSearchHistoryItemValue    = lElSearchHistoryItem.value.trim();
    lNumSearchHistoryItemValueLen = lStrSearchHistoryItemValue.length;
    lElDateList = document.querySelectorAll(`.${sStrClassNameOfHistoryDate}`);
    lRegItem    = new RegExp(lStrSearchHistoryItemValue, 'ig');

    if (lNumSearchHistoryValueLen > 0) {
      lArrayMatch = lStrSearchHistoryValue.match(/(\d+)-(\d+)-(\d+)/);
      lDateSearch =
        new Date(lArrayMatch[1], lArrayMatch[2] - 1, lArrayMatch[3]);
      lNumSearchTime = lDateSearch.getTime();
    }

    Array.prototype.slice.call(lElDateList).forEach(pValue => {
      lDate    = new Date(parseInt(pValue.name));

      if (lNumSearchHistoryValueLen === 0 ||
          lDate.getTime() === lNumSearchTime) {
        removeStringFromAttributeOfElement(
          pValue, 'class', sStrClassNameOfDoesNot);
      } else {
        addStringToAttributeOfElement(pValue, 'class', sStrClassNameOfDoesNot);
        return;
      }

      lElHistoryItems =
        pValue.querySelectorAll(`.${sStrClassNameOfHistoryItem}`);
      lNumCount = 0;
      Array.prototype.slice.call(lElHistoryItems).forEach(pValueJ => {
        lElItemTitle =
          pValueJ.querySelector(`.${sStrClassNameOfHistoryItemTitle}`);
        lElItemUrl   =
          pValueJ.querySelector(`.${sStrClassNameOfHistoryItemUrl}`);
        if (lNumSearchHistoryItemValueLen === 0 ||
            lRegItem.test(lElItemTitle.textContent) ||
            lRegItem.test(lElItemUrl.href)) {
          removeStringFromAttributeOfElement(
            pValueJ, 'class', sStrClassNameOfDoesNot);
        } else {
          addStringToAttributeOfElement(
            pValueJ, 'class', sStrClassNameOfDoesNot);
          ++lNumCount;
        }
      });

      if (lNumCount === lElHistoryItems.length) {
        addStringToAttributeOfElement(pValue, 'class', sStrClassNameOfDoesNot);
      } else {
        removeStringFromAttributeOfElement(
          pValue, 'class', sStrClassNameOfDoesNot);
      }
    });
  }//}}}

  function changeMenu(pStrName)//{{{
  {
    var lStrErrMsg = "";
    var lArrayArgs = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      lStrErrMsg = checkFunctionArguments(lArrayArgs, [
        [ 'string' ],
      ]);
      if (lStrErrMsg) {
        reject(new Error(lStrErrMsg));
        return;
      }

      menuToggle.show(pStrName)
      .then(processAfterMenuSelection(pStrName))
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function sectionButtonClicked(pEvent)//{{{
  {
    var lElTarget = document.createDocumentFragment();
    var lStrErrMsg = "";

    lStrErrMsg = checkFunctionArguments(arguments, [
      function(pValue) { return (typeof pValue !== 'object'); },
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    lElTarget = pEvent.target;
    if (lElTarget.getAttribute('class') !== sStrClassNameOfButton) {
      return;
    }

    changeMenu(lElTarget.getAttribute('name'));
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
    var lElTarget  = document.createDocumentFragment();
    var lObjWrite  = {};
    var lStrName   = "";
    var lStrErrMsg = "";

    lStrErrMsg = checkFunctionArguments(arguments, [
      function(pValue) { return (typeof pValue !== 'object'); },
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    lElTarget = pEvent.target;
    lStrName = lElTarget.getAttribute('name');
    if (lStrName === void 0 || lStrName === null || lStrName.length === 0) {
      return;
    }

    operateOption.get(document, lStrName)
    .then(rItem => {
      return new Promise(resolve => {
        lObjWrite = {};
        lObjWrite[lStrName] = rItem;
        chrome.storage.local.set(lObjWrite, () => {
          console.log(
            `have wrote the data. name: ${lStrName}, value: ${rItem}`);
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

  var initSessionHistoryEvent = (function() {//{{{
    var lElSessionSave    = document.createDocumentFragment();
    var lElSessionDelete  = document.createDocumentFragment();
    var lElSessionRestore = document.createDocumentFragment();

    lElSessionSave   = document.querySelector(`#${sStrIdNameOfSessionSave}`);
    lElSessionDelete = document.querySelector(`#${sStrIdNameOfSessionDelete}`);
    lElSessionRestore =
        document.querySelector(`#${sStrIdNameOfSessionRestore}`);

    var commonFunc = function(pEvent) {//{{{
      var lStrErrMsg = "";
      var lArrayArgs = Array.prototype.slice.call(arguments);

      return new Promise((resolve, reject)=> {
        lStrErrMsg = checkFunctionArguments(lArrayArgs, [
          function(pValue) { return (typeof pValue !== 'object'); },
        ]);
        if (lStrErrMsg) {
          reject(new Error(lStrErrMsg));
          return;
        }

        (() => {
          var lStrIdName = pEvent.target.getAttribute('id');
          if (lStrIdName === lElSessionSave.getAttribute('id')) {
            return saveSession();
          } else if (lStrIdName === lElSessionDelete.getAttribute('id')) {
            return deleteSession();
          }
        })()
        .then(initSessionHistory)
        .then(resolve)
        .catch(reject);
      });
    };//}}}

    return function() {
      lElSessionSave.addEventListener('click', commonFunc, true);
      lElSessionDelete.addEventListener('click', commonFunc, true);
      lElSessionRestore.addEventListener('click', restoreSession, true);

      clearSessionTitleInSessionControlBar()
      .then(changeSessionIconControlState(false));
    };
  })();//}}}

  function initHistoryEvent()//{{{
  {
    var lElSearchHistoryDate = document.createDocumentFragment();
    var lElSearchHistoryItem = document.createDocumentFragment();

    return new Promise(resolve => {
      lElSearchHistoryDate =
        document.querySelector(`#${sStrIdNameOfSearchHistoryDate}`);
      lElSearchHistoryItem =
        document.querySelector(`#${sStrIdNameOfSearchHistoryItem}`);

      lElSearchHistoryDate.addEventListener(
        'change', showSpecificHistoryDateAndItem, true);
      lElSearchHistoryItem.addEventListener(
        'keyup', showSpecificHistoryDateAndItem, true);
      resolve();
    });
  }//}}}

  function initSectionBarEvent(pEvent)//{{{
  {
    var lElButton = document.createDocumentFragment();
    var lStrErrMsg = "";
    var lArrayArgs = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      lStrErrMsg = checkFunctionArguments(lArrayArgs, [
        function(pValue) { return (typeof pValue !== 'object'); },
      ]);
      if (lStrErrMsg) {
        reject(new Error(lStrErrMsg));
        return;
      }

      try {
        lElButton = pEvent.querySelectorAll(`.${sStrClassNameOfButton}`);
        Array.prototype.slice.call(lElButton).forEach(pValue => {
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
    var lElInput    = document.createDocumentFragment();
    var lElTextarea = document.createDocumentFragment();
    var lElSelect   = document.createDocumentFragment();
    var lStrErrMsg = "";
    var lArrayArgs = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      lStrErrMsg = checkFunctionArguments(lArrayArgs, [
        function(pValue) { return (typeof pValue !== 'object'); },
      ]);
      if (lStrErrMsg) {
        reject(new Error(lStrErrMsg));
        return;
      }

      lElInput    = pEvent.querySelectorAll("input");
      lElTextarea = pEvent.querySelectorAll("textarea");
      lElSelect   = pEvent.querySelectorAll("select");

      Array.prototype.slice.call(lElInput).forEach(pValue => {
        pValue.addEventListener('keyup', updateOptionValueToStorage, true);
        pValue.addEventListener('change', updateOptionValueToStorage, true);
      });

      Array.prototype.slice.call(lElTextarea).forEach(pValue => {
        pValue.addEventListener('keyup', updateOptionValueToStorage, true);
      });

      Array.prototype.slice.call(lElSelect).forEach(pValue => {
        pValue.addEventListener('change', updateOptionValueToStorage, true);
      });

      resolve();
    });
  }//}}}

  function initKeybindEvent(pEvent)//{{{
  {
    var lStrErrMsg = "";
    var lArrayArgs = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      lStrErrMsg = checkFunctionArguments(lArrayArgs, [
        function(pValue) { return (typeof pValue !== 'object'); },
      ]);
      if (lStrErrMsg) {
        reject(new Error(lStrErrMsg));
        return;
      }

      pEvent.addEventListener('keyup', keyupEvent, true);
      resolve();
    });
  }//}}}

  function initButtonEvent(pEvent)//{{{
  {
    var lElButtons = document.createDocumentFragment();
    var lStrErrMsg = "";
    var lArrayArgs = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      lStrErrMsg = checkFunctionArguments(lArrayArgs, [
        function(pValue) { return (typeof pValue !== 'object'); },
      ]);
      if (lStrErrMsg) {
        reject(new Error(lStrErrMsg));
        return;
      }

      lElButtons = pEvent.querySelectorAll('button');
      Array.prototype.slice.call(lElButtons).forEach(pValue => {
        pValue.addEventListener('click', buttonClicked, true);
      });

      resolve();
    });
  }//}}}

  document.addEventListener('DOMContentLoaded', () => {//{{{
    var lObjArgs = {};
    var lStrMenu = "";

    (() => {
      return new Promise(resolve => {
        db = new Database(gStrDbName, gNumDbVersion);
        db.open(gObjDbCreateStores);
        resolve();
      });
    }())
    .then(loadTranslation(document, gStrTranslationPath))
    .then(operateOption.load(document))
    .then(initSectionBarEvent(document))
    .then(initOptionElementEvent(document))
    .then(initButtonEvent(document))
    .then(initKeybindEvent(document))
    .then(initHistoryEvent(document))
    .then(initSessionHistoryEvent(document))
    .then(() => {
      lObjArgs = getQueryString(document);
      lStrMenu = (lObjArgs === void 0 ||
                  lObjArgs === null ||
                  !lObjArgs.hasOwnProperty('page')) ? sStrDefaultMenu :
                                                      lObjArgs.page;
      return changeMenu(lStrMenu);
    })
    .catch(rErr => console.error(rErr));
  }, true);//}}}
}(this, this.document));
