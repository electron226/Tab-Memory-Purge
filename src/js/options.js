(function(window, document) {
  'use strict';

  //{{{ variables
  var db = null; // indexedDB class.

  var sStrDefaultMenu = "normal";

  var sStrClassNameOfDoesNot  = 'doNotShow';
  var sStrStyleDisplayNone    = 'display: none;';

  var sStrClassNameOfMenu   = 'sectionMenu';
  var sStrClassNameOfButton = 'sectionButton';
  var sStrClassNameWhenSelect = 'select';

  var sStrClassNameOfCopyBtn  = 'copy';
  var sStrClassNameOfApplyBtn = 'apply';

  var sStrClassNameOfSetKeybindButton   = 'keybind_set';
  var sStrClassNameOfClearKeybindButton = 'keybind_clear';
  var sStrClassNameOfKeybindOption      = 'keyOption';
  var sStrClassNameOfShowKeybind        = 'pressKey';
  var sStrClassNameOfKeybindValue       = 'keybindValue';

  var sStrClassNameOfHistoryItem       = 'historyItem';
  var sStrClassNameOfHistoryDate       = 'historyDate';
  var sStrClassNameOfHistoryItemDelete = 'itemDelete';
  var sStrClassNameOfHistoryItemIcon   = 'itemIcon';
  var sStrClassNameOfHistoryItemUrl    = 'itemUrl';
  var sStrClassNameOfHistoryItemDate   = 'itemDate';
  var sStrClassNameOfHistoryItemTitle  = 'itemTitle';
  var sStrClassNameOfHistoryItemList   = 'itemList';
  var sStrAttrNameOfWindowId           = 'windowId';
  var sStrAttrNameOfDatabase           = 'database';
  var sStrAttrNameOfItemId             = 'historyItemId';

  var sStrIdNameOfHistoryList             = 'historyList';
  var sStrIdNameOfSearchHistoryDate       = 'searchHistoryDate';
  var sStrIdNameOfSearchHistoryItem       = 'searchHistoryItem';
  var sStrIdNameOfSearchHistoryDateList   = 'historyDateList';

  var sStrIdNameOfDateListNav             = 'dateListNav';
  var sStrIdNameOfDateList                = 'dateList';
  var sStrIdNameOfAddSavedSessionDateList = 'savedSessionDateList';
  var sStrIdNameOfSessionDateList         = 'sessionDateList';
  var sStrIdNameOfSessionNotFound         = 'sessionNotFound';
  var sStrIdNameOfSavedSessionDateTitle   = 'savedSessionDateTitle';
  var sStrIdNameOfSessionList             = 'sessionList';
  var sStrIdNameOfSessionTitle            = 'sessionTitle';
  var sStrIdNameOfSessionSave             = 'sessionSave';
  var sStrIdNameOfSessionDelete           = 'sessionDelete';
  var sStrIdNameOfSessionRestore          = 'sessionRestore';
  var sStrIdNameOfSessionIconControl      = 'sessionIconControl';
  var sStrIdNameOfChangeHistory           = 'change_history';
  var sStrIdNameOfExport                  = 'export';
  var sStrIdNameOfImport                  = 'import';

  var sObjOptsForCreateHistoryDate = {
    className:  sStrClassNameOfHistoryDate,
    deleteFunc: function(pEvent) {
      return removeHistoryDate(pEvent)
             .then(getAllHistory)
             .then(historyArray => {
               return showAutoCompleteDateList(historyArray.reverse());
             });
    },
    itemDelete: sStrClassNameOfHistoryItemDelete,
    itemDate:   sStrClassNameOfHistoryItemDate,
    itemList:   sStrClassNameOfHistoryItemList,
  };
  var sObjOptsForCreateHistoryItem = {
    attrNameOfDatabase: sStrAttrNameOfDatabase,
    deleteFunc: function(pEvent) {
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
    return this.call(pElement, pStrName, null, 'get');
  };//}}}
  OperateOptionValue.prototype.set =//{{{
    function(pElement, pStrName, pStrValue) {
    return this.call(pElement, pStrName, pStrValue, 'set');
  };//}}}
  OperateOptionValue.prototype.call =//{{{
    function(pElement, pStrName, pStrValue, pStrType) {
    var $this    = this;
    var lObjOpts = {};
    var lElement = document.createDocumentFragment();
    var lElSelect = document.createDocumentFragment();

    return new Promise((resolve, reject) => {
      if (pStrType === void 0 || pStrType === null) {
        pStrType = 'get';
      }

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
                  console.log('select set', pStrValue);
                  pValue.selected = true;
                } else {
                  console.log('select not set', pStrValue);
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
        console.warn("Doesn't find the elememt name.", pStrName);
      }
      resolve();
    });
  };//}}}
  OperateOptionValue.prototype._call = function(pObj) {//{{{
    var lElement      = pObj.element;
    var lStrValue     = pObj.value;
    var lStrType      = pObj.type;
    var lStrProperty  = pObj.property;
    var lStrValueType = pObj.valueType;
    var lAnyVal       = (lStrType === 'get') ?
                        lElement[lStrProperty] : lStrValue;
    var lNumMax       = 0;
    var lNumMin       = 0;

    return new Promise((resolve, reject) => {
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
    return this.load(pElement, gMapDefaultValues);
  };//}}}
  OperateOptionValue.prototype.load = function(pElement, pObjOpts) {//{{{
    var $this         = this;
    var lArrayPromise = [];
    var lMapNew       = new Map();

    var iter          = lMapNew.entries();
    var i             = iter.next();
    var key           = "";

    return new Promise((resolve, reject) => {
      $this.export()
      .then(rOptions => {
        switch (toType(pObjOpts)) {
        case 'map':
          rOptions = pObjOpts;
          break;
        case 'object':
          lMapNew = new Map();
          for (key in pObjOpts) {
            if (pObjOpts.hasOwnProperty(key)) {
              lMapNew.set(key, pObjOpts[key]);
            }
          }
          rOptions = lMapNew;
          break;
        }

        lArrayPromise = [];
        iter = rOptions.entries();
        i    = iter.next();
        while (!i.done) {
          lArrayPromise.push($this.set(pElement, i.value[0], i.value[1]));
          i = iter.next();
        }

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
    var $this = this;

    return new Promise((resolve, reject) => {
      $this.load(pElement, pObjOpts)
      .then(resolve(pObjOpts))
      .catch(reject);
    });
  };//}}}
  //}}}

  var ShowMenuSelection = function(pStrSelectors, pClassNameWhenSelect) {//{{{
    ShowMenuSelection.toggleSectionRegex = /(display:\s*)(\w+);/i;

    this.strMenuSelector        = pStrSelectors.menu;
    this.strButtonSelector      = pStrSelectors.button;
    this.strClassNameWhenSelect = pClassNameWhenSelect;
  };
  ShowMenuSelection.prototype.showMenu = function(pStrSelector) {//{{{
    var i = 0;

    return function(pIdName) {
      var lElShowMenu = document.querySelector(`${pStrSelector}#${pIdName}`);
      var lElDoesNotShowMenu = document.querySelectorAll(
        `${pStrSelector}:not(#${pIdName})`);

      removeStringFromAttributeOfElement(
        lElShowMenu, 'style', sStrStyleDisplayNone);
      i = 0;
      while (i < lElDoesNotShowMenu.length) {
        addStringToAttributeOfElement(
          lElDoesNotShowMenu[i], 'style', sStrStyleDisplayNone);
        ++i;
      }
    };
  };//}}}
  ShowMenuSelection.prototype.changeSelectionButtonColor = //{{{
    function(pStrSelector) {
    var $this         = this;
    var lElPrevSelect = document.createDocumentFragment();
    var lElNewSelect  = document.createDocumentFragment();

    return function(pName) {
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
    this.id     = pId || null;
    this.objResult = null;
  };
  KeyTrace.prototype.start = function(pId) {//{{{
    if (pId === null || pId === void 0) {
      throw new Error("Doesn't set the id of arguments.");
    }

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
    return this.objResult;
  };//}}}
  //}}}

  function processAfterMenuSelection(name)//{{{
  {
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

  window.addEventListener('popstate', e => {//{{{
    if (e.state) {
      menuToggle.show(e.state || sStrDefaultMenu);
    }
  }, true);//}}}

  //{{{ A variable of a function of using closure.
  var operateOption = new OperateOptionValue();
  var keybindTrace  = new KeyTrace();
  var menuToggle    = new ShowMenuSelection(
    {
      menu:   `.${sStrClassNameOfMenu}`,
      button: `.${sStrClassNameOfButton}`,
    },
    sStrClassNameWhenSelect);
  //}}}

  function clearItemInElement(pNode)//{{{
  {
    while(pNode.firstChild) {
      pNode.removeChild(pNode.firstChild);
    }
    return pNode;
  }//}}}

  function deleteKeyItemFromObject(pObj, pDeleteKeys)//{{{
  {
    var lObjNew         = pObj;
    var lObjType        = toType(pObj);
    var lDeleteKeysType = toType(pDeleteKeys);
    var iter;
    var i   = 0;
    var key = "";

    if (lObjType !== 'object' &&
        lObjType !== 'set' &&
        lObjType !== 'map' ||
        lDeleteKeysType !== 'Array' &&
        lDeleteKeysType !== 'object' &&
        lDeleteKeysType !== 'map' &&
        lDeleteKeysType !== 'set') {
      throw new Error('Invalid arguments.');
    }

    if (lDeleteKeysType === 'object') {
      for (key in pDeleteKeys) {
        if (pDeleteKeys.hasOwnProperty(key)) {
          if (lObjType === 'object') {
            delete lObjNew[ pDeleteKeys[key] ];
          } else {
            lObjNew.delete(pDeleteKeys[key]);
          }
        }
      }
    } else {
      // the deleteKeysType is Array, map, or set.
      iter = pDeleteKeys.keys();
      i = iter.next();
      while (!i.done) {
        if (lObjType === 'object') {
          delete lObjNew[ i.value ];
        } else {
          // the objType is map or set.
          lObjNew.delete(i.value);
        }
        i = iter.next();
      }
    }

    return lObjNew;
  }//}}}

  function showOptionValuesToOperateSettingsPage()//{{{
  {
    var lElExport = document.querySelector(`#${sStrIdNameOfExport}`);
    var lNewOpts = {};
    var lObj = {};
    var iter;
    var i;

    return new Promise(resolve => {
      operateOption.export()
      .then(options => {
        lObj = {};
        iter = options.entries();
        i = iter.next();
        while (!i.done) {
          lObj[ i.value[0] ] = i.value[1];
          i = iter.next();
        }
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

    var lElKeybindOptions =
      document.querySelectorAll(`.${sStrClassNameOfKeybindOption}`);
    var lElKeybind  = document.createDocumentFragment();
    var lObjKeyJson = {};
    var lStrKey     = '';
    var i = 0;

    i = 0;
    while (i < lElKeybindOptions.length) {
      lElKeybind  = lElKeybindOptions[i];
      lObjKeyJson = lElKeybind.querySelector(`.${sStrClassNameOfKeybindValue}`);
      lStrKey     = lElKeybind.querySelector(`.${sStrClassNameOfShowKeybind}`);
      try {
        if (lObjKeyJson.value === '{}' ||
            lObjKeyJson.value === ''   ||
            lObjKeyJson.value === null ||
            lObjKeyJson.value === void 0) {
            ++i;
            continue;
        }

        lStrKey.value = generateKeyString(JSON.parse(lObjKeyJson.value));
      } catch (e) {
        console.warn(e, lObjKeyJson.value);
      }

      ++i;
    }
  }//}}}

  function setKeybindOption(pClassName, pKeyInfo)//{{{
  {
    var lElOpt = document.querySelector(
      `.${pClassName}.${sStrClassNameOfKeybindOption}`);
    var lElKeybindValue =
      lElOpt.querySelector(`.${sStrClassNameOfKeybindValue}`);
    var lElShowKeybind =
      lElOpt.querySelector(`.${sStrClassNameOfShowKeybind}`);

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
    var lElTarget    = pEvent.target;
    var lElClassName = lElTarget.getAttribute('class');
    var lEventNew    = document.createEvent('HTMLEvents');
    var lElement     = document.createDocumentFragment();
    var lElExport    = document.createDocumentFragment();
    var lElImport    = document.createDocumentFragment();
    var lStrMsg      = "";
    var lStrValue    = "";
    var lBoolResult  = false;

    // keybind only.
    var lStrClassNameOfParent = lElTarget.parentNode.getAttribute('class');
    var lStrOptionName        = "";
    if (lStrClassNameOfParent) {
      lStrOptionName = lStrClassNameOfParent.replace(
        sStrClassNameOfKeybindOption, '').trim();
    }

    switch (lElClassName) {
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
      .catch(e => console.error(e));
      break;
    }
  }//}}}

  function addAutocompleteDateList(pElement)//{{{
  {
    var lElAutoComp = pElement;
    var lElOption = document.createElement('option');

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
    var lStrLang       = chrome.i18n.getUILanguage();

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
    var lElSessionIconControl =
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
      var lElSessionTitle =
        document.querySelector(`#${sStrIdNameOfSessionTitle}`);
      lElSessionTitle.textContent = '';
      resolve();
    });
  }//}}}

  function saveSession()//{{{
  {
    return new Promise((resolve, reject) => {
      var lElAddLocationWhereSessionList =
        document.querySelector(`#${sStrIdNameOfSessionList}`);
      var lElShowField = lElAddLocationWhereSessionList.querySelectorAll(
        `fieldset:not(.${sStrClassNameOfDoesNot})`);
      if (lElShowField.length === 0) {
        resolve();
        return;
      }

      var lMapUrlsOfEachWin = new Map();
      var iter              = lMapUrlsOfEachWin.entries();
      var j                 = iter.next();
      var i                 = 0;
      var lNumWinId         = 0;
      var arrayNewSessions  = [];
      var lArrayUrls        = [];
      var lStrItemUrl       = sObjOptsForCreateHistoryItem.itemUrl;
      var lElField          = document.createDocumentFragment();
      var lElItemUrlList    = document.createDocumentFragment();
      var lDateNow          = Date.now();

      while (i < lElShowField.length) {
        lElField       = lElShowField[i];
        lNumWinId      = lElField.getAttribute(sStrAttrNameOfWindowId);
        lElItemUrlList = lElField.querySelectorAll(`.${lStrItemUrl}`);
        lArrayUrls     = [];
        Array.prototype.slice.call(lElItemUrlList)
          .forEach(v => lArrayUrls.push(v.href));
        lMapUrlsOfEachWin.set(lNumWinId, lArrayUrls);
        ++i;
      }

      lDateNow         = Date.now();
      arrayNewSessions = [];
      iter             = lMapUrlsOfEachWin.entries();
      j                = iter.next();
      while (!j.done) {
        arrayNewSessions = arrayNewSessions.concat(
          j.value[1].map(v => {
            return {
              date: lDateNow,
              url: v,
              windowId: parseInt(j.value[0]) || 0
            };
          })
        );
        j = iter.next();
      }

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
      var lElSessionTitle =
        document.querySelector(`#${sStrIdNameOfSessionTitle}`);
      var lNumDate        = parseInt(lElSessionTitle.getAttribute('name'));
      var lArrayDbNames   = [ gStrDbSessionName, gStrDbSavedSessionName ];
      var lArrayPromise   = [];
      var lArraySessions  = [];
      var lArrayDelKeys   = [];
      var i               = 0;

      i = 0;
      while (i < lArrayDbNames.length) {
        lArrayPromise.push(
          db.getCursor({
            name: lArrayDbNames[i],
            range: IDBKeyRange.only(lNumDate),
            indexName: 'date',
          })
        );
        ++i;
      }

      Promise.all(lArrayPromise)
      .then(results => {
        i = 0;
        while (i < results.length) {
          lArraySessions = lArraySessions.concat(results[i]);
          ++i;
        }

        lArrayPromise   = [];
        lArrayDelKeys = lArraySessions.map(v => v.id);
        i = 0;
        while (i < lArrayDbNames.length) {
          lArrayPromise.push(
            db.delete({
              name: lArrayDbNames[i],
              keys: lArrayDelKeys,
            })
          );
          ++i;
        }

        return Promise.all(lArrayPromise);
      })
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function restoreSession()//{{{
  {
    var lElAddLocationWhereSessionList =
      document.querySelector(`#${sStrIdNameOfSessionList}`);
    var lElShowField = lElAddLocationWhereSessionList.querySelectorAll(
      `fieldset:not(.${sStrClassNameOfDoesNot})`);
    if (lElShowField.length === 0) {
      return;
    }

    var lElField      = document.createDocumentFragment();
    var lElA          = document.createElement('a');
    var lArrayRestore = [];
    var lNumWindowId  = 0;
    var i             = 0;

    i = 0;
    while (i < lElShowField.length) {
      lElField      = lElShowField[i];
      lNumWindowId  = parseInt(lElField.getAttribute(sStrAttrNameOfWindowId));
      lElA  = lElField.querySelectorAll(`.${sStrClassNameOfHistoryItemUrl}`);
      Array.prototype.slice.call(lElA).forEach(
        v => lArrayRestore.push({ url: v.href, windowId: lNumWindowId }));
      ++i;
    }

    chrome.runtime.sendMessage({ event: 'restore', session: lArrayRestore });
  }//}}}

  function closureCreateSessionDateList(pObjOpts)//{{{
  {
    //{{{ local variable.
    const gStrDbName       = pObjOpts.databaseName;
    const lElToAddDateList = pObjOpts.dateList;
    const lElToAddItemList = pObjOpts.itemList;
    const lNumCurrentTime  = pObjOpts.currentTime;
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
      var lElTarget    = pEvent.target;
      var lStrName     = lElTarget.getAttribute('name');
      var lElList      = lElTarget.parentNode;
      var lStrListName = lElList.getAttribute('id');
      var lElShowLists     =
        lElToAddItemList.querySelectorAll(`fieldset[name="${lStrName}"]`);
      var lElNotShowLists  =
        lElToAddItemList.querySelectorAll(`fieldset:not([name="${lStrName}"])`);
      var lElSessionSave   =
        document.querySelector(`#${sStrIdNameOfSessionSave}`);
      var lElDateList      = document.querySelector(`#${sStrIdNameOfDateList}`);
      var lElSelectDates   = lElDateList.querySelector(`[name="${lStrName}"]`);
      var lElNotSelectDates =
        lElDateList.querySelectorAll(`:not([name="${lStrName}"])`);
      var lElSessionTitle  =
        document.querySelector(`#${sStrIdNameOfSessionTitle}`);
      var i = 0;

      // select which is showed a list of a session date.
      i = 0;
      while (i < lElShowLists.length) {
        removeStringFromAttributeOfElement(
          lElShowLists[i], 'class', sStrClassNameOfDoesNot);
        ++i;
      }

      i = 0;
      while (i < lElNotShowLists.length) {
        addStringToAttributeOfElement(
          lElNotShowLists[i], 'class', sStrClassNameOfDoesNot);
        ++i;
      }

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
      lElSessionTitle.textContent = lElSelectDates.textContent;

      i = 0;
      while (i < lElNotSelectDates.length) {
        removeStringFromAttributeOfElement(
          lElNotSelectDates[i], 'class', sStrClassNameWhenSelect);
        ++i;
      }
    }//}}}

    function closureCreateSessionDate()//{{{
    {
      var lElDiv = document.createElement('div');

      return function(pTime) {
        var lElDivRet = lElDiv.cloneNode(true);
        var lStrText;

        if (lNumCurrentTime !== void 0 &&
            lNumCurrentTime !== undefined &&
            lNumCurrentTime === parseInt(pTime)) {
          lStrText = 'Current Session';
        } else {
          lStrText = getFormatEachLanguages(pTime);
        }

        lElDivRet.setAttribute('name', pTime);
        lElDivRet.textContent = lStrText;
        lElDivRet.addEventListener('click', onClicked, true);

        return lElDivRet;
      };
    }//}}}

    function createSessionDateListItem(pArrayItems)//{{{
    {
      var lCreateHistoryItem = closureCreateHistoryItem(
        Object.assign(sObjOptsForCreateHistoryItem, {
          databaseName: gStrDbName,
          deleteFunc:   removeSessionHistoryItem,
        })
      );
      var lObjOpts = {
        date: false,
      };
      var lElItem    = document.createDocumentFragment();
      var lArrayList = [];
      var i          = 0;

      i = 0;
      while (i < pArrayItems.length) {
        lElItem = lCreateHistoryItem(pArrayItems[i], lObjOpts);
        lArrayList.push(lElItem);
        ++i;
      }

      return lArrayList;
    }//}}}

    function getDictSplitEachSession(pArraySessions, pStrAttrName)//{{{
    {
      var lObjData   = {};
      var lAnyAttr   = null;
      var lAnyValue  = null;
      var lMapResult = new Map();
      var i          = 0;

      i = 0;
      while (i < pArraySessions.length) {
        lObjData  = pArraySessions[i];
        lAnyAttr  = lObjData[pStrAttrName];
        lAnyValue = lMapResult.get(lAnyAttr) || [];
        lAnyValue.push(lObjData);
        lMapResult.set(lAnyAttr, lAnyValue);

        ++i;
      }
      return lMapResult;
    }//}}}

    function createSessionWindowList(lNumTime, lMapWindow)//{{{
    {
      var lCreateHistoryDate = closureCreateHistoryDate(
        Object.assign(sObjOptsForCreateHistoryDate, {
          deleteFunc: removeSessionHistoryWindow,
        })
      );
      var lNumWindowId         = 0;
      var lNumCount            = 0;
      var lElField             = document.createDocumentFragment();
      var lElArticle           = document.createDocumentFragment();
      var lElWindowTitle       = document.createDocumentFragment();
      var lElHistoryItemDelete = document.createDocumentFragment();
      var lArrayList           = [];
      var iter                 = null;
      var i                    = null;

      lArrayList = [];
      lNumCount  = 0;
      iter       = lMapWindow.entries();
      i          = iter.next();
      while (!i.done) {
        lNumWindowId = i.value[0];
        lElField     = lCreateHistoryDate({ date: lNumTime });
        addStringToAttributeOfElement(
          lElField, sStrAttrNameOfWindowId, lNumWindowId);
        addStringToAttributeOfElement(
          lElField, 'class', sStrClassNameOfDoesNot);

        lElWindowTitle =
          lElField.querySelector(`.${sStrClassNameOfHistoryItemDate}`);
        lElWindowTitle.textContent = `Window ${lNumCount}`;

        lElHistoryItemDelete =
          lElField.querySelector(`.${sStrClassNameOfHistoryItemDelete}`);
        addStringToAttributeOfElement(
            lElHistoryItemDelete, sStrAttrNameOfWindowId, lNumWindowId);

        lElArticle =
          lElField.querySelector(`.${sObjOptsForCreateHistoryDate.itemList}`);

        createSessionDateListItem(i.value[1])
        .forEach(v => lElArticle.appendChild(v));

        lArrayList.push(lElField);

        ++lNumCount;
        i = iter.next();
      }

      return lArrayList;
    }//}}}

    function createSessionDateList(pArraySessions)//{{{
    {
      var lCreateSessionDate      = closureCreateSessionDate();
      var lMapSessionEachDate     = new Map();
      var lMapSessionEachWindowId = new Map();
      var lArrayDateList          = [];
      var lArrayItemList          = [];
      var lArrayItem              = [];
      var i                       = 0;
      var j                       = null;
      var iter                    = null;

      i = 0;
      while (i < pArraySessions.length) {
        lMapSessionEachDate =
          getDictSplitEachSession(pArraySessions[i].data, 'date');
        iter = lMapSessionEachDate.entries();
        j    = iter.next();
        while (!j.done) {
          lArrayDateList.push( lCreateSessionDate(j.value[0]) );
          lMapSessionEachWindowId =
            getDictSplitEachSession(j.value[1], sStrAttrNameOfWindowId);
          lArrayItem =
            createSessionWindowList(j.value[0], lMapSessionEachWindowId);
          lArrayItemList = lArrayItemList.concat(lArrayItem);

          j = iter.next();
        }
        ++i;
      }

      lArrayDateList.forEach(v => lElToAddDateList.appendChild(v));
      lArrayItemList.forEach(v => lElToAddItemList.appendChild(v));
    }//}}}

    return createSessionDateList;
  }//}}}

  function selectCurrentSession()//{{{
  {
    var lElLocationWhereToAddSessionDateList =
      document.querySelector(`#${sStrIdNameOfSessionDateList}`);
    var lElCurrentSessionItem  = document.createDocumentFragment();
    var lNumCurrentSessionTime = 0;

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
    var lElAddSavedSessionDateListLocation =
      document.querySelector(`#${sStrIdNameOfAddSavedSessionDateList}`);
    var lElAddSessionDateListLocation      =
      document.querySelector(`#${sStrIdNameOfSessionDateList}`);
    var lElAddLocationWhereSessionList     =
      document.querySelector(`#${sStrIdNameOfSessionList}`);
    var lElSavedSessionDateTitle           =
      document.querySelector(`#${sStrIdNameOfSavedSessionDateTitle}`);
    var lElDateListNav                     =
      document.querySelector(`#${sStrIdNameOfDateListNav}`);
    var lElSessionNotFound                 =
      document.querySelector(`#${sStrIdNameOfSessionNotFound}`);
    var lArraySavedSessions         = [];
    var lArraySessions              = [];
    var lNumCurrentTime             = 0;
    var lCreateSavedSessionDateList = null;
    var lCreateSessionDateList      = null;

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
            databaseName: gStrDbSavedSessionName,
            dateList:     lElAddSavedSessionDateListLocation,
            itemList:     lElAddLocationWhereSessionList,
          });
          lCreateSavedSessionDateList(lArraySavedSessions);
        }

        //{{{ session list.
        chrome.storage.local.get(gStrPreviousSessionTimeKey, items => {
          lNumCurrentTime = items[gStrPreviousSessionTimeKey];

          // new
          lCreateSessionDateList = closureCreateSessionDateList({
            databaseName: gStrDbSessionName,
            dateList:     lElAddSessionDateListLocation,
            itemList:     lElAddLocationWhereSessionList,
            currentTime:  lNumCurrentTime,
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
    var lElSearchHistoryDateList =
      document.querySelector(`#${sStrIdNameOfSearchHistoryDateList}`);
    var lElAutocompleteDateList =
      addAutocompleteDateList(lElSearchHistoryDateList);
    var i = 0;

    i = 0;
    while (i < pArrayHistories.length) {
      lElAutocompleteDateList(pArrayHistories[i].date);
      ++i;
    }
  }//}}}

  function removeHistoryDate(pEvent)//{{{
  {
    return new Promise((resolve, reject) => {
      var lTarget   = pEvent.target;
      var lDate     = new Date( parseInt(lTarget.getAttribute('name')) );
      var lFullYear = lDate.getFullYear();
      var lMonth    = lDate.getMonth();
      var lDay      = lDate.getDate();
      var lBegin    = new Date(lFullYear, lMonth, lDay, 0, 0, 0, 0);
      var lEnd      = new Date(lFullYear, lMonth, lDay, 23, 59, 59, 999);
      var lDelKeys  = [];
      var lHistoryDateLegend = lTarget.parentNode;
      var lHistoryDateField  = lHistoryDateLegend.parentNode;
      var lHistoryList       = lHistoryDateField.parentNode;

      db.getCursor({
        name:  gStrDbHistoryName,
        range: IDBKeyRange.bound(lBegin.getTime(), lEnd.getTime()),
      })
      .then(histories => {
        lDelKeys = histories.map(v => v.date);
        return db.delete({
          name: gStrDbHistoryName,
          keys: lDelKeys,
        });
      })
      .then(ret => {
        lHistoryList.removeChild(lHistoryDateField);
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
    var lTarget          = pEvent.target;
    var lHistoryItem     = lTarget.parentNode;
    var lHistoryItemList = lHistoryItem.parentNode;
    // indexedDB name.
    var lDbName = lTarget.getAttribute(sStrAttrNameOfDatabase);
    // session item only.
    var lItemId = parseInt(lTarget.getAttribute(sStrAttrNameOfItemId), 10);
    // this value is new Date().getTime().
    var lTime   = parseInt(lTarget.getAttribute('name'), 10);

    return new Promise((resolve, reject) => {
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
    var lElSessionList =
      document.querySelector(`#${sStrIdNameOfSessionList}`);
    var getShowField = function(){
      return lElSessionList.querySelectorAll(
        `fieldset:not(.${sStrClassNameOfDoesNot})`);
    };
    var lElShowField = getShowField();
    var lElItemList;
    var i = 0;

    return new Promise((resolve, reject) => {
      removeHistoryItem(event)
      .then(() => {
        i = 0;
        while (i < lElShowField.length) {
          lElItemList =
            lElShowField[i].querySelector(`.${sStrClassNameOfHistoryItemList}`);
          if (lElItemList.childNodes.length === 0) {
            lElSessionList.removeChild(lElShowField[i]);
          }
          ++i;
        }

        return (getShowField().length === 0) ? initSessionHistory() : null;
      })
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function removeSessionHistoryWindow(event)//{{{
  {
    var lTarget        = event.target;
    var lElShowField   = document.createDocumentFragment();
    var lElSessionList = document.querySelector(`#${sStrIdNameOfSessionList}`);
    var getShowField = function(){
      return lElSessionList.querySelectorAll(
        `fieldset:not(.${sStrClassNameOfDoesNot})`);
    };
    var lNumWindowId   = parseInt(lTarget.getAttribute(sStrAttrNameOfWindowId));
    var lDateTime      = parseInt(lTarget.getAttribute('name'));
    var lArrayDbName   = [ gStrDbSessionName, gStrDbSavedSessionName ];
    var lArrayPromise  = [];
    var lArraySessions = [];
    var lArrayDelKeys  = [];
    var lNumWindowIdOfField = 0;
    var i                   = 0;

    return new Promise((resolve, reject) => {
      // get from all the databases of a session history.
      lArrayPromise  = [];
      i = 0;
      while (i < lArrayDbName.length) {
        lArrayPromise.push(
          db.getCursor({
            name:      lArrayDbName[i],
            range:     IDBKeyRange.only(lDateTime),
            indexName: 'date',
          })
        );
        ++i;
      }

      Promise.all(lArrayPromise)
      .then(rResults => {
        // create the array for to delete session history from database.
        lArraySessions = [];
        i              = 0;
        while (i < rResults.length) {
          lArraySessions = lArraySessions.concat(rResults[i]);
          ++i;
        }
        lArrayDelKeys = lArraySessions.filter(v => {
          return lNumWindowId ? v.windowId === lNumWindowId : true;
        })
        .map(v => v.id);

        // delete specified window from the databases of a session history.
        lArrayPromise = [];
        i = 0;
        while (i < lArrayDbName.length) {
          lArrayPromise.push(
            db.delete({
              name: lArrayDbName[i],
              keys: lArrayDelKeys,
            })
          );
          ++i;
        }

        return Promise.all(lArrayPromise);
      })
      .then(() => {
        // deletes the deleted window item from DOM.
        lElShowField = getShowField();
        i = 0;
        while (i < lElShowField.length) {
          lNumWindowIdOfField =
            parseInt(lElShowField[i].getAttribute(sStrAttrNameOfWindowId));
          if (lNumWindowIdOfField === lNumWindowId) {
            lElSessionList.removeChild(lElShowField[i]);
          }
          ++i;
        }

        // If the session history of the same Date in empty, deletes the field.
        return (getShowField().length === 0) ? initSessionHistory() : null;
      })
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function closureCreateHistoryDate(pObjOpts)//{{{
  {
    if (pObjOpts === void 0 ||
        pObjOpts === null ||
        !pObjOpts.hasOwnProperty('deleteFunc')) {
      throw new Error("Invalid arugments. Doesn't find object.");
    }

    //{{{ local variables.
    var lFuncDelete                    = pObjOpts.deleteFunc;
    var lStrClassNameOfHistoryDateItem = pObjOpts.className || 'historyDate';
    var lStrClassNameOfDeleteButton    = pObjOpts.itemDelete || 'itemDelete';
    // itemDate also be used as DateTitle.
    var lStrClassNameOfHistoryDate     = pObjOpts.itemDate || 'itemDate';
    var lStrClassNameToAddHistoryItem  = pObjOpts.itemList || 'itemList';
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

    function createHistoryDate(pItem, pOpts)//{{{
    {
      if (!pItem.hasOwnProperty('date')) {
        throw new Error("the property of 'date' is not found.");
      }

      var lElProto        = createPrototype();
      var lElHistoryDate  = lElProto.cloneNode(true);
      var lElDeleteButton =
        lElHistoryDate.querySelector(`.${lStrClassNameOfDeleteButton}`);
        var lElDateTitle  =
        lElHistoryDate.querySelector(`.${lStrClassNameOfHistoryDate}`);
      var lNumTime        = 0;
      var lObjOpts = { // default options.
        deleteButton: true,
        date:         true,
        title:        true,
      };

      if (pOpts !== void 0 && pOpts !== null) {
        Object.keys(pOpts).forEach(v => lObjOpts[v] = pOpts[v]);
      }

      lNumTime       = new Date(pItem.date).getTime();
      addStringToAttributeOfElement(lElHistoryDate, 'name', lNumTime);

      if (lObjOpts.deleteButton) {
        addStringToAttributeOfElement(lElDeleteButton, 'name', lNumTime);
        lElDeleteButton.addEventListener('click', lFuncDelete, true);
      }

      if (lObjOpts.title || lObjOpts.date) {
        lElDateTitle.textContent = getFormatEachLanguages(pItem.date, {
          'ja':      'YYYY/MM/DD',
          'default': 'MM/DD/YYYY',
        });
      }

      return lElHistoryDate;
    }//}}}

    return createHistoryDate;
  }//}}}

  function closureCreateHistoryItem(pObj)//{{{
  {
    if (pObj === void 0 ||
        pObj === null ||
        !pObj.hasOwnProperty('databaseName') ||
        !pObj.hasOwnProperty('deleteFunc')) {
      throw new Error("Invalid arguments.");
    }

    //{{{ local variable
    var gStrDbName                  = pObj.databaseName;
    var lFuncDelete                 = pObj.deleteFunc;
    var lStrAttrNameOfDatabase      = pObj.attrNameOfDatabase || 'database';
    var lStrClassNameOfHistoryItem  = pObj.className || 'historyItem';
    var lStrClassNameOfDeleteButton = pObj.itemDelete || 'itemDelete';
    var lStrClassNameOfPageIcon     = pObj.itemIcon || 'itemIcon';
    var lStrClassNameOfTitle        = pObj.itemTitle || 'itemTitle';
    var lStrClassNameOfDate         = pObj.itemDate || 'itemDate';
    var lStrClassNameOfLink         = pObj.itemUrl || 'itemUrl';
    var lStrAttrNameOfItemId        = pObj.attrNameOfItemId || 'historyItemId';
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

    function createHistoryItem(pItem, pOpts)//{{{
    {
      if (!pItem.hasOwnProperty('date')) {
        throw new Error("the property of 'date' is not found.");
      }

      var lElProto        = createPrototype();
      var lElItem         = lElProto.cloneNode(true);
      var lElDeleteButton =
        lElItem.querySelector(`.${lStrClassNameOfDeleteButton}`);
      var lElDate         = lElItem.querySelector(`.${lStrClassNameOfDate}`);
      var lElLink         = lElItem.querySelector(`.${lStrClassNameOfLink}`);
      var lElIcon         =
        lElItem.querySelector(`.${lStrClassNameOfPageIcon}`);
      var lElTitle        = lElItem.querySelector(`.${lStrClassNameOfTitle}`);
      var lObjOpts = { // default.
        deleteButton: true,
        date:         true,
        link:         true,
        title:        true,
        icon:         true,
      };
      if (pOpts !== void 0 && pOpts !== null) {
        Object.keys(pOpts).forEach(v => lObjOpts[v] = pOpts[v]);
      }

      lElItem.setAttribute('name', pItem.date);

      if (lObjOpts.deleteButton) {
        lElDeleteButton.setAttribute('name', pItem.date);
        lElDeleteButton.setAttribute(lStrAttrNameOfDatabase, gStrDbName);
        lElDeleteButton.addEventListener('click', lFuncDelete, true);
        if (pItem.hasOwnProperty('id')) {
          lElDeleteButton.setAttribute(lStrAttrNameOfItemId, pItem.id);
        }
      }

      if (lObjOpts.date !== false) {
        lElDate.textContent = formatDate(new Date(pItem.date), 'hh:mm:ss');
      }

      if (pItem.hasOwnProperty('url') && lObjOpts.link) {
        lElLink.setAttribute('href', pItem.url);
      }

      if (pItem.hasOwnProperty('dataURI') && lObjOpts.icon) {
        lElIcon.setAttribute('src', pItem.dataURI);
      }

      if (pItem.hasOwnProperty('title') && lObjOpts.title) {
        lElTitle.textContent = pItem.title;
      }

      return lElItem;
    }//}}}

    return createHistoryItem;
  }//}}}

  function showAllHistory()//{{{
  {
    var lElHistoryDateList   =
      document.querySelector(`#${sStrIdNameOfHistoryList}`);
    var lElHistoryItemList   = document.createDocumentFragment();
    var lElHistoryDate       = document.createDocumentFragment();
    var lElCreateHistoryDate = null;
    var lElCreateHistoryItem = null;
    var lArrayList = [];
    var lObjData   = {};
    var i          = 0;
    var j          = 0;
    var z          = 0;

    return new Promise((resolve, reject) => {
      getAllHistory()
      .then(historyArray => {
        historyArray = historyArray.reverse();

        showAutoCompleteDateList(historyArray);

        clearItemInElement(lElHistoryDateList);

        lElCreateHistoryDate =
          closureCreateHistoryDate(sObjOptsForCreateHistoryDate);
        lElCreateHistoryItem =
          closureCreateHistoryItem(
            Object.assign(sObjOptsForCreateHistoryItem,
              { databaseName: gStrDbHistoryName }));

        i = 0;
        while (i < historyArray.length) {
          lObjData       = historyArray[i];
          lElHistoryDate = lElCreateHistoryDate(lObjData);

          lArrayList = [];
          j = 0;
          while (j < lObjData.data.length) {
            lArrayList.push( lElCreateHistoryItem(lObjData.data[j]) );
            j++;
          }
          lArrayList = lArrayList.reverse();

          lElHistoryItemList =
            lElHistoryDate.querySelector(`.${sStrClassNameOfHistoryItemList}`);
          z = 0;
          while (z < lArrayList.length) {
            lElHistoryItemList.appendChild(lArrayList[z]);
            ++z;
          }

          lElHistoryDateList.appendChild(lElHistoryDate);

          ++i;
        }

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
    var lElSearchHistoryDate         =
      document.querySelector(`#${sStrIdNameOfSearchHistoryDate}`);
    var lStrSearchHistoryValue       = lElSearchHistoryDate.value;
    var lStrSearchHistoryValueLen    = lStrSearchHistoryValue.length;
    var lElSearchHistoryItem         =
      document.querySelector(`#${sStrIdNameOfSearchHistoryItem}`);
    var lElSearchHistoryItemValue    = lElSearchHistoryItem.value.trim();
    var lElSearchHistoryItemValueLen = lElSearchHistoryItemValue.length;
    var lRegItem        = new RegExp(lElSearchHistoryItemValue, 'ig');
    var lElDateList     =
      document.querySelectorAll(`.${sStrClassNameOfHistoryDate}`);
    var lElField        = document.createDocumentFragment();
    var lElHistoryItems = document.createDocumentFragment();
    var lElItem         = document.createDocumentFragment();
    var lElItemTitle    = document.createDocumentFragment();
    var lElItemUrl      = document.createDocumentFragment();
    var lArrayMatch    = [];
    var lDate          = new Date();
    var lDateSearch    = new Date();
    var i              = 0;
    var j              = 0;
    var lNumCount      = 0;
    var lNumSearchTime = 0;

    if (lStrSearchHistoryValueLen > 0) {
      lArrayMatch = lStrSearchHistoryValue.match(/(\d+)-(\d+)-(\d+)/);
      lDateSearch =
        new Date(lArrayMatch[1], lArrayMatch[2] - 1, lArrayMatch[3]);
      lNumSearchTime = lDateSearch.getTime();
    }

    i = 0;
    while (i < lElDateList.length) {
      lElField = lElDateList[i];
      lDate    = new Date(parseInt(lElField.name));

      if (lStrSearchHistoryValueLen === 0 ||
          lDate.getTime() === lNumSearchTime) {
        removeStringFromAttributeOfElement(
          lElField, 'class', sStrClassNameOfDoesNot);
      } else {
        addStringToAttributeOfElement(
          lElField, 'class', sStrClassNameOfDoesNot);
        ++i;
        continue;
      }

      lElHistoryItems =
        lElField.querySelectorAll(`.${sStrClassNameOfHistoryItem}`);
      lNumCount = 0;
      j         = 0;
      while (j < lElHistoryItems.length) {
        lElItem = lElHistoryItems[j];
        lElItemTitle =
          lElItem.querySelector(`.${sStrClassNameOfHistoryItemTitle}`);
        lElItemUrl   =
          lElItem.querySelector(`.${sStrClassNameOfHistoryItemUrl}`);
        if (lElSearchHistoryItemValueLen === 0 ||
            lRegItem.test(lElItemTitle.textContent) ||
            lRegItem.test(lElItemUrl.href)) {
          removeStringFromAttributeOfElement(
            lElItem, 'class', sStrClassNameOfDoesNot);
        } else {
          addStringToAttributeOfElement(
            lElItem, 'class', sStrClassNameOfDoesNot);
          ++lNumCount;
        }
        ++j;
      }

      if (lNumCount === lElHistoryItems.length) {
        addStringToAttributeOfElement(
          lElField, 'class', sStrClassNameOfDoesNot);
      } else {
        removeStringFromAttributeOfElement(
          lElField, 'class', sStrClassNameOfDoesNot);
      }

      ++i;
    }
  }//}}}

  function changeMenu(pStrName)//{{{
  {
    return new Promise((resolve, reject) => {
      menuToggle.show(pStrName)
      .then(processAfterMenuSelection(pStrName))
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function sectionButtonClicked(pEvent)//{{{
  {
    var lElTarget = pEvent.target;
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
    var lElTarget = pEvent.target;
    var lStrName = lElTarget.getAttribute('name');
    if (lStrName === void 0 || lStrName === null || lStrName.length === 0) {
      return;
    }
    var lObjWrite = {};

    operateOption.get(document, lStrName)
    .then(rItem => {
      return new Promise(resolve => {
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
    var lElSessionSave =
      document.querySelector(`#${sStrIdNameOfSessionSave}`);
    var lElSessionDelete =
      document.querySelector(`#${sStrIdNameOfSessionDelete}`);
    var lElSessionRestore =
      document.querySelector(`#${sStrIdNameOfSessionRestore}`);

    var commonFunc = function(pEvent) {//{{{
      return new Promise((resolve, reject)=> {
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
    return new Promise(resolve => {
      var lElSearchHistoryDate =
        document.querySelector(`#${sStrIdNameOfSearchHistoryDate}`);
      var lElSearchHistoryItem =
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
    var i = 0;

    return new Promise((resolve, reject) => {
      try {
        lElButton = pEvent.querySelectorAll(`.${sStrClassNameOfButton}`);
        i = 0;
        while (i < lElButton.length) {
          lElButton[i].addEventListener('click', sectionButtonClicked, true);
          ++i;
        }
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
    var lElItem     = document.createDocumentFragment();
    var i           = 0;

    return new Promise(resolve => {
      lElInput    = pEvent.querySelectorAll("input");
      lElTextarea = pEvent.querySelectorAll("textarea");
      lElSelect   = pEvent.querySelectorAll("select");

      i = 0;
      while (i < lElInput.length) {
        lElItem = lElInput[i];
        lElItem.addEventListener('keyup', updateOptionValueToStorage, true);
        lElItem.addEventListener('change', updateOptionValueToStorage, true);
        ++i;
      }

      i = 0;
      while (i < lElTextarea.length) {
        lElItem = lElTextarea[i];
        lElItem.addEventListener('keyup', updateOptionValueToStorage, true);
        ++i;
      }

      i = 0;
      while (i < lElSelect.length) {
        lElItem = lElSelect[i];
        lElItem.addEventListener('change', updateOptionValueToStorage, true);
        ++i;
      }
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
      var lElButtons = pEvent.querySelectorAll('button');
      var i = 0;
      while (i < lElButtons.length) {
        lElButtons[i].addEventListener('click', buttonClicked, true);
        ++i;
      }

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
