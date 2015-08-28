(function(window, document) {
  'use strict';

  var OperateOptionValue = function() {//{{{
  };
  OperateOptionValue.prototype.get = function(d, name) {
    return this.call(d, name, null, 'get');
  };
  OperateOptionValue.prototype.set = function(d, name, value) {
    return this.call(d, name, value, 'set');
  };
  OperateOptionValue.prototype.call = function(d, name, value, type) {
    return new Promise(function(resolve, reject) {
      if (type === void 0 || type === null) {
        type = 'get';
      }

      var el = d.querySelector(
        "input[name='" + name + "'], textarea[name='" + name + "']");
      if (el) {
        try {
          switch (el.type) {
          case 'number':
            if (type === 'get') {
              resolve(parseInt(el.value));
            } else {
              if (toType(value) !== 'number') { throw new Error(); }

              el.value = value;
              resolve();
            }
            break;
          case 'checkbox':
            if (type === 'get') {
              if (toType(el.checked) !== 'boolean') { throw new Error(); }

              resolve(el.checked);
            } else {
              if (toType(value) !== 'boolean') { throw new Error(); }

              el.checked = value;
              resolve();
            }
            break;
          case 'text':
          case 'textarea':
            if (type === 'get') {
              if (toType(el.value) !== 'string') { throw new Error(); }

              resolve(el.value);
            } else {
              if (toType(value) !== 'string') { throw new Error(); }

              el.value = trim(value);
              resolve();
            }
            break;
          default:
            reject(new Error("Doesn't write the code of each element type." +
              "name: [ " + name + " ], type : [ " + el.type + " ]"));
            break;
          }
          return;
        } catch (e) {
          reject(new Error("Value [ " + value + " ] is not [ " +
                 el.type + " ] type. name: " + name));
          return;
        }
      }
      warn("Doesn't find the elememt name: " + name);
      resolve();
    });
  };
  OperateOptionValue.prototype.init = function(d) {
    return this.load(d, defaultValues);
  };
  OperateOptionValue.prototype.load = function(d, loadOptions) {
    var $this = this;

    return new Promise(function(resolve, reject) {
      $this.export()
      .then(function(options) {
        if (toType(loadOptions) === 'object' && loadOptions) {
          options = loadOptions;
        }

        var p = [];
        for (var key in options) {
          if (options.hasOwnProperty(key)) {
            p.push($this.set(d, key, options[key]));
          }
        }

        Promise.all(p).then(resolve, reject);
      })
      .catch(reject);
    });
  };
  OperateOptionValue.prototype.export = function() {
    return new Promise(function(resolve) {
      chrome.storage.local.get(function(items) {
        var r = {};
        for (var key in defaultValues) {
          if (defaultValues.hasOwnProperty(key)) {
            r[key] = items.hasOwnProperty(key) ?
                     items[key] : defaultValues[key];
          }
        }
        resolve(r);
      });
    });
  };
  OperateOptionValue.prototype.import = function(d, importOptions) {
    var $this = this;
    return new Promise(function(resolve, reject) {
      $this.load(d, importOptions)
      .then(function() {
        resolve(importOptions);
      })
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
      var oldStyle, newStyle;
      var showMenu = document.querySelector(selector + '#' + idName + '');

      var el    = showMenu;
      var style = el.getAttribute('style');
      if (style === null) {
        el.setAttribute('style', 'display: block;');
      } else {
        oldStyle = style.replace(ShowMenuSelection.toggleSectionRegex, '');
        newStyle = 'display: block;';
        el.setAttribute('style', oldStyle + newStyle);
      }

      var dontShowMenu =
        document.querySelectorAll(selector + ':not(#' + idName + ')');
      for (var i = 0, len = dontShowMenu.length; i < len; i++) {
        el    = dontShowMenu[i];
        style = el.getAttribute('style');
        if (style === null) {
          el.setAttribute('style', 'display: none;');
          continue;
        }

        oldStyle = style.replace(ShowMenuSelection.toggleSectionRegex, '');
        newStyle = 'display: none;';
        el.setAttribute('style', oldStyle + newStyle);
      }
    };
  };
  ShowMenuSelection.prototype.changeSelectionButtonColor = function(selector) {
    var $this = this;

    return function(name) {
      var o = document.querySelector(
        selector + '.' + $this.className_when_select);
      if (o !== null) {
        o.setAttribute('class',
          o.getAttribute('class').replace(
            $this.className_when_select, '').trim() );
      }

      var n = document.querySelector(selector + '[name = "' + name + '"]');
      n.setAttribute('class',
        n.getAttribute('class') + ' ' + $this.className_when_select);
    };
  };
  ShowMenuSelection.prototype.show = function(name) {
    var $this = this;

    return new Promise(function(resolve) {
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

  // function WhenVersionUpOptionFix()//{{{
  // {
  //   return new Promise(function(resolve, reject) {
  //     chrome.storage.local.get(function(items) {
  //       if (chrome.runtime.lastError) {
  //         reject(chrome.runtime.lastError);
  //         return;
  //       }

  //       var writeObject = {};
  //       var keybind = items.keybind;
  //       if (keybind) {
  //         for (var key in keybind) {
  //           if (keybind.hasOwnProperty(key)) {
  //             writeObject['keybind_' + key] = keybind[key];
  //           }
  //         }
  //       }

  //       chrome.storage.local.set(writeObject, function() {
  //         if (chrome.runtime.lastError) {
  //           reject(chrome.runtime.lastError);
  //           return;
  //         }

  //         chrome.storage.local.remove('keybind', function() {
  //           if (chrome.runtime.lastError) {
  //             reject(chrome.runtime.lastError);
  //             return;
  //           }
  //           resolve();
  //         });
  //       });
  //     });
  //   });
  // }//}}}

  function processAfterMenuSelection()//{{{
  {
    log('processAfterMenuSelection');

    var keybindTick = null;

    return function(name) {
      return new Promise(function(resolve, reject) {
        if (keybindTick) {
          log('keybindTick is cleared.');
          clearInterval(keybindTick);
          keybindTick = null;
        }

        switch (name) {
        case 'normal':
          break;
        case 'keybind':
          keybindTick = setInterval(function() {
            showAllKeybindString();
          }, 1000);
          break;
        case 'information':
          break;
        case 'history':
          setTimeout(function() {
            showAllHistory()
            .catch(function(e) {
              error(e);
            });
          }, 1000);
          break;
        case 'session_history':
          setTimeout(function() {
            showAllSessionHistory()
            .catch(function(e) {
              error(e);
            });
          }, 1000);
          break;
        case 'change_history':
          break;
        case 'operate_settings':
          showOptionValuesToOperateSettingsPage()
          .catch(function(e) {
            error(e);
          });
          break;
        default:
          reject(new Error("The Invalid menu name."));
          return;
        }
        resolve(name);
      });
    };
  }//}}}

  //{{{ variables
  var defaultMenu = "normal";

  var db = null; // indexedDB

  var classNameOfCopyButton = 'copy';
  var classNameOfApplyButton = 'apply';

  var keybindClassNameOfSetButton   = 'keybind_set';
  var keybindClassNameOfClearButton = 'keybind_clear';
  var selectorKeybindOption         = '.keyOption';
  var selectorShowingKeybind        = '.pressKey';
  var selectorKeybindValue          = '.keybindValue';

  var menuSelector           = '.sectionMenu';
  var buttonSelector         = '.sectionButton';
  var sectionButtonClassName = buttonSelector.substring(1);

  var operateOption = new OperateOptionValue();
  var keybindTrace  = new KeyTrace();
  var menuToggle    = new ShowMenuSelection(
    { menu: menuSelector, button: buttonSelector }, 'select');
  var afterMenuSelection = processAfterMenuSelection();

  var elementDoesNotClassName = 'doNotShow';
  var prototypeClassName      = 'prototype';

  var selectorHistoryDate                       = '.historyDate';
  var selectorHistoryItem                       = '.historyItem';
  var selectorOfLocationWhereAddHistoryDateItem = '#history .historyList';
  var selectorOfLocationWhereAddItem            = '.historyItemList';
  var selectorDateTitle                         = '.historyDateTitle';
  var selectorDateDelete                        = '.historyDateDelete';
  var selectorHistoryItemDelete                 = '.historyItemDelete';
  var selectorHistoryItemDate                   = '.historyItemDate';
  var selectorHistoryItemHref                   = '.historyItemUrl';
  var selectorHistoryItemIcon                   = '.historyItemIcon';
  var selectorHistoryItemTitle                  = '.historyItemTitle';
  var selectorSearchHistoryDate                 = '#searchHistoryDate';
  var selectorSearchHistoryItem                 = '#searchHistoryItem';
  var selectorSearchHistoryDateList             = '#historyDateList';
  var prototypeSelectorOfHistoryDate =
    selectorHistoryDate + '.' + prototypeClassName;
  var prototypeSelectorOfHistoryItem =
    selectorHistoryItem + '.' + prototypeClassName;

  var selectorSessionHistorySection                = '#session_history';
  var selectorAddSavedSessionHistoryListLocation = '.savedSessionHistoryList';
  var selectorAddSessionHistoryListLocation      = '.sessionHistoryList';
  var selectorSavedSessionHistory                = '.savedSessionHistory';
  var selectorSessionHistory                     = '.sessionHistory';

  var selectorAddSavedSessionHistoryItemLocation =
      '.savedSessionHistoryItemList';
  var selectorAddSessionHistoryItemLocation = '.sessionHistoryItemList';

  // var selectorSessionHistoryItem            = '.sessionHistoryItem';

  // var selectorSavedSessionInfo              = '.savedSessionInfo';
  // var selectorSessionInfo                   = '.sessionInfo';
  // var selectorSavedSessionTitle             = '.savedSessionTitle';
  // var selectorSessionTitle                  = '.sessionTitle';
  var selectorSavedSessionDate              = '.savedSessionDate';
  var selectorSessionDate                   = '.sessionDate';
  var selectorSavedSessionDelete            = '.savedSessionDelete';
  var selectorSessionDelete                 = '.sessionDelete';
  var selectorSessionSave                   = '.sessionSave';
  // var selectorWindowNumber                  = '.windowNumber';

  // var selectorAddSessionItemLocation        = '.sessionItemList';
  var selectorSessionItem                   = '.sessionItem';
  var selectorSessionItemDelete             = '.sessionItemDelete';
  var selectorSessionItemUrl                = '.sessionItemUrl';
  var selectorSessionItemIcon               = '.sessionItemIcon';
  var selectorSessionItemTitle              = '.sessionItemTitle';

  var attrNameOfSessionItemId = 'sessionItemId';

  var prototypeSelectorOfSavedSessionHistory =
    selectorSavedSessionHistory + '.' + prototypeClassName;
  var prototypeSelectorOfSessionHistory =
    selectorSessionHistory + '.' + prototypeClassName;
  // var prototypeSelectorOfSessionHistoryItem =
  //   selectorSessionHistoryItem + '.' + prototypeClassName;
  var prototypeSelectorOfSessionItem =
    selectorSessionItem + '.' + prototypeClassName;

  var selectorExportLocation = '#export';
  var selectorImportLocation = '#import';

  var excludeKeyNames = [];
  excludeKeyNames.push(versionKey);
//}}}

  function deleteKeyItemFromObject(obj, deleteKeys)//{{{
  {
    if (toType(obj) !== 'object' || toType(deleteKeys) !== 'array') {
      throw new Error('Invalid arguments.');
    }

    var newObj = obj;
    for (var i = 0; i < deleteKeys.length; i = (i + 1) | 0) {
      delete newObj[ deleteKeys[i] ];
    }

    return newObj;
  }//}}}

  function showOptionValuesToOperateSettingsPage()//{{{
  {
    return new Promise(function(resolve) {
      operateOption.export()
      .then(function(options) {
        var newOptions = deleteKeyItemFromObject(options, excludeKeyNames);
        var e = document.querySelector(selectorExportLocation);
        e.value = JSON.stringify(newOptions, null, '    ');
        resolve();
      });
    });
  }//}}}

  function addStringToAttributeOfElement(element, attrName, addStr)//{{{
  {
    element.setAttribute(
      attrName, element.getAttribute(attrName) + ' ' + addStr);
  }//}}}

  function removeStringFromAttributeOfElement(//{{{
    element, attrName, removeStr, replaceStr)
  {
    var re = new RegExp('\\s*' + removeStr, 'ig');
    element.setAttribute(
      attrName, element.getAttribute(attrName).replace(re, replaceStr || ''));
  }//}}}

  function removeHistoryDate(event)//{{{
  {
    return new Promise(function(resolve, reject) {
      var date = new Date(parseInt(event.target.getAttribute('name'), 10));
      var begin = new Date(
        date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
      var end = new Date(
        date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
      db.getCursor({
        name: dbHistoryName,
        range: IDBKeyRange.bound(begin.getTime(), end.getTime()),
      })
      .then(function(histories) {
        var delKeys = histories.map(function(v) {
          return v.date;
        });
        return db.delete({
          name: dbHistoryName,
          keys: delKeys,
        });
      })
      .then(function(ret) {
        return new Promise(function(resolve) {
          var historyDateLegend = event.target.parentNode;
          var historyDateField  = historyDateLegend.parentNode;
          var historyList       = historyDateField.parentNode;
          historyList.removeChild(historyDateField);

          resolve(ret);
        });
      })
      .then(resolve)
      .catch(function(e) {
        error(e);
        reject(e);
      });
    });
  }//}}}

  function removeHistoryItem(event)//{{{
  {
    return new Promise(function(resolve, reject) {
      db.delete({
        name: dbHistoryName,
        keys: parseInt(event.target.getAttribute('name'), 10),
      })
      .then(function(ret) {
        return new Promise(function(resolve) {
          var historyItem     = event.target.parentNode;
          var historyItemList = historyItem.parentNode;
          historyItemList.removeChild(historyItem);

          resolve(ret);
        });
      })
      .then(resolve)
      .catch(function(e) {
        error(e);
        reject(e);
      });
    });
  }//}}}

  function getPrototypeAndRemoveTag(selector) {//{{{
    var proto = document.querySelector(selector).cloneNode(true);
    removeStringFromAttributeOfElement(proto, 'class', prototypeClassName);
    return proto;
  }//}}}

  function addAutocompleteDateList(selector)//{{{
  {
    var autocompleteList = document.querySelector(selector);
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

  function createHistoryDate(prototypeSelector)//{{{
  {
    var historyDatePrototype = getPrototypeAndRemoveTag(prototypeSelector);

    return function(addData) {
      var historyDate = historyDatePrototype.cloneNode(true);
      historyDate.setAttribute('name', addData.date.getTime());

      var dateTitle = historyDate.querySelector(selectorDateTitle);
      dateTitle.textContent = formatDate(addData.date, 'YYYY/MM/DD');

      var dateRemove = historyDate.querySelector(selectorDateDelete);
      dateRemove.setAttribute('name', addData.date.getTime());
      dateRemove.addEventListener('click', removeHistoryDate, true);

      return historyDate;
    };
  }//}}}

  function createHistoryDateItemList(prototypeSelector)//{{{
  {
    var historyItemPrototype = getPrototypeAndRemoveTag(prototypeSelector);
    var historyItemList = document.createElement('div');

    return  {
      set: function(addItem) {
        var historyItem = historyItemPrototype.cloneNode(true);

        var itemRemove = historyItem.querySelector(selectorHistoryItemDelete);
        itemRemove.addEventListener('click', removeHistoryItem, true);
        // item.date is a number after using getTime or Date.now() already.
        itemRemove.setAttribute('name', addItem.date);

        var itemDate = historyItem.querySelector(selectorHistoryItemDate);
        itemDate.textContent = formatDate(new Date(addItem.date), 'hh:mm:ss');

        var itemHref = historyItem.querySelector(selectorHistoryItemHref);
        itemHref.href = addItem.url;

        var ItemIcon = historyItem.querySelector(selectorHistoryItemIcon);
        ItemIcon.src = addItem.dataURI;

        var itemTitle = historyItem.querySelector(selectorHistoryItemTitle);
        itemTitle.textContent = addItem.title;

        historyItemList.appendChild(historyItem);
      },
      get: function() {
        var a = [];
        var l = historyItemList.childNodes;
        for (var j = 0; j < l.length; j = (j + 1) | 0) {
          a.push(l[j]);
        }
        return a;
      },
    };
  }//}}}

  function getDictSplitEachSessionDate(sessions)//{{{
  {
    var data;
    var ret = {};
    for (var i = 0; i < sessions.length; i = (i + 1) | 0) {
      data = sessions[i];
      if (!ret.hasOwnProperty(data.date)) {
        ret[data.date] = [];
      }
      ret[data.date].push(data);
    }
    return ret;
  }//}}}

  function saveSession(event)//{{{
  {
    var t = event.target.parentNode.parentNode.parentNode;
    var date = parseInt(t.name);
    db.getCursor({
      name      : dbSessionName,
      range     : IDBKeyRange.only(date),
      indexName : 'date',
    })
    .then(function(histories) {
      var newTime = Date.now();
      var newSessions = histories.map(function(v) {
        return { date: newTime, url: v.url };
      });
      return db.put({
        name: dbSavedSessionName,
        data: newSessions,
      });
    })
    .then(showAllSessionHistory)
    .catch(function(e) {
      error(e);
    });
  }//}}}

  function deleteSession(event)//{{{
  {
    var t = event.target.parentNode.parentNode.parentNode;
    var className = t.getAttribute('class');
    var dbName =
      className.indexOf(selectorSessionHistory.substr(1)) !== -1 ?
      dbSessionName :
      className.indexOf(selectorSavedSessionHistory.substr(1)) !== -1 ?
      dbSavedSessionName : null;
    if (dbName === null) {
      error('occur the invalid database name into deleteSession function.');
      return;
    }

    var date = parseInt(t.name);
    db.getCursor({
      name: dbName,
      range: IDBKeyRange.only(date),
      indexName: 'date',
    })
    .then(function(sessions) {
      var delKeys = sessions.map(function(v) {
        return v.id;
      });

      return db.delete({
        name: dbName,
        keys: delKeys,
      });
    })
    .then(showAllSessionHistory)
    .catch(function(e) {
      error(e);
    });
  }//}}}

  function deleteSessionItem(event)//{{{
  {
    var t = event.target.parentNode.parentNode.parentNode;
    var className = t.getAttribute('class');
    var dbName =
      className.indexOf(selectorSessionHistory.substr(1)) !== -1 ?
      dbSessionName :
      className.indexOf(selectorSavedSessionHistory.substr(1)) !== -1 ?
      dbSavedSessionName : null;
    var id = parseInt(event.target.getAttribute(attrNameOfSessionItemId), 10);

    db.delete({
      name: dbName,
      keys: id,
    })
    .then(showAllSessionHistory)
    .catch(function(e) {
      error(e);
    });
  }//}}}

  function createSessionItemList(prototypeSelector)//{{{
  {
    var historyItemPrototype = getPrototypeAndRemoveTag(prototypeSelector);
    var historyItemList = document.createElement('div');

    return {
      set: function(addItem) {
        var historyItem = historyItemPrototype.cloneNode(true);

        var itemRemove = historyItem.querySelector(selectorSessionItemDelete);
        itemRemove.addEventListener('click', deleteSessionItem, true);
        // item.date is a number after using getTime or Date.now() already.
        itemRemove.setAttribute('name', addItem.date);
        itemRemove.setAttribute(attrNameOfSessionItemId, addItem.id);

        var itemHref = historyItem.querySelector(selectorSessionItemUrl);
        itemHref.href = addItem.url;

        var ItemIcon = historyItem.querySelector(selectorSessionItemIcon);
        ItemIcon.src = addItem.dataURI;

        var itemTitle = historyItem.querySelector(selectorSessionItemTitle);
        itemTitle.textContent = addItem.title;

        historyItemList.appendChild(historyItem);
      },
      get: function() {
        var a = [];
        var l = historyItemList.childNodes;
        for (var j = 0; j < l.length; j = (j + 1) | 0) {
          a.push(l[j]);
        }
        return a;
      },
      clear: function() {
        historyItemList = document.createElement('div');
      },
    };
  }//}}}

  function showAllSessionHistory()//{{{
  {
    return new Promise(function(resolve, reject) {
      getAllSessionHistory()
      .then(function(results) {
        var savedSessions = results[0].reverse();
        var sessions      = results[1].reverse();

        var pElm = document.querySelector(selectorSessionHistorySection);

        var addSavedList = pElm.querySelector(
                             selectorAddSavedSessionHistoryListLocation);
        while (addSavedList.firstChild) {
          addSavedList.removeChild(addSavedList.firstChild);
        }
        var addList = pElm.querySelector(selectorAddSessionHistoryListLocation);
        while (addList.firstChild) {
          addList.removeChild(addList.firstChild);
        }

        var prototypeSavedSessionHistory =
          getPrototypeAndRemoveTag(prototypeSelectorOfSavedSessionHistory);
        var prototypeSessionHistory =
          getPrototypeAndRemoveTag(prototypeSelectorOfSessionHistory);
        // var prototypeSessionHistoryItem =
        //   getPrototypeAndRemoveTag(prototypeSelectorOfSessionHistoryItem);

        var cSIL = createSessionItemList(prototypeSelectorOfSessionItem);

        var s, i, j, v2, key, sKeys,
            sessionHistory, sessionDate, sessionSave, sessionDelete,
            addSessionHistoryItem;
        
        savedSessions.forEach(function(v) {//{{{
          s = getDictSplitEachSessionDate(v.data);

          sKeys = [];
          for (key in s) {
            sKeys.unshift(key);
          }
          for (i = 0; i < sKeys.length; i = (i + 1) | 0) {
            key = sKeys[i];

            sessionHistory = prototypeSavedSessionHistory.cloneNode(true);
            sessionHistory.setAttribute('name', parseInt(key));
            sessionDate = sessionHistory.querySelector(
              selectorSavedSessionDate);
            sessionDate.textContent = formatDate(
              new Date(parseInt(key)), 'YYYY/MM/DD hh:mm:ss');
            sessionDelete = sessionHistory.querySelector(
              selectorSavedSessionDelete);
            sessionDelete.addEventListener('click', deleteSession);
            addSessionHistoryItem = sessionHistory.querySelector(
              selectorAddSavedSessionHistoryItemLocation);

            cSIL.clear();
            for (j = s[key].length - 1; j >= 0; j = (j - 1) | 0) {
              v2 = s[key][j];
              cSIL.set(v2);
            }

            var list = cSIL.get();
            for (j = 0; j < list.length; j = (j + 1) | 0) {
              addSessionHistoryItem.appendChild(list[j]);
            }

            addSavedList.appendChild(sessionHistory);
          }
        });//}}}

        sessions.forEach(function(v) {//{{{
          s = getDictSplitEachSessionDate(v.data);

          sKeys = [];
          for (key in s) {
            sKeys.unshift(key);
          }
          for (i = 0; i < sKeys.length; i = (i + 1) | 0) {
            key = sKeys[i];

            sessionHistory = prototypeSessionHistory.cloneNode(true);
            sessionHistory.setAttribute('name', parseInt(key));
            sessionDate    = sessionHistory.querySelector(selectorSessionDate);
            sessionDate.textContent = formatDate(
              new Date(parseInt(key)), 'YYYY/MM/DD hh:mm:ss');
            sessionSave = sessionHistory.querySelector(selectorSessionSave);
            sessionSave.addEventListener('click', saveSession);
            sessionDelete = sessionHistory.querySelector(selectorSessionDelete);
            sessionDelete.addEventListener('click', deleteSession);
            addSessionHistoryItem = sessionHistory.querySelector(
              selectorAddSessionHistoryItemLocation);

            cSIL.clear();
            for (j = s[key].length - 1; j >= 0; j = (j - 1) | 0) {
              v2 = s[key][j];
              cSIL.set(v2);
            }

            var list = cSIL.get();
            for (j = 0; j < list.length; j = (j + 1) | 0) {
              addSessionHistoryItem.appendChild(list[j]);
            }

            addList.appendChild(sessionHistory);
          }
        });//}}}

        resolve();
      })
      .catch(reject);
    });
  }//}}}

  function getAllSessionHistory()//{{{
  {
    return new Promise(function(resolve, reject) {
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
      .then(function(results) {
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
        Promise.all(p)
        .then(resolve)
        .catch(reject);
      })
      .catch(reject);
    });
  }//}}}

  function getListAfterJoinHistoryDataOnDB(array)//{{{
  {
    return new Promise(function(resolve) {
      var histories = array[0];
      var pageInfos = array[1];
      var dataURIs  = array[2];

      var pageInfoDict = {};
      pageInfos.forEach(function(v) {
        pageInfoDict[v.url] = { title: v.title, host: v.host };
      });

      var dataURIDict = {};
      dataURIs.forEach(function(v) {
        dataURIDict[v.host] = v.dataURI;
      });

      var page;
      var date, tempDate;
      var showList = [];
      var dataList = [];
      histories.forEach(function(v) {
        page = pageInfoDict[v.url];
        if (page === void 0 || page === null) {
          warn("Don't find data in pageInfo of indexedDB.", v.url);
          return;
        }

        date = new Date(v.date);
        if (!tempDate) {
          tempDate = date;
        }

        if (formatDate(tempDate, 'YYYY/MM/DD') !==
          formatDate(date, 'YYYY/MM/DD')) {
          showList.push({
            date : new Date(tempDate.getFullYear(),
              tempDate.getMonth(),
              tempDate.getDate(),
              0, 0, 0, 0),
            data : dataList,
          });
            tempDate = date;
            dataList = [];
          }

          dataList.push({
            id      : v.id,
            date    : v.date,
            url     : v.url,
            title   : page.title,
            host    : page.host,
            dataURI : dataURIDict[page.host] || icons[NORMAL],
          });
      });

      if (dataList.length > 0) {
        showList.push({
          date : new Date(tempDate.getFullYear(),
            tempDate.getMonth(),
            tempDate.getDate(),
            0, 0, 0, 0),
          data : dataList,
        });
      }

      resolve(showList);
    });
  }//}}}

  function showAllHistory()//{{{
  {
    return new Promise(function(resolve, reject) {
      getAllHistory()
      .then(function(historyArray) {
        var autocompleteDateList =
          addAutocompleteDateList(selectorSearchHistoryDateList);

        var historyDateList =
          document.querySelector(selectorOfLocationWhereAddHistoryDateItem);
        while (historyDateList.firstChild) {
          historyDateList.removeChild(historyDateList.firstChild);
        }

        var historyDate =
          createHistoryDate(prototypeSelectorOfHistoryDate);
        var historyDateItemList =
          createHistoryDateItemList(prototypeSelectorOfHistoryItem);

        var hDate, historyItemList, itemList;
        var data, i, j, z;
        for (i = (historyArray.length - 1) | 0; 0 <= i; i = (i - 1) | 0) {
          data = historyArray[i];
          hDate = historyDate(data);
          autocompleteDateList(data.date);

          for (j = (data.data.length - 1) | 0; 0 <= j; j = (j - 1) | 0) {
            historyDateItemList.set(data.data[j]);
          }
          itemList = historyDateItemList.get();

          historyItemList = hDate.querySelector(selectorOfLocationWhereAddItem);
          for (z = 0; z < itemList.length; z = (z + 1) | 0) {
            historyItemList.appendChild(itemList[z]);
          }

          historyDateList.appendChild(hDate);
        }

        resolve();
      })
      .catch(reject);
    });
  }//}}}

  function getAllHistory()//{{{
  {
    return new Promise(function(resolve, reject) {
      if (db === void 0 || db === null) {
        reject(new Error("IndexedDB doesn't initialize yet."));
        return;
      }

      var p = [];
      p.push( db.getAll({ name: dbHistoryName }) );
      p.push( db.getAll({ name: dbPageInfoName }) );
      p.push( db.getAll({ name: dbDataURIName }) );
      Promise.all(p)
      .then(getListAfterJoinHistoryDataOnDB)
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  function showSpecificHistoryDate(event)//{{{
  {
    var value      = event.target.value;
    var regex      = new RegExp(/(\d+)-(\d+)-(\d+)/);
    var matches, searchDate;
    if (value.length > 0) {
      matches    = value.match(regex);
      searchDate = new Date(matches[1], (matches[2] - 1) | 0, matches[3]);
    }

    var historyDateList = document.querySelectorAll(
      selectorHistoryDate + ':not(.' + prototypeClassName + ')');
    var item, date;
    for (var i = 0; i < historyDateList.length; i = (i + 1) | 0) {
      item = historyDateList[i];
      date = new Date(parseInt(item.name, 10));
      if (value.length === 0 || date.getTime() === searchDate.getTime()) {
        removeStringFromAttributeOfElement(
          item, 'class', elementDoesNotClassName);
      } else {
        addStringToAttributeOfElement(item, 'class', elementDoesNotClassName);
      }
    }
  }//}}}

  function showSpecificHistoryItem(event)//{{{
  {
    var regex = new RegExp(event.target.value.trim(), 'g');
    var section, item;
    var itemTitles = document.querySelectorAll(
      selectorHistoryItemTitle + ':not(.' + prototypeClassName + ')');
    for (var i = 0; i < itemTitles.length; i = (i + 1) | 0) {
      item = itemTitles[i];
      section = item.parentNode.parentNode.parentNode;
      if (regex.test(item.textContent)) {
        removeStringFromAttributeOfElement(
          section, 'class', elementDoesNotClassName);
      } else {
        addStringToAttributeOfElement(
          section, 'class', elementDoesNotClassName);
      }
    }
  }//}}}

  function initHistoryEvent(d)//{{{
  {
    return new Promise(function(resolve) {
      var searchDate = d.querySelector(selectorSearchHistoryDate);
      searchDate.addEventListener('change', showSpecificHistoryDate, true);

      var searchItem = d.querySelector(selectorSearchHistoryItem);
      searchItem.addEventListener('keyup', showSpecificHistoryItem, true);

      resolve();
    });
  }//}}}

  function changeMenu(name)//{{{
  {
    return new Promise(function(resolve, reject) {
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

  function initSectionBarEvent(d)//{{{
  {
    return new Promise(function(resolve, reject) {
      try {
        var e = d.querySelectorAll(buttonSelector);
        for (var i = 0; i < e.length; i = (i + 1) | 0) {
          e[i].addEventListener('click', sectionButtonClicked, true);
        }
        resolve();
      } catch (e) {
        reject(e);
      }
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
    .then(function(item) {
      writeObj[name] = item;
      chrome.storage.local.set(writeObj, function() {
        log('have wrote the data. name: ' + name + ', value: ' + item);
      });
    })
    .catch(function(mes) {
      error(mes);
    });
  }//}}}

  function initOptionElementEvent(d)//{{{
  {
    return new Promise(function(resolve) {
      var i, els;

      els = d.querySelectorAll("input");
      for (i = 0; i < els.length; i = (i + 1) | 0) {
        els[i].addEventListener('keyup', updateOptionValueToStorage, true);
        els[i].addEventListener('change', updateOptionValueToStorage, true);
      }

      els = d.querySelectorAll("textarea");
      for (i = 0; i < els.length; i = (i + 1) | 0) {
        els[i].addEventListener('keyup', updateOptionValueToStorage, true);
      }
      resolve();
    });
  }//}}}

  function showAllKeybindString()//{{{
  {
    log('showAllKeybindString');

    var options = document.querySelectorAll(selectorKeybindOption);
    var keyJson, keyString;
    for (var i = 0; i < options.length; i = (i + 1) | 0) {
      keyJson   = options[i].querySelector(selectorKeybindValue);
      keyString = options[i].querySelector(selectorShowingKeybind);
      try {
        if (keyJson.value === '{}' ||
            keyJson.value === null ||
            keyJson.value === void 0) {
            continue;
        }

        keyString.value = generateKeyString(JSON.parse(keyJson.value));
      } catch (e) {
        warn(e, keyJson.value);
      }
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

  function initKeybindEvent(d)//{{{
  {
    return new Promise(function(resolve) {
      d.addEventListener('keyup', keyupEvent, true);
      resolve();
    });
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
      el = document.querySelector(selectorExportLocation);
      el.select();
      var result = document.execCommand('copy');
      var msg = result ? 'successed' : 'failured';
      log('have copied the string of import area. it is ' + msg + '.');

      window.getSelection().removeAllRanges();
      break;
    case classNameOfApplyButton:
      var value;

      el = document.querySelector(selectorImportLocation);
      try {
        value = JSON.parse(el.value.trim());
      } catch (e) {
        if (e instanceof SyntaxError) {
          error("Invalid string. The string isn't json string.");
        } else {
          error(e);
        }
        break;
      }

      value = deleteKeyItemFromObject(value, excludeKeyNames);
      operateOption.import(document, value)
      .then(function(writeOptions) {
        return new Promise(function(resolve) {
          chrome.storage.local.set(writeOptions, resolve);
        });
      })
      .then(showOptionValuesToOperateSettingsPage)
      .catch(function(e) {
        error(e);
      });
      break;
    }
  }//}}}

  function initButtonEvent(d)//{{{
  {
    return new Promise(function(resolve) {
      var els = d.querySelectorAll('button');
      for (var i = 0; i < els.length; i = (i + 1) | 0) {
        els[i].addEventListener('click', buttonClicked, true);
      }
      resolve();
    });
  }//}}}

  document.addEventListener('DOMContentLoaded', function() {//{{{
    (function() {
      return new Promise(function(resolve) {
        db = new Database(dbName, dbVersion);
        db.open(dbCreateStores);
        resolve();
      });
    }())
    .then(changeMenu(defaultMenu))
    .then(initSectionBarEvent(document))
    .then(loadTranslation(document, translationPath))
    .then(operateOption.load(document))
    .then(initOptionElementEvent(document))
    .then(initButtonEvent(document))
    .then(initKeybindEvent(document))
    .then(initHistoryEvent(document))
    .catch(function(e) {
      error(e);
    });
  }, true);//}}}
}(this, this.document));
