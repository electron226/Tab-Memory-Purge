(function(window, document) {
  'use strict';

  //{{{ variables
  var defaultMenu = "normal";

  var db = null; // indexedDB

  var classNameOfCopyButton  = 'copy';
  var classNameOfApplyButton = 'apply';

  var keybindClassNameOfSetButton   = 'keybind_set';
  var keybindClassNameOfClearButton = 'keybind_clear';
  var selectorKeybindOption         = '.keyOption';
  var selectorShowingKeybind        = '.pressKey';
  var selectorKeybindValue          = '.keybindValue';

  var menuSelector           = '.sectionMenu';
  var buttonSelector         = '.sectionButton';
  var sectionButtonClassName = buttonSelector.substring(1);

  var classNameWhenSelect     = 'select';
  var elementDoesNotClassName = 'doNotShow';
  var styleDisplayNone        = 'display: none;';
  var deleteIconPath          = 'img/icons/close.svg';

  var classNameOfHistoryItem    = 'historyItem';
  var classNameOfHistoryDate    = 'historyDate';
  var selectorHistoryItemDelete = '.itemDelete';
  var selectorHistoryItemIcon   = '.itemIcon';
  var selectorHistoryItemUrl    = '.itemUrl';
  var selectorHistoryItemDate   = '.itemDate';
  var selectorHistoryItemTitle  = '.itemTitle';
  var selectorHistoryItemList   = '.itemList';
  var attrNameOfDatabase        = 'database';
  var attrNameOfItemId          = 'historyItemId';

  var optionsForCreateHistoryDate = {
    className:          classNameOfHistoryDate,
    itemDelete:         selectorHistoryItemDelete.slice(1),
    itemDate:           selectorHistoryItemDate.slice(1),
    itemList:           selectorHistoryItemList.slice(1),
  };
  var optionsForCreateHistoryItem = {
    attrNameOfDatabase: attrNameOfDatabase,
    className:          classNameOfHistoryItem,
    itemDelete:         selectorHistoryItemDelete.slice(1),
    itemDate:           selectorHistoryItemDate.slice(1),
    itemUrl:            selectorHistoryItemUrl.slice(1),
    itemIcon:           selectorHistoryItemIcon.slice(1),
    itemTitle:          selectorHistoryItemTitle.slice(1),
  };

  var selectorOfLocationWhereAddHistoryDate = '#historyList';
  var searchHistoryDate     = document.querySelector('#searchHistoryDate');
  var searchHistoryItem     = document.querySelector('#searchHistoryItem');
  var searchHistoryDateList = document.querySelector('#historyDateList');

  var eChangeHistoryField = document.querySelector('#change_history div');

  var dateListNav = document.querySelector('#dateListNav');
  var sessionNotFound = document.querySelector('#sessionNotFound');
  var savedSessionDateTitleText =
    document.querySelector('#savedSessionDateTitle');
  var addSavedSessionDateListIdName = 'savedSessionDateList';
  var addSavedSessionDateListLocation =
    document.querySelector(`#${addSavedSessionDateListIdName}`);
  var idNameOfSessionDateList = 'sessionDateList';
  var addSessionDateListLocation =
    document.querySelector(`#${idNameOfSessionDateList}`);
  var addSessionListLocation     = document.querySelector('#sessionList');
  var selectorDateList            = '#dateList';
  var sessionTitle                = document.querySelector('#sessionTitle');
  var sessionSave                 = document.querySelector('#sessionSave');
  var sessionDelete               = document.querySelector('#sessionDelete');
  var sessionRestore              = document.querySelector('#sessionRestore');

  var exportLocation = document.querySelector('#export');
  var importLocation = document.querySelector('#import');

  var excludeKeyNames = new Set();
  excludeKeyNames.add(versionKey);
  excludeKeyNames.add(previousSessionTimeKey);
//}}}

  var OperateOptionValue = function() {//{{{
  };
  OperateOptionValue.prototype.get = function(d, name) {
    return this.call(d, name, null, 'get');
  };
  OperateOptionValue.prototype.set = function(d, name, value) {
    return this.call(d, name, value, 'set');
  };
  OperateOptionValue.prototype.__call = function(obj) {
    return new Promise((resolve, reject) => {
      var el        = obj.element;
      var value     = obj.value;
      var type      = obj.type;
      var property  = obj.property;
      var valueType = obj.valueType;

      var val = (type === 'get') ? el[property] : value;
      if (valueType === 'number') {
        val = parseInt(val, 10);
      }

      if (toType(val) !== valueType) {
        reject(new Error(`${val} is not ${valueType} type: ${toType(val)}`));
        return;
      }

      if (type === 'get') {
        resolve(val);
      } else {
        el[property] = (toType(val) === 'string') ? val.trim() : val;
        resolve();
      }
    });
  };
  OperateOptionValue.prototype.call = function(d, name, value, type) {
    var $this = this;
    return new Promise((resolve, reject) => {
      if (type === void 0 || type === null) {
        type = 'get';
      }

      var el = d.querySelector(
        `input[name="${name}"], textarea[name="${name}"]`);
      if (el) {
        try {
          var obj = {
            element:   el,
            value:     value,
            type:      type,
          };
          switch (el.type) {
          case 'checkbox':
            obj = Object.assign(obj, {
              property:  'checked',
              valueType: 'boolean',
            });
            break;
          case 'number':
          case 'text':
          case 'textarea':
            obj = Object.assign(obj, {
              property:  'value',
              valueType: (el.type === 'number') ? 'number' : 'string',
            });
            break;
          default:
            reject(new Error(
              `Doesn't write the code of each element type.` +
              ` name: ${name}, type: ${el.type}`));
            break;
          }

          $this.__call(obj).then(resolve).catch(reject);
          return;
        } catch (e) {
          reject(new Error(`(Value = ${value}) is not` +
                           ` ${el.type} type. name: ${name}`));
          return;
        }
      }
      if (!excludeKeyNames.has(name)) {
        console.warn("Doesn't find the elememt name.", name);
      }
      resolve();
    });
  };
  OperateOptionValue.prototype.init = function(d) {
    return this.load(d, defaultValues);
  };
  OperateOptionValue.prototype.load = function(d, loadOptions) {
    var $this = this;

    return new Promise((resolve, reject) => {
      $this.export()
      .then(options => {
        switch (toType(loadOptions)) {
        case 'map':
          options = loadOptions;
          break;
        case 'object':
          var newMap = new Map();
          for (var key in loadOptions) {
            if (loadOptions.hasOwnProperty(key)) {
              newMap.set(key, loadOptions[key]);
            }
          }
          options = newMap;
          break;
        }

        var p = [];
        var iter = options.entries();
        var i = iter.next();
        while (!i.done) {
          p.push( $this.set(d, i.value[0], i.value[1]) );
          i = iter.next();
        }

        Promise.all(p).then(resolve, reject);
      })
      .catch(reject);
    });
  };
  OperateOptionValue.prototype.export = function() {
    return new Promise(resolve => {
      chrome.storage.local.get(items => {
        var r = new Map();
        defaultValues.forEach((v, key) => {
          r.set(key, items.hasOwnProperty(key) ? items[key] : v);
        });
        resolve(r);
      });
    });
  };
  OperateOptionValue.prototype.import = function(d, importOptions) {
    var $this = this;
    return new Promise((resolve, reject) => {
      $this.load(d, importOptions)
      .then(() => resolve(importOptions))
      .catch(reject);
    });
  };
  //}}}

  var ShowMenuSelection = function(selectors, className_when_select) {//{{{
    ShowMenuSelection.toggleSectionRegex = /(display:\s*)(\w+);/i;

    this.menuSelector          = selectors.menu;
    this.buttonSelector        = selectors.button;
    this.className_when_select = className_when_select;
  };
  ShowMenuSelection.prototype.showMenu = function(selector) {
    return function(idName) {
      var showMenu = document.querySelector(selector + '#' + idName + '');
      var dontShowMenu =
        document.querySelectorAll(selector + ':not(#' + idName + ')');

      removeStringFromAttributeOfElement(showMenu, 'style', styleDisplayNone);
      var i = 0;
      while (i < dontShowMenu.length) {
        addStringToAttributeOfElement(
          dontShowMenu[i], 'style', styleDisplayNone);
        ++i;
      }
    };
  };
  ShowMenuSelection.prototype.changeSelectionButtonColor = function(selector) {
    var $this = this;

    return function(name) {
      var o = document.querySelector(
        selector + '.' + $this.className_when_select);
      if (o !== null) {
        removeStringFromAttributeOfElement(
          o, 'class', $this.className_when_select);
      }

      var n = document.querySelector(selector + '[name = "' + name + '"]');
      addStringToAttributeOfElement(n, 'class', $this.className_when_select);
    };
  };
  ShowMenuSelection.prototype.show = function(name) {
    var $this = this;

    return new Promise((resolve) => {
      var showMenuArea, selectMenuButton;

      showMenuArea     = $this.showMenu($this.menuSelector);
      selectMenuButton = $this.changeSelectionButtonColor($this.buttonSelector);

      showMenuArea(name);
      selectMenuButton(name);

      resolve(name);
    });
  };//}}}

  var KeyTrace = function(id) {//{{{
    this.id = id || null;
    this.result = null;
  };
  KeyTrace.prototype.start = function(id) {
    if (id === null || id === void 0) {
      throw new Error("Doesn't set the id of arguments.");
    }

    this.id = id;
  };
  KeyTrace.prototype.traceEvent = function(event) {
    if (this.id === null || this.id === void 0) {
      throw new Error("Doesn't set the id in this instance yet.");
    }

    this.result = { id: this.id, key: keyCheck(event) };
    this.stop();

    return this.result;
  };
  KeyTrace.prototype.stop = function() {
    this.id = null;
  };
  KeyTrace.prototype.clear = function() {
    this.id = null;
    this.result = null;
  };
  KeyTrace.prototype.isRun = function() {
    return this.id !== void 0 && this.id !== null;
  };
  KeyTrace.prototype.getResult = function() {
    return this.result;
  };//}}}

  function processAfterMenuSelection()//{{{
  {
    console.log('processAfterMenuSelection');

    return function(name) {
      return new Promise((resolve, reject) => {
        switch (name) {
        case 'normal':
          break;
        case 'keybind':
          showAllKeybindString();
          break;
        case 'information':
          break;
        case 'history':
          if (db.isOpened()) {
            showAllHistory().catch(e => console.error(e));
          } else {
            setTimeout(
              () => showAllHistory().catch(e => console.error(e)), 1000);
          }
          break;
        case 'session_history':
          if (db.isOpened()) {
            showAllSessionHistory()
            .then(selectCurrentSession)
            .catch(e => console.error(e));
          } else {
            setTimeout(() =>
              showAllSessionHistory()
              .then(selectCurrentSession)
              .catch(e => console.error(e)), 1000);
          }
          break;
        case 'change_history':
          showChangeHistory()
          .catch(e => console.error(e));
          break;
        case 'operate_settings':
          showOptionValuesToOperateSettingsPage()
          .catch(e => console.error(e));
          break;
        default:
          reject(new Error("The Invalid menu name."));
          return;
        }
        history.pushState(name,
          document.title + ' ' + chrome.i18n.getMessage(name),
          optionPage + '?page=' + name);
        resolve(name);
      });
    };
  }//}}}

  window.addEventListener('popstate', e => {//{{{
    if (e.state) {
      menuToggle.show(e.state || defaultMenu);
    }
  }, true);//}}}

  //{{{ A variable of a function of using closure.
  var operateOption = new OperateOptionValue();
  var keybindTrace  = new KeyTrace();
  var menuToggle    = new ShowMenuSelection(
    { menu: menuSelector, button: buttonSelector }, classNameWhenSelect);
  var afterMenuSelection = processAfterMenuSelection();
  //}}}

  function clearItemInElement(node)//{{{
  {
    while(node.firstChild) {
      node.removeChild(node.firstChild);
    }
    return node;
  }//}}}

  function deleteKeyItemFromObject(obj, deleteKeys)//{{{
  {
    if (toType(obj) !== 'object' || toType(deleteKeys) !== 'set') {
      throw new Error('Invalid arguments.');
    }

    var newObj = obj;
    var iter = deleteKeys.entries();
    var i = iter.next();
    while (!i.done) {
      delete newObj[ i.value[0] ];
      i = iter.next();
    }

    return newObj;
  }//}}}

  function showOptionValuesToOperateSettingsPage()//{{{
  {
    return new Promise(resolve => {
      operateOption.export()
      .then(options => {
        var obj = {};
        var iter = options.entries();
        var i = iter.next();
        while (!i.done) {
          obj[ i.value[0] ] = i.value[1];
          i = iter.next();
        }
        var newOptions = deleteKeyItemFromObject(obj, excludeKeyNames);
        exportLocation.value = JSON.stringify(newOptions, null, '    ');
        resolve();
      });
    });
  }//}}}

  function showChangeHistory()//{{{
  {
    return new Promise(resolve => {
      ajax({ url: changeHistory, responseType: 'text' })
      .then(result => {
        eChangeHistoryField.innerHTML = result.response;
        resolve();
      });
    });
  }//}}}

  function showAllKeybindString()//{{{
  {
    console.log('showAllKeybindString');

    var options = document.querySelectorAll(selectorKeybindOption);
    var keyJson, keyString;
    var i = 0;
    while (i < options.length) {
      keyJson   = options[i].querySelector(selectorKeybindValue);
      keyString = options[i].querySelector(selectorShowingKeybind);
      try {
        if (keyJson.value === '{}' ||
            keyJson.value === ''   ||
            keyJson.value === null ||
            keyJson.value === void 0) {
            ++i;
            continue;
        }

        keyString.value = generateKeyString(JSON.parse(keyJson.value));
      } catch (e) {
        console.warn(e, keyJson.value);
      }

      ++i;
    }
  }//}}}

  function setKeybindOption(className, keyInfo)//{{{
  {
    var option = document.querySelector(
      '.' + className + selectorKeybindOption);

    var keybindValue = option.querySelector(selectorKeybindValue);
    keybindValue.value = JSON.stringify(keyInfo);

    var showKeybindString = option.querySelector(selectorShowingKeybind);
    try {
      showKeybindString.value = generateKeyString(keyInfo);
    } catch (e) {
      showKeybindString.value = '';
    }
  }//}}}

  function keyupEvent(event)//{{{
  {
    if (keybindTrace.isRun()) {
      var info = keybindTrace.traceEvent(event);
      setKeybindOption(info.id, info.key);

      // save the keybind with using event to storage.
      var newEvent = document.createEvent('HTMLEvents');
      newEvent.initEvent('change', false, true);
      var traceTarget = document.querySelector(
        '*[name="' + info.id + '"]' + selectorKeybindValue);
      traceTarget.dispatchEvent(newEvent);
    }
  }//}}}

  function buttonClicked(event)//{{{
  {
    var t = event.target;

    // keybind only.
    var parentClassName = t.parentNode.getAttribute('class');
    var optionName;
    if (parentClassName) {
      optionName = parentClassName.replace(
        selectorKeybindOption.replace(/^./, ''), '').trim();
    }

    var el;
    var cName = t.getAttribute('class');
    switch (cName) {
    case keybindClassNameOfSetButton:
      if (keybindTrace.isRun()) {
        keybindTrace.stop();
      }
      keybindTrace.start(optionName);
      break;
    case keybindClassNameOfClearButton:
      setKeybindOption(optionName, {});

      // save the keybind with using event to storage.
      el = document.querySelector(
        '[name="' + optionName + '"]' + selectorKeybindValue);
      var newEvent = document.createEvent('HTMLEvents');
      newEvent.initEvent('change', false, true);
      el.dispatchEvent(newEvent);
      break;
    case classNameOfCopyButton:
      exportLocation.select();
      var result = document.execCommand('copy');
      var msg    = result ? 'successed' : 'failured';
      console.log('have copied the string of import area. it is ' + msg + '.');

      window.getSelection().removeAllRanges();
      break;
    case classNameOfApplyButton:
      var value;

      try {
        value = JSON.parse(importLocation.value.trim());
      } catch (e) {
        if (e instanceof SyntaxError) {
          var msg = "Invalid the json string. The value doesn't correct:\n" +
                    e.message;
          console.error(msg);
          alert(msg);
        } else {
          console.error(e);
        }
        break;
      }

      value = deleteKeyItemFromObject(value, excludeKeyNames);
      operateOption.import(document, value)
      .then(writeOptions => {
        return new Promise(
          resolve => chrome.storage.local.set(writeOptions, resolve));
      })
      .then(showOptionValuesToOperateSettingsPage)
      .catch(e => console.error(e));
      break;
    }
  }//}}}

  function addAutocompleteDateList(element)//{{{
  {
    var autocompleteList = element;
    var optionElement = document.createElement('option');

    while (autocompleteList.firstChild) {
      autocompleteList.removeChild(autocompleteList.firstChild);
    }

    return function(date) {
      var option = optionElement.cloneNode(true);
      option.value = formatDate(date, 'YYYY-MM-DD');
      autocompleteList.appendChild(option);
    };
  }//}}}

  function getFormatEachLanguages(time, formatString)//{{{
  {
    if (time === void 0 || time === null) {
      throw new Error('Invalid arguments is time:' + time);
    }

    if (formatString === void 0 || formatString === null) {
      formatString = {
        'ja':      'YYYY/MM/DD hh:mm:ss',
        'default': 'MM/DD/YYYY hh:mm:ss',
      };
    }

    var formatType;
    var lang = chrome.i18n.getUILanguage();
    if (formatString.hasOwnProperty(lang)) {
      formatType = formatString[lang];
    } else {
      formatType = formatString['default'];
    }
    return formatDate(new Date(time), formatType);
  }//}}}

  function saveSession()//{{{
  {
    return new Promise((resolve, reject) => {
      var showList = addSessionListLocation.querySelectorAll(
        'section:not(.' + elementDoesNotClassName + ')');
      if (showList.length === 0) {
        resolve();
        return;
      }

      var a;
      var urls = [];
      var i = 0;
      while (i < showList.length) {
        a = showList[i].querySelector(selectorHistoryItemUrl);
        urls.push(a.href);
        ++i;
      }

      var time = Date.now();
      var newSessions = urls.reverse().map(v => {
        return { date: time, url: v };
      });

      db.put({
        name: dbSavedSessionName,
        data: newSessions,
      })
      .then(showAllSessionHistory)
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function deleteSession()//{{{
  {
    return new Promise((resolve, reject) => {
      var date = parseInt(sessionTitle.getAttribute('name'));
      var dbNames = [ dbSessionName, dbSavedSessionName ];

      var p = [];
      var i = 0;
      while (i < dbNames.length) {
        p.push(
          db.getCursor({
            name: dbNames[i],
            range: IDBKeyRange.only(date),
            indexName: 'date',
          })
        );
        ++i;
      }

      Promise.all(p)
      .then(results => {
        var sessions = [];
        i = 0;
        while (i < results.length) {
          sessions = sessions.concat(results[i]);
          ++i;
        }
        var delKeys = sessions.map(v => v.id);

        var p2 = [];
        i = 0;
        while (i < dbNames.length) {
          p2.push(
            db.delete({
              name: dbNames[i],
              keys: delKeys,
            })
          );
          ++i;
        }

        return Promise.all(p2);
      })
      .then(showAllSessionHistory)
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function restoreSession()//{{{
  {
    var showList = addSessionListLocation.querySelectorAll(
      'section:not(.' + elementDoesNotClassName + ')');
    if (showList.length === 0) {
      return;
    }

    var a;
    var restore = [];
    var i = 0;
    while (i < showList.length) {
      a = showList[i].querySelector(selectorHistoryItemUrl);
      restore.push({ url: a.href });
      ++i;
    }

    chrome.runtime.sendMessage({ event: 'restore', session: restore });
  }//}}}

  function closureCreateSessionDateList(obj)//{{{
  {
    var databaseName = obj.databaseName;
    var dateList     = obj.dateList;
    var itemList     = obj.itemList;
    var currentTime  = obj.currentTime;
    if (dateList === void 0 || dateList === null) {
        throw new Error("dateList isn't found in arguments");
    }
    if (itemList === void 0 || itemList === null) {
        throw new Error("itemList isn't found in arguments");
    }
    if (currentTime !== void 0 && currentTime !== null &&
        toType(currentTime) !== 'number') {
      throw new Error('currentTime in arguments is not number.');
    }

    function getDictSplitEachSessionDate(sessions)//{{{
    {
      var data;
      var ret = {};
      var i = 0;
      while (i < sessions.length) {
        data = sessions[i];
        if (!ret.hasOwnProperty(data.date)) {
          ret[data.date] = [];
        }
        ret[data.date].push(data);
        ++i;
      }
      return ret;
    }//}}}

    function onClicked(event)//{{{
    {
      var name = event.target.getAttribute('name');

      // select which is showed a list of a session date.
      var showLists = itemList.querySelectorAll('section[name="' + name + '"]');
      var i = 0;
      while (i < showLists.length) {
        removeStringFromAttributeOfElement(
          showLists[i], 'class', elementDoesNotClassName);
        ++i;
      }

      var notShowLists =
        itemList.querySelectorAll('section:not([name="' + name + '"])');
      i = 0;
      while (i < notShowLists.length) {
        addStringToAttributeOfElement(
          notShowLists[i], 'class', elementDoesNotClassName);
        ++i;
      }

      // If clicking date is saved sesssion, add button is not show.
      var list = event.target.parentNode;
      var listName = list.getAttribute('id');
      if (listName === addSavedSessionDateListIdName) {
        addStringToAttributeOfElement(
          sessionSave, 'class', elementDoesNotClassName);
      } else {
        removeStringFromAttributeOfElement(
          sessionSave, 'class', elementDoesNotClassName);
      }

      // a button of session date is changed by state.
      var dateList = document.querySelector(selectorDateList);
      var selectDates = dateList.querySelector('[name="' + name + '"]');
      addStringToAttributeOfElement(selectDates, 'class', classNameWhenSelect);

      sessionTitle.setAttribute('name', name);
      sessionTitle.textContent = selectDates.textContent;

      var notSelectDates =
        dateList.querySelectorAll(':not([name="' + name + '"])');
      i = 0;
      while (i < notSelectDates.length) {
        removeStringFromAttributeOfElement(
          notSelectDates[i], 'class', classNameWhenSelect);
        ++i;
      }
    }//}}}

    function closureCreateSessionDate()//{{{
    {
      var df = document.createDocumentFragment();
      var div = document.createElement('div');

      return {
        add: function(time) {
          var l = div.cloneNode(true);
          var text;
          if (currentTime !== void 0 && currentTime !== undefined &&
              parseInt(currentTime) === parseInt(time)) {
            text = 'Current Session';
          } else {
            text = getFormatEachLanguages(time);
          }

          l.setAttribute('name', time);
          l.textContent = text;
          l.addEventListener('click', onClicked, true);
          df.appendChild(l);
        },
        get: function() {
          return Array.prototype.slice.call(df.childNodes);
        },
        clear: function() {
          div = document.createElement('div');
        },
      };
    }//}}}

    var createSessionDate = closureCreateSessionDate();

    function createSessionDateListItem(items)//{{{
    {
      var cHI = closureCreateHistoryItem(
        Object.assign(optionsForCreateHistoryItem, {
          databaseName: databaseName,
        })
      );
      var opts = {
        date: false,
      };

      var item;
      var list = [];
      var i = 0;
      while (i < items.length) {
        item = cHI(items[i], opts);
        addStringToAttributeOfElement(item, 'class', elementDoesNotClassName);
        list.push(item);
        ++i;
      }

      return list;
    }//}}}

    function addItemToElement(element, list)//{{{
    {
      var i = 0;
      while (i < list.length) {
        element.appendChild(list[i]);
        i++;
      }
    }//}}}

    function createSessionDateList(sessions)//{{{
    {
      var i, s, key;
      var list = [];
      var items;

      createSessionDate.clear();
      i = 0;
      while (i < sessions.length) {
        s = getDictSplitEachSessionDate(sessions[i].data);

        for (key in s) {
          if (s.hasOwnProperty(key)) {
            createSessionDate.add(parseInt(key));
            items = createSessionDateListItem(s[parseInt(key)]).reverse();
            list = list.concat(items);
          }
        }
        ++i;
      }

      addItemToElement(dateList, createSessionDate.get());
      addItemToElement(itemList, list);
    }//}}}

    return createSessionDateList;
  }//}}}

  function selectCurrentSession()//{{{
  {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(items => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError));
          return;
        }

        var currentSessionTime = items[previousSessionTimeKey];
        if (currentSessionTime === void 0 || currentSessionTime === null) {
          resolve();
          return;
        }

        var currentSessionItem = addSessionDateListLocation.querySelector(
          `[name="${currentSessionTime}"]`);
        if (currentSessionItem) {
          currentSessionItem.click();
        }
      });
    });
  }//}}}

  function showAllSessionHistory()//{{{
  {
    return new Promise((resolve, reject) => {
      sessionSave.addEventListener('click', saveSession, true);
      sessionDelete.addEventListener('click', deleteSession, true);
      sessionRestore.addEventListener('click', restoreSession, true);

      getAllSessionHistory()
      .then(results => {
        var savedSessions = results[0];
        var sessions      = results[1];

        clearItemInElement(addSavedSessionDateListLocation);
        clearItemInElement(addSessionDateListLocation);
        clearItemInElement(addSessionListLocation);

        if (savedSessions.length === 0) {
          addStringToAttributeOfElement(
            savedSessionDateTitleText, 'class', elementDoesNotClassName);
        } else {
          removeStringFromAttributeOfElement(
            savedSessionDateTitleText, 'class', elementDoesNotClassName);

          var cSSDL = closureCreateSessionDateList({
            databaseName: dbSavedSessionName,
            dateList:     addSavedSessionDateListLocation,
            itemList:     addSessionListLocation,
          });
          cSSDL(savedSessions);
        }

        //{{{
        chrome.storage.local.get(previousSessionTimeKey, items => {
          var currentTime = items[previousSessionTimeKey];

          // new
          var cSDL = closureCreateSessionDateList({
            databaseName: dbSessionName,
            dateList:     addSessionDateListLocation,
            itemList:     addSessionListLocation,
            currentTime:  currentTime,
          });
          cSDL(sessions);

          if (savedSessions.length > 0 || sessions.length > 0) {
            addStringToAttributeOfElement(
              sessionNotFound, 'class', elementDoesNotClassName);
            removeStringFromAttributeOfElement(
              dateListNav, 'style', styleDisplayNone);
          } else {
            removeStringFromAttributeOfElement(
              sessionNotFound, 'class', elementDoesNotClassName);
            addStringToAttributeOfElement(
              dateListNav, 'style', styleDisplayNone);
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

      var p = [];
      p.push( db.getAll({ name: dbSavedSessionName }) );
      p.push( db.getAll({ name: dbSessionName }) );
      p.push( db.getAll({ name: dbPageInfoName }) );
      p.push( db.getAll({ name: dbDataURIName }) );

      Promise.all(p)
      .then(results => {
        var savedSessions = results[0];
        var sessions      = results[1];
        var pageInfos     = results[2];
        var dataURIs      = results[3];

        var p = [];
        p.push(
          getListAfterJoinHistoryDataOnDB([savedSessions, pageInfos, dataURIs])
        );
        p.push(
          getListAfterJoinHistoryDataOnDB([sessions, pageInfos, dataURIs])
        );

        return Promise.all(p);
      })
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function showAutoCompleteDateList(histories)//{{{
  {
    var autocompleteDateList = addAutocompleteDateList(searchHistoryDateList);
    var i = 0;
    while (i < histories.length) {
      autocompleteDateList(histories[i].date);
      ++i;
    }
  }//}}}

  function closureCreateHistoryDate(obj)//{{{
  {
    //{{{ local variables.
    obj = obj || {};
    var classNameOfHistoryDateItem = obj.className || 'historyDate';
    var classNameOfDeleteBtn       = obj.itemDelete || 'itemDelete';
    var classNameOfHistoryDate     = obj.itemDate || 'itemDate'; // DateTitle
    var classNameToAddHistoryItemLocation = obj.itemList || 'itemList';
    //}}}

    function createPrototype()//{{{
    {
      var fieldset = document.createElement('fieldset');
      addStringToAttributeOfElement(
        fieldset, 'class', classNameOfHistoryDateItem);
      addStringToAttributeOfElement(fieldset, 'class', 'historyField');

      var legend = document.createElement('legend');
      var span = document.createElement('span');
      addStringToAttributeOfElement(span, 'class', classNameOfHistoryDate);
      var img = document.createElement('img');
      addStringToAttributeOfElement(img, 'src', deleteIconPath);
      addStringToAttributeOfElement(img, 'alt', 'Delete button');
      addStringToAttributeOfElement(img, 'class', classNameOfDeleteBtn);
      addStringToAttributeOfElement(img, 'class', 'icon16_rev');
      legend.appendChild(span);
      legend.appendChild(img);
      fieldset.appendChild(legend);

      var article = document.createElement('article');
      addStringToAttributeOfElement(
        article, 'class', classNameToAddHistoryItemLocation);
      addStringToAttributeOfElement(article, 'class', 'ellipsis_over');
      fieldset.appendChild(article);

      return fieldset;
    }//}}}

    var proto = createPrototype();

    function createHistoryDate(addItem, showOptions)//{{{
    {
      if (!addItem.hasOwnProperty('date')) {
        throw new Error("the property of 'date' is not found.");
      }
      var opts = { // default.
        deleteButton: true,
        date:         true,
        title:        true,
      };
      if (showOptions !== void 0 && showOptions !== null) {
        Object.keys(showOptions).forEach(v => opts[v] = showOptions[v]);
      }

      var time = addItem.date.getTime();
      var historyDate = proto.cloneNode(true);
      addStringToAttributeOfElement(historyDate, 'name', time);

      if (opts.deleteButton) {
        var del = historyDate.querySelector(`.${classNameOfDeleteBtn}`);
        addStringToAttributeOfElement(del, 'name', time);
        del.addEventListener('click', removeHistoryDate, true);
      }

      if (opts.title || opts.date) {
        var dateTitle = historyDate.querySelector(`.${classNameOfHistoryDate}`);
        dateTitle.textContent = getFormatEachLanguages(addItem.date, {
          'ja':      'YYYY/MM/DD',
          'default': 'MM/DD/YYYY',
        });
      }

      return historyDate;
    }//}}}

    return createHistoryDate;
  }//}}}

  function closureCreateHistoryItem(obj)//{{{
  {
    if (obj === void 0 || obj === null || !obj.hasOwnProperty('databaseName')) {
      throw new Error("invalid arguments.");
    }

    //{{{ local variable
    var databaseName           = obj.databaseName;
    var attrNameOfDatabase     = obj.attrNameOfDatabase || 'database';
    var classNameOfHistoryItem = obj.className || 'historyItem';
    var classNameOfDeleteBtn   = obj.itemDelete || 'itemDelete';
    var classNameOfPageIcon    = obj.itemIcon || 'itemIcon';
    var classNameOfTitle       = obj.itemTitle || 'itemTitle';
    var classNameOfDate        = obj.itemDate || 'itemDate';
    var classNameOfLink        = obj.itemUrl || 'itemUrl';
    var attrNameOfItemId       = obj.attrNameOfItemId || 'historyItemId';
    //}}}
    //
    function createPrototype() {//{{{
      var section = document.createElement('section');
      addStringToAttributeOfElement(section, 'class', classNameOfHistoryItem);
      addStringToAttributeOfElement(section, 'class', 'ellipsis');
      addStringToAttributeOfElement(section, attrNameOfDatabase, databaseName);

      var img     = document.createElement('img');
      addStringToAttributeOfElement(img, 'class', 'icon16_rev');

      var deleteIcon  = img.cloneNode(true);
      addStringToAttributeOfElement(deleteIcon, 'src', deleteIconPath);
      addStringToAttributeOfElement(deleteIcon, 'alt', 'Delete button');
      addStringToAttributeOfElement(deleteIcon, 'class', classNameOfDeleteBtn);

      var pageIcon = img.cloneNode(true);
      addStringToAttributeOfElement(pageIcon, 'alt', 'page icon');
      addStringToAttributeOfElement(pageIcon, 'class', classNameOfPageIcon);

      var span  = document.createElement('span');
      var title = span.cloneNode(true);
      addStringToAttributeOfElement(title, 'class', classNameOfTitle);
      var date = span.cloneNode(true);
      addStringToAttributeOfElement(date, 'class', classNameOfDate);

      var a = document.createElement('a');
      addStringToAttributeOfElement(a, 'target', '_blank');
      addStringToAttributeOfElement(a, 'class', classNameOfLink);

      a.appendChild(pageIcon);
      a.appendChild(title);

      section.appendChild(deleteIcon);
      section.appendChild(date);
      section.appendChild(a);

      return section;
    }//}}}

    var proto = createPrototype();

    function createHistoryItem(addItem, showOptions) {//{{{
      if (!addItem.hasOwnProperty('date')) {
        throw new Error("the property of 'date' is not found.");
      }
      var opts = { // default.
        deleteButton: true,
        date:         true,
        link:         true,
        title:        true,
        icon:         true,
      };
      if (showOptions !== void 0 && showOptions !== null) {
        Object.keys(showOptions).forEach(v => opts[v] = showOptions[v]);
      }

      var item = proto.cloneNode(true);
      item.setAttribute('name', addItem.date);

      if (opts.deleteButton) {
        var del = item.querySelector(`.${classNameOfDeleteBtn}`);
        del.setAttribute('name', addItem.date);
        del.setAttribute(attrNameOfDatabase, databaseName);
        del.addEventListener('click', removeHistoryItem, true);
        if (addItem.hasOwnProperty('id')) {
          del.setAttribute(attrNameOfItemId, addItem.id);
        }
      }

      if (opts.date !== false) {
        var date = item.querySelector(`.${classNameOfDate}`);
        date.textContent = formatDate(new Date(addItem.date), 'hh:mm:ss');
      }

      if (addItem.hasOwnProperty('url') && opts.link) {
        var link = item.querySelector(`.${classNameOfLink}`);
        link.setAttribute('href', addItem.url);
      }

      if (addItem.hasOwnProperty('dataURI') && opts.icon) {
        var icon = item.querySelector(`.${classNameOfPageIcon}`);
        icon.setAttribute('src', addItem.dataURI);
      }

      if (addItem.hasOwnProperty('title') && opts.title) {
        var title = item.querySelector(`.${classNameOfTitle}`);
        title.textContent = addItem.title;
      }

      return item;
    }//}}}

    return createHistoryItem;
  }//}}}

  function showAllHistory()//{{{
  {
    return new Promise((resolve, reject) => {
      getAllHistory()
      .then(historyArray => {
        historyArray = historyArray.reverse();

        showAutoCompleteDateList(historyArray);

        var historyDateList =
          document.querySelector(selectorOfLocationWhereAddHistoryDate);
        clearItemInElement(historyDateList);

        var createHistoryDate =
          closureCreateHistoryDate(optionsForCreateHistoryDate);
        var createHistoryItem =
          closureCreateHistoryItem(
            Object.assign(optionsForCreateHistoryItem,
              { databaseName: dbHistoryName }));

        var hDate, historyItemList, list;
        var data, i, j, z;
        i = 0;
        while (i < historyArray.length) {
          data = historyArray[i];
          hDate = createHistoryDate(data);

          list = [];
          j = 0;
          while (j < data.data.length) {
            list.push( createHistoryItem(data.data[j]) );
            j++;
          }
          list = list.reverse();

          historyItemList = hDate.querySelector(selectorHistoryItemList);
          z = 0;
          while (z < list.length) {
            historyItemList.appendChild(list[z]);
            ++z;
          }

          historyDateList.appendChild(hDate);

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

      getHistoryListFromIndexedDB(db, dbHistoryName)
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function removeHistoryDate(event)//{{{
  {
    return new Promise((resolve, reject) => {
      var date = new Date(parseInt(event.target.getAttribute('name'), 10));
      var begin = new Date(
        date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
      var end = new Date(
        date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
      db.getCursor({
        name: dbHistoryName,
        range: IDBKeyRange.bound(begin.getTime(), end.getTime()),
      })
      .then(histories => {
        var delKeys = histories.map(v => v.date);
        return db.delete({
          name: dbHistoryName,
          keys: delKeys,
        });
      })
      .then(ret => {
        return new Promise(resolve => {
          var historyDateLegend = event.target.parentNode;
          var historyDateField  = historyDateLegend.parentNode;
          var historyList       = historyDateField.parentNode;
          historyList.removeChild(historyDateField);

          resolve(ret);
        });
      })
      .then(getAllHistory)
      .then(showAutoCompleteDateList)
      .then(resolve)
      .catch(e => {
        console.error(e);
        reject(e);
      });
    });
  }//}}}

  function removeHistoryItem(event)//{{{
  {
    // indexedDB name.
    var dbName = event.target.getAttribute(attrNameOfDatabase);
    // session item only.
    var itemId = parseInt(event.target.getAttribute(attrNameOfItemId), 10);
    // this value is new Date().getTime().
    var time = parseInt(event.target.getAttribute('name'), 10);

    return new Promise((resolve, reject) => {
      db.delete({
        name: dbName,
        keys: itemId ? itemId : time,
      })
      .then(ret => {
        return new Promise(resolve => {
          var historyItem     = event.target.parentNode;
          var historyItemList = historyItem.parentNode;
          historyItemList.removeChild(historyItem);

          resolve(ret);
        });
      })
      .then(resolve)
      .catch(e => {
        console.error(e);
        reject(e);
      });
    });
  }//}}}

  function showSpecificHistoryDateAndItem()//{{{
  {
    var field, date, historyItems, item, itemTitle, itemUrl;
    var i, j, count;

    var shdv       = searchHistoryDate.value;
    var shdvLen    = shdv.length;
    var searchTime;
    if (shdvLen > 0) {
      var matches    = shdv.match(/(\d+)-(\d+)-(\d+)/);
      var searchDate = new Date(matches[1], matches[2] - 1, matches[3]);
      searchTime = searchDate.getTime();
    }

    var shiv      = searchHistoryItem.value.trim();
    var shivLen   = shiv.length;
    var regexItem = new RegExp(shiv, 'ig');

    var dateList = document.querySelectorAll(`.${classNameOfHistoryDate}`);
    i = 0;
    while (i < dateList.length) {
      field = dateList[i];
      date = new Date(parseInt(field.name));

      if (shdvLen === 0 || date.getTime() === searchTime) {
        removeStringFromAttributeOfElement(
          field, 'class', elementDoesNotClassName);
      } else {
        addStringToAttributeOfElement(field, 'class', elementDoesNotClassName);
        ++i;
        continue;
      }

      historyItems = field.querySelectorAll(`.${classNameOfHistoryItem}`);
      count = 0;
      j     = 0;
      while (j < historyItems.length) {
        item = historyItems[j];

        itemTitle = item.querySelector(selectorHistoryItemTitle);
        itemUrl   = item.querySelector(selectorHistoryItemUrl);
        if (shivLen === 0 ||
            regexItem.test(itemTitle.textContent) ||
            regexItem.test(itemUrl.href)) {
          removeStringFromAttributeOfElement(
            item, 'class', elementDoesNotClassName);
        } else {
          addStringToAttributeOfElement(
            item, 'class', elementDoesNotClassName);
          ++count;
        }
        ++j;
      }

      if (count === historyItems.length) {
        addStringToAttributeOfElement(field, 'class', elementDoesNotClassName);
      } else {
        removeStringFromAttributeOfElement(
          field, 'class', elementDoesNotClassName);
      }

      ++i;
    }
  }//}}}

  function changeMenu(name)//{{{
  {
    return new Promise((resolve, reject) => {
      menuToggle.show(name)
      .then(afterMenuSelection)
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function sectionButtonClicked(event)//{{{
  {
    var t = event.target;
    if (t.getAttribute('class') !== sectionButtonClassName) {
      return;
    }

    changeMenu(t.getAttribute('name'));
  }//}}}

  function applyNewOptionToExtensionProcess()//{{{
  {
    return new Promise(resolve => {
      console.log("apply new option to this extension's process.");
      chrome.runtime.sendMessage({ event: 'reload_option_value' });
      resolve();
    });
  }//}}}

  function updateOptionValueToStorage(e)//{{{
  {
    var name = e.target.name;
    if (name === void 0 || name === null || name.length === 0) {
      return;
    }

    var writeObj = {};
    operateOption.get(document, name)
    .then(item => {
      return new Promise(resolve => {
        writeObj[name] = item;
        chrome.storage.local.set(writeObj, () => {
          console.log(
            'have wrote the data. name: ' + name + ', value: ' + item);
          resolve();
        });
      });
    })
    .then(applyNewOptionToExtensionProcess)
    .catch(mes => console.error(mes));
  }//}}}

  function initHistoryEvent()//{{{
  {
    return new Promise(resolve => {
      searchHistoryDate.addEventListener(
        'change', showSpecificHistoryDateAndItem, true);
      searchHistoryItem.addEventListener(
        'keyup', showSpecificHistoryDateAndItem, true);
      resolve();
    });
  }//}}}

  function initSectionBarEvent(d)//{{{
  {
    return new Promise((resolve, reject) => {
      try {
        var e = d.querySelectorAll(buttonSelector);
        var i = 0;
        while (i < e.length) {
          e[i].addEventListener('click', sectionButtonClicked, true);
          ++i;
        }
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }//}}}

  function initOptionElementEvent(d)//{{{
  {
    return new Promise(resolve => {
      var i, els;

      els = d.querySelectorAll("input");
      i = 0;
      while (i < els.length) {
        els[i].addEventListener('keyup', updateOptionValueToStorage, true);
        els[i].addEventListener('change', updateOptionValueToStorage, true);
        ++i;
      }

      els = d.querySelectorAll("textarea");
      i = 0;
      while (i < els.length) {
        els[i].addEventListener('keyup', updateOptionValueToStorage, true);
        ++i;
      }
      resolve();
    });
  }//}}}

  function initKeybindEvent(d)//{{{
  {
    return new Promise(resolve => {
      d.addEventListener('keyup', keyupEvent, true);
      resolve();
    });
  }//}}}

  function initButtonEvent(d)//{{{
  {
    return new Promise(resolve => {
      var els = d.querySelectorAll('button');
      var i = 0;
      while (i < els.length) {
        els[i].addEventListener('click', buttonClicked, true);
        ++i;
      }
      resolve();
    });
  }//}}}

  document.addEventListener('DOMContentLoaded', () => {//{{{
    (() => {
      return new Promise(resolve => {
        db = new Database(dbName, dbVersion);
        db.open(dbCreateStores);
        resolve();
      });
    }())
    .then(() => {
      var args = getQueryString(document);
      var menu = (args === void 0 ||
                  args === null ||
                  !args.hasOwnProperty('page')) ? defaultMenu : args.page;
      return changeMenu(menu);
    })
    .then(initSectionBarEvent(document))
    .then(loadTranslation(document, translationPath))
    .then(operateOption.load(document))
    .then(showAllKeybindString)
    .then(initOptionElementEvent(document))
    .then(initButtonEvent(document))
    .then(initKeybindEvent(document))
    .then(initHistoryEvent(document))
    .catch(e => console.error(e));
  }, true);//}}}
}(this, this.document));
