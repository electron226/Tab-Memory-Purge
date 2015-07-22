(function(window, document) {
  'use strict';

  let OperateOptionValue = function() {//{{{
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

      let el = d.querySelector(
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
    let $this = this;

    return new Promise(function(resolve, reject) {
      let p;

      chrome.storage.local.get(function(items) {
        p = [];
        for (let key in defaultValues) {
          if (defaultValues.hasOwnProperty(key)) {
            p.push($this.set(d, key,
              items.hasOwnProperty(key) ? items[key] : defaultValues[key]));
          }
        }
        Promise.all(p).then(resolve, reject);
      });
    });
  };//}}}

  let ShowMenuSelection = function(selectors, className_when_select) {//{{{
    ShowMenuSelection.toggleSectionRegex = /(display:\s*)(\w+);/i;

    this.menuSelector          = selectors.menu;
    this.buttonSelector        = selectors.button;
    this.className_when_select = className_when_select;
  };
  ShowMenuSelection.prototype.showMenu = function(selector) {
    return function(idName) {
      let oldStyle, newStyle;
      let showMenu = document.querySelector(selector + '#' + idName + '');

      let el    = showMenu;
      let style = el.getAttribute('style');
      if (style === null) {
        el.setAttribute('style', 'display: block;');
      } else {
        oldStyle = style.replace(ShowMenuSelection.toggleSectionRegex, '');
        newStyle = 'display: block;';
        el.setAttribute('style', oldStyle + newStyle);
      }

      let dontShowMenu =
        document.querySelectorAll(selector + ':not(#' + idName + ')');
      for (let i = 0, len = dontShowMenu.length; i < len; i++) {
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
    let $this = this;

    return function(name) {
      let o = document.querySelector(
        selector + '.' + $this.className_when_select);
      if (o !== null) {
        o.setAttribute('class',
          o.getAttribute('class').replace(
            $this.className_when_select, '').trim() );
      }

      let n = document.querySelector(selector + '[name = "' + name + '"]');
      n.setAttribute('class',
        n.getAttribute('class') + ' ' + $this.className_when_select);
    };
  };
  ShowMenuSelection.prototype.show = function(name) {
    let $this = this;

    return new Promise(function(resolve) {
      let showMenuArea, selectMenuButton;

      showMenuArea     = $this.showMenu($this.menuSelector);
      selectMenuButton = $this.changeSelectionButtonColor($this.buttonSelector);

      showMenuArea(name);
      selectMenuButton(name);

      resolve(name);
    });
  };//}}}

  let KeyTrace = function(id) {//{{{
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

  //       let writeObject = {};
  //       let keybind = items.keybind;
  //       if (keybind) {
  //         for (let key in keybind) {
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

    let keybindTick = null;

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
          break;
        case 'change_history':
          break;
        case 'operate_settings':
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
  let defaultMenu = "history";

  // indexedDB
  let db = null;

  let keybindClassNameOfSetButton   = 'keybind_set';
  let keybindClassNameOfClearButton = 'keybind_clear';
  let selectorKeybindOption         = '.keyOption';
  let selectorShowingKeybind        = '.pressKey';
  let selectorKeybindValue          = '.keybindValue';

  let menuSelector           = '.sectionMenu';
  let buttonSelector         = '.sectionButton';
  let sectionButtonClassName = buttonSelector.substring(1);

  let operateOption = new OperateOptionValue();
  let keybindTrace = new KeyTrace();
  let menuToggle = new ShowMenuSelection(
    { menu: menuSelector, button: buttonSelector }, 'select');
  let afterMenuSelection = processAfterMenuSelection();

  let prototypeSelectorOfHistoryDate            = '.historyDate.prototype';
  let prototypeSelectorOfHistoryItem            = '.historyItem.prototype';
  let selectorOfLocationWhereAddHistoryDateItem = '#history';
  let selectorOfLocationWhereAddItem           = '.historyItemList';
  let selectorDateTitle                         = '.historyDateTitle';
  let selectorDateDelete                        = '.historyDateDelete';
  let selectorHistoryItemDelete                 = '.historyItemDelete';
  let selectorHistoryItemDate                   = '.historyItemDate';
  let selectorHistoryItemHref                   = '.historyItemURL';
  let selectorHistoryItemIcon                   = '.historyItemIcon';
  let selectorHistoryItemTitle                  = '.historyItemTitle';
//}}}

  function removeStringFromAttributeOfElement(element, attrName, removeStr)//{{{
  {
    let re = new RegExp('\\s*' + removeStr, 'ig');
    element.setAttribute(
      attrName, element.getAttribute(attrName).replace(re, ''));
  }//}}}

  function showAllHistory()//{{{
  {
    return new Promise(function(resolve, reject) {
      getAllHistory()
      .then(function(historyArray) {
        let getPrototypeAndRemoveTag = function(selector) {
          let proto = document.querySelector(selector).cloneNode(true);
          removeStringFromAttributeOfElement(proto, 'class', 'prototype');
          return proto;
        };

        let historyDateList =
          document.querySelector(selectorOfLocationWhereAddHistoryDateItem);

        let historyDatePrototype =
          getPrototypeAndRemoveTag(prototypeSelectorOfHistoryDate);
        let historyItemPrototype =
          getPrototypeAndRemoveTag(prototypeSelectorOfHistoryItem);

        let historyDate, historyItem, historyItemList;
        let dateTitle, dateRemove;
        let itemDate, itemHref, ItemIcon, itemTitle, itemRemove;
        let data, item, i, j;
        for (i = (historyArray.length - 1) | 0; 0 <= i; i = (i - 1) | 0) {
          data = historyArray[i];

          historyDate = historyDatePrototype.cloneNode(true);

          dateTitle = historyDate.querySelector(selectorDateTitle);
          dateTitle.textContent = formatDate(data.date, 'YYYY/MM/DD');

          dateRemove = historyDate.querySelector(selectorDateDelete);
          dateRemove.setAttribute('name', data.date.getTime());

          historyItemList =
            historyDate.querySelector(selectorOfLocationWhereAddItem);
          for (j = (data.data.length - 1) | 0; 0 <= j; j = (j - 1) | 0) {
            item = data.data[j];

            historyItem = historyItemPrototype.cloneNode(true);

            itemRemove = historyItem.querySelector(selectorHistoryItemDelete);
            // item.date is already after use getTime.
            itemRemove.setAttribute('name', item.date);

            itemDate = historyItem.querySelector(selectorHistoryItemDate);
            itemDate.textContent = formatDate(new Date(item.date), 'hh:mm:ss');

            itemHref = historyItem.querySelector(selectorHistoryItemHref);
            itemHref.href = item.url;

            ItemIcon = historyItem.querySelector(selectorHistoryItemIcon);
            ItemIcon.src = item.dataURI;

            itemTitle = historyItem.querySelector(selectorHistoryItemTitle);
            itemTitle.textContent = item.title;

            historyItemList.appendChild(historyItem);
          }

          historyDateList.appendChild(historyDate);
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

      let p = [];
      p.push( db.getAll({ name: dbHistoryName }) );
      p.push( db.getAll({ name: dbPageInfoName }) );
      p.push( db.getAll({ name: dbDataURIName }) );

      Promise.all(p)
      .then(function(results) {
        let histories = results[0];
        let pageInfos = results[1];
        let dataURIs = results[2];

        let pageInfoDict = {};
        pageInfos.forEach(function(v) {
          pageInfoDict[v.url] = { title: v.title, host: v.host };
        });

        let dataURIDict = {};
        dataURIs.forEach(function(v) {
          dataURIDict[v.host] = v.dataURI;
        });

        let page;
        let date, tempDate;
        let showList = [];
        let dataList = [];
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
      })
      .catch(reject);
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
    let t = event.target;
    if (t.getAttribute('class') !== sectionButtonClassName) {
      return;
    }

    changeMenu(t.getAttribute('name'));
  }//}}}

  function initSectionBarEvent(d)//{{{
  {
    return new Promise(function(resolve, reject) {
      try {
        let e = d.querySelectorAll(buttonSelector);
        for (let i = 0; i < e.length; i = (i + 1) | 0) {
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
    let writeObj = {};

    operateOption.get(document, e.target.name)
    .then(function(item) {
      writeObj[e.target.name] = item;
      chrome.storage.local.set(writeObj, function() {
        log('have wrote the data. name: ' + e.target.name + ', value: ' + item);
      });
    })
    .catch(function(mes) {
      error(mes);
    });
  }//}}}

  function initOptionElementEvent(d)//{{{
  {
    return new Promise(function(resolve) {
      let i, els;

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

    let options = document.querySelectorAll(selectorKeybindOption);
    let keyJson, keyString;
    for (let i = 0; i < options.length; i = (i + 1) | 0) {
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
    let option = document.querySelector(
      '.' + className + selectorKeybindOption);

    let keybindValue = option.querySelector(selectorKeybindValue);
    keybindValue.value = JSON.stringify(keyInfo);

    let showKeybindString = option.querySelector(selectorShowingKeybind);
    try {
      showKeybindString.value = generateKeyString(keyInfo);
    } catch (e) {
      showKeybindString.value = '';
    }
  }//}}}

  function keyupEvent(event)//{{{
  {
    if (keybindTrace.isRun()) {
      let info = keybindTrace.traceEvent(event);
      setKeybindOption(info.id, info.key);

      // save the keybind with using event to storage.
      let newEvent = document.createEvent('HTMLEvents');
      newEvent.initEvent('change', false, true);
      let traceTarget = document.querySelector(
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
    let cName           = event.target.getAttribute('class');

    // keybind only.
    let parentClassName = event.target.parentNode.getAttribute('class');
    let optionName;
    if (parentClassName) {
      optionName = parentClassName.replace(
        selectorKeybindOption.replace(/^./, ''), '').trim();
    }

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
      let el = document.querySelector(
        '[name="' + optionName + '"]' + selectorKeybindValue);
      let newEvent = document.createEvent('HTMLEvents');
      newEvent.initEvent('change', false, true);
      el.dispatchEvent(newEvent);
      break;
    }
  }//}}}

  function initButtonEvent(d)//{{{
  {
    return new Promise(function(resolve) {
      let els = d.querySelectorAll('button');
      for (let i = 0; i < els.length; i = (i + 1) | 0) {
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
    .then(operateOption.init(document))
    .then(initOptionElementEvent(document))
    .then(initButtonEvent(document))
    .then(initKeybindEvent(document))
    .catch(function(e) {
      error(e);
    });
  }, true);//}}}

  // var optionModule = angular.module('options', ['myCommons']);
  // optionModule.config(['$compileProvider', function($compileProvider){
  //   let urlRegex =
  //   /^\s*(data|https?|ftp|mailto|file|
    //   chrome-extension|blob:chrome-extension):/;
  //   $compileProvider.aHrefSanitizationWhitelist(urlRegex);
  //   $compileProvider.imgSrcSanitizationWhitelist(urlRegex);
  // }]);
  // optionModule.controller('OptionController',
  //   ['$scope', '$http', '$document', function($scope, $http, $document) {
  //   $scope.options = angular.copy(defaultValues);
  //   $scope.currentLocale = chrome.i18n.getUILanguage();
  //   $scope.previousSessionTime = null;

  //   $scope.db = new Database(dbName, dbVersion);
  //   $scope.db.open(dbCreateStores);

  //   let regTool = $document.find(
  //     '[ng-controller="RegexToolController"]');
  //   $scope.showRegexTool = function() {
  //     regTool.toggleClass('show');
  //   };

  //   // select menu.
  //   $scope.selectMenu = '';
  //   $scope.menuItems = angular.copy(optionMenus);
  //   let menu = {
  //     menuElement: $document.find('#config_change'),
  //     barName: 'change_bar',
  //     enable: function(name) {
  //       this.commonFunc(name, true, 'black');
  //     },
  //     disable: function(name) {
  //       this.commonFunc(name, false, 'lightgray');
  //     },
  //     commonFunc: function(name, show, color) {
  //       if (name.length === 0) {
  //         error('The name of arguments of commonFunc is length zero.');
  //         return;
  //       }

  //       let t = this.menuElement.find('.' + name);
  //       if (t.length !== 0) {
  //         let bar = t.find('.' + this.barName);
  //         (show) ? bar.show() : bar.hide();
  //         t.find('[translation="' + name + '"]').css('color', color);
  //       }
  //     },
  //   };

  //   let pageElement = $document.find('#option_items').children('section');
  //   let footer = $document.find('footer');
  //   $scope.$watch('selectMenu', function(newValue, oldValue) {
  //     debug('selectMenu was changed. on OptionController.',
  //       newValue, oldValue);
  //     if (angular.isString(newValue) && angular.isString(oldValue)) {
  //       menu.disable(oldValue);
  //       menu.enable(newValue);

  //       pageElement.each(function(index, element) {
  //         let el = angular.element(element);
  //         let className = el.attr('class').replace(/ng-scope/, '').trim();
  //         if (newValue === className) {
  //           el.show();
  //         } else {
  //           el.hide();
  //         }
  //       });

  //       if (newValue === 'option' || newValue === 'keybind') {
  //         footer.show();
  //       } else {
  //         footer.hide();
  //       }
  //     }
  //   });

  //   $scope.menuSelect = function($event) {
  //     $scope.selectMenu = angular.element(
  //       $event.target).attr('translation').trim();

  //     if ($scope.showRestoreMessage) {
  //       $scope.showRestoreMessage = false;
  //     }
  //   };

  //   $document.ready(function(){
  //     $scope.menuItems.forEach(function(value) {
  //       menu.disable(value.name);
  //     });

  //     chrome.runtime.sendMessage(
  //       { event: 'display_option_page' }, function(response) {
  //       $scope.$apply(function() {
  //         if (response === 'updated') {
  //           $scope.showRestoreMessage =
  //             $scope.options.when_updated_restore_session ? false : true;
  //           response = 4; // 4 == changed history.
  //           $scope.previousSessionTime =
  //              $scope.options[previousSessionTimeKey];
  //         }
  //         $scope.selectMenu = $scope.menuItems[response ? response : 0].name;
  //       });
  //     });
  //   });
  // }]);

  // optionModule.controller('keybindController',
  //   ['$scope', '$document', function($scope, $document) {
  //   $scope.keys = [];
  //   $scope.start = null;

  //   let section = $document.find('[ng-controller="keybindController"]');
  //   $scope.$watch('options.keybind', function(newValue, oldValue) {
  //     debug('keybind was changed.', newValue, oldValue);
  //     if (angular.isObject(newValue)) {
  //       let pressKeys = section.find('input[type="text"].pressKey');
  //       if (pressKeys.length === 0) {
  //         error('option.keybind is watching error. pressKeys is zero.');
  //         return;
  //       }

  //       let obj = null;
  //       let className = null;
  //       for (let i = 0, len = pressKeys.length; i < len; i++) {
  //         className = pressKeys[i].parentNode.parentNode.className;
  //         obj = angular.fromJson(newValue[className]);
  //         pressKeys[i].value = jQuery.isEmptyObject(obj) ?
  //                              '' : generateKeyString(obj);
  //       }
  //     }
  //   });

  //   $scope.setBind = function($event) {
  //     $scope.start = angular.element($event.target.parentNode.parentNode)[0];
  //   };

  //   $scope.clearBind = function($event) {
  //     let keyBinds = angular.copy($scope.options.keybind);
  //     keyBinds[$event.target.parentNode.parentNode.className] = '{}';
  //     $scope.$parent.options.keybind = keyBinds;
  //   };

  //   $document.keyup(function(event) {
  //     if (angular.isObject($scope.start)) {
  //       let keyBinds = angular.copy($scope.options.keybind);
  //       keyBinds[$scope.start.className] = angular.toJson(keyCheck(event));
  //       $scope.$apply(function() {
  //         $scope.$parent.options.keybind = keyBinds;
  //       });

  //       $scope.start = null;
  //     }
  //   });

  //   angular.forEach($scope.options.keybind, function(value, key) {
  //     $scope.keys.push({ name: key, value: value });
  //   });
  // }]);

  // optionModule.controller('historyController', ['$scope', function($scope) {
  //   $scope.history = [];
  //   $scope.selectHistory = '';
  //   let searchDate = null;

  //   $scope.$watch('selectHistory', function(newValue) {
  //     debug('selectHistory was changed on historyController.', newValue);
  //     if (angular.isUndefined(newValue) || newValue === null) {
  //       searchDate = null;
  //       return;
  //     }

  //     searchDate = newValue;
  //   });

  //   $scope.showDate = function(date) {
  //     if (angular.isDate(searchDate)) {
  //       return (date.getTime() === searchDate.getTime()) ? true : false;
  //     } else {
  //       return true;
  //     }
  //   };

  //   let showHistory = function() {
  //     return new Promise(function(resolve, reject) {
  //       let p = [];
  //       p.push( $scope.db.getAll({ name: dbHistoryName }) );
  //       p.push( $scope.db.getAll({ name: dbPageInfoName }) );
  //       p.push( $scope.db.getAll({ name: dbDataURIName }) );

  //       Promise.all(p)
  //       .then(function(results) {
  //         return new Promise(function(resolve2) {
  //           let histories = results[0];
  //           let pageInfos = results[1];
  //           let dataURIs = results[2];

  //           let pageInfoDict = {};
  //           pageInfos.forEach(function(v) {
  //             pageInfoDict[v.url] = { title: v.title, host: v.host };
  //           });

  //           let dataURIDict = {};
  //           dataURIs.forEach(function(v) {
  //             dataURIDict[v.host] = v.dataURI;
  //           });

  //           let page;
  //           let date, tempDate;
  //           let showList = [];
  //           let dataList = [];
  //           histories.forEach(function(v) {
  //             page = pageInfoDict[v.url];
  //             if (page === void 0 || page === null) {
  //               warn("Don't find data in pageInfo of indexedDB.", v.url);
  //               return;
  //             }

  //             date = new Date(v.date);
  //             if (!tempDate) {
  //               tempDate = date;
  //             }

  //             if (formatDate(tempDate, 'YYYY/MM/DD') !==
  //                 formatDate(date, 'YYYY/MM/DD')) {
  //               showList.push({
  //                 date : new Date(tempDate.getFullYear(),
  //                                 tempDate.getMonth(),
  //                                 tempDate.getDate(),
  //                                 0, 0, 0, 0),
  //                 data : dataList,
  //               });
  //               tempDate = date;
  //               dataList = [];
  //             }

  //             dataList.push({
  //               date    : v.date,
  //               url     : v.url,
  //               title   : page.title,
  //               host    : page.host,
  //               dataURI : dataURIDict[page.host] || icons[NORMAL],
  //             });
  //           });

  //           if (dataList.length > 0) {
  //             showList.push({
  //               date : new Date(tempDate.getFullYear(),
  //                               tempDate.getMonth(),
  //                               tempDate.getDate(),
  //                               0, 0, 0, 0),
  //               data : dataList,
  //             });
  //           }

  //           resolve2(showList);
  //         });
  //       })
  //       .then(function(showList) {
  //         $scope.$apply(function() {
  //           $scope.history = showList;
  //           resolve();
  //         });
  //       })
  //       .catch(function(e) {
  //         error(e.stack);
  //         reject(e);
  //       });
  //     });
  //   };

  //   $scope.reloadHistory = showHistory;

  //   $scope.deleteHistory = function(date) {
  //     return new Promise(function(resolve, reject) {
  //       let begin = new Date(
  //         date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  //       let end = new Date(
  //         date.getFullYear(), date.getMonth(), date.getDate(),
  //         23, 59, 59, 999);
  //       $scope.db.getCursor({
  //         name: dbHistoryName,
  //         range: IDBKeyRange.bound(begin.getTime(), end.getTime()),
  //       })
  //       .then(function(histories) {
  //         let delKeys = histories.map(function(v) {
  //           return v.date;
  //         });
  //         return $scope.db.delete({
  //           name: dbHistoryName,
  //           keys: delKeys,
  //         });
  //       })
  //       .then(showHistory)
  //       .then(resolve)
  //       .catch(function(e) {
  //         error(e.stack);
  //         reject(e);
  //       });
  //     });
  //   };

  //   $scope.deleteHistoryItem = function(date) {
  //     return new Promise(function(resolve, reject) {
  //       $scope.db.delete({
  //         name: dbHistoryName,
  //         keys: date,
  //       })
  //       .then(showHistory)
  //       .then(resolve)
  //       .catch(function(e) {
  //         error(e.stack);
  //         reject(e);
  //       });
  //     });
  //   };

  //   var firstFlag = true;
  //   var showFlag = false;
  //   $scope.$watch('selectMenu', function(newValue) {
  //     debug('selectMenu was changed on historyController.');
  //     showFlag = (newValue === 'history') ? true : false;
  //     if (firstFlag && showFlag) {
  //       showHistory();
  //       firstFlag = false;
  //     }
  //   });
  // }]);

  // optionModule.controller('sessionHistoryController',
  //   ['$scope', function($scope) {
  //     $scope.sessionHistory = [];
  //     $scope.savedSessionHistory = [];
  //     $scope.displaySavedSession = null;
  //     $scope.currentSessionTime = null;

  //     let showSavedSession = function() {
  //       return new Promise(function(resolve, reject) {
  //         loadSession($scope.db, dbSavedSessionName)
  //         .then(function(showList) {
  //           $scope.$apply(function() {
  //             $scope.savedSessionHistory = showList;
  //             resolve();
  //           });
  //         })
  //         .catch(function(e) {
  //           error(e.stack);
  //           reject(e);
  //         });
  //       });
  //     };

  //     let showSession = function() {
  //       return new Promise(function(resolve, reject) {
  //         let p = [];
  //         p.push(
  //           new Promise(function(resolve2, reject2) {
  //             chrome.runtime.sendMessage(
  //               { event: 'current_session' }, function(currentSessionTime) {
  //                 if (chrome.runtime.lastError) {
  //                   reject2(chrome.runtime.lastError);
  //                   return;
  //                 }
  //                 resolve2(currentSessionTime);
  //             });
  //           })
  //         );
  //         p.push( loadSession($scope.db, dbSessionName) );

  //         Promise.all(p).then(function(results) {
  //           let currentSessionTime = results[0];
  //           let showSessionList = results[1];

  //           $scope.$apply(function() {
  //             $scope.currentSessionTime = currentSessionTime;
  //             $scope.sessionHistory = showSessionList;
  //             resolve();
  //           });
  //         })
  //         .catch(function(e) {
  //           error(e.stack);
  //           reject(e);
  //         });
  //       });
  //     };

  //     $scope.reloadSession = showSession;

  //     var firstFlag = true;
  //     var showFlag = false;
  //     $scope.$watch('selectMenu', function(newValue) {
  //       debug('selectMenu was changed on historyController.');
  //       showFlag = (newValue === 'session_history') ? true : false;
  //       if (firstFlag && showFlag) {
  //         showSession();
  //         showSavedSession();
  //         firstFlag = false;
  //       }
  //     });

  //     $scope.savedSessionClicked = function(session) {
  //       $scope.displaySavedSession = session.data;
  //     };

  //     $scope.deleteSavedSession = function(session) {
  //       return new Promise(function(resolve, reject) {
  //         if (session === void 0 ||
  //             session === null ||
  //             session.length === 0) {
  //           reject();
  //           return;
  //         }

  //         $scope.db.getCursor({
  //           name: dbSavedSessionName,
  //           range: IDBKeyRange.only(session[0].date),
  //           indexName: 'date',
  //         })
  //         .then(function(sessions) {
  //           let delKeys = sessions.map(function(v) {
  //             return v.id;
  //           });

  //           return $scope.db.delete({
  //             name: dbSavedSessionName,
  //             keys: delKeys,
  //           });
  //         })
  //         .then(function() {
  //           $scope.displaySavedSession = null;
  //           return showSavedSession();
  //         })
  //         .then(resolve)
  //         .catch(function(e) {
  //           error(e.stack);
  //           reject();
  //         });
  //       });
  //     };

  //     $scope.deleteSavedSpecificSession = function(sessions, id) {
  //       return new Promise(function(resolve, reject) {
  //         $scope.db.delete({
  //           name: dbSavedSessionName,
  //           keys: id,
  //         })
  //         .then(function() {
  //           return new Promise(function(resolve2) {
  //             let newSessions = sessions.filter(function(v) {
  //               return v.id !== id;
  //             });
  //             $scope.displaySavedSession = newSessions;
  //             resolve2();
  //           });
  //         })
  //         .then(function() {
  //           return showSavedSession();
  //         })
  //         .then(resolve)
  //         .catch(reject);
  //       });
  //     };

  //     $scope.deleteSpecificSession = function(sessions, id) {
  //       debug(sessions, id);
  //       return new Promise(function(resolve, reject) {
  //         $scope.db.delete({
  //           name: dbSessionName,
  //           keys: id,
  //         })
  //         .then(function() {
  //           return showSession();
  //         })
  //         .then(resolve)
  //         .catch(reject);
  //       });
  //     };

  //     $scope.saved = function(session) {
  //       return new Promise(function(resolve, reject) {
  //         $scope.db.getCursor({
  //           name      : dbSessionName,
  //           range     : IDBKeyRange.only(session.date),
  //           indexName : 'date',
  //         })
  //         .then(function(histories) {
  //           return $scope.db.put({
  //             name: dbSavedSessionName,
  //             data: histories,
  //           });
  //         })
  //         .then(function() {
  //           return showSavedSession();
  //         })
  //         .then(resolve)
  //         .catch(function(e) {
  //           error(e.stack);
  //           reject();
  //         });
  //       });
  //     };

  //     $scope.deleted = function(session) {
  //       return new Promise(function(resolve, reject) {
  //         $scope.db.getCursor({
  //           name: dbSessionName,
  //           range: IDBKeyRange.only(session.date),
  //           indexName: 'date',
  //         })
  //         .then(function(targetSessions) {
  //           let delKeys = targetSessions.map(function(v) {
  //             return v.id;
  //           });
  //           return $scope.db.delete({
  //             name: dbSessionName,
  //             keys: delKeys,
  //           });
  //         })
  //         .then(function() {
  //           return showSession();
  //         })
  //         .then(resolve)
  //         .catch(function(e) {
  //           error(e.stack);
  //           reject(e);
  //         });
  //       });
  //     };

  //     $scope.restored = function(session) {
  //       chrome.runtime.sendMessage(
  //         { event: 'restore', session: angular.copy(session) });
  //     };
  // }]);

  // optionModule.controller('changeHistoryController',
  //   ['$scope', '$http', function($scope, $http) {
  //   $scope.changed = [];

  //   $http.get(changeHistory)
  //   .success(function(data) {
  //     let lists   = data.split('\n');
  //     let text    = null;
  //     let dateVer = null;
  //     let items   = [];
  //     let changed = [];
  //     for (let i of lists) {
  //       text = jQuery.trim(i);
  //       if (text.length === 0) {
  //         continue;
  //       }

  //       let tMatch = text.match(/^(\d+)\/(\d+)\/(\d+)(.*)/);
  //       if (tMatch !== null) {
  //         if (angular.isString(dateVer) && items.length > 0) {
  //           changed.push({ dateVer: dateVer, items: items });
  //           dateVer = null;
  //           items = [];
  //         }

  //         switch ($scope.currentLocale) {
  //         case 'en':
  //         case 'en-US': // United State
  //           dateVer =
  //              tMatch[2] + '/' + tMatch[3] + '/' + tMatch[1] + tMatch[4];
  //           break;
  //         default: // include Japan.
  //           dateVer = text;
  //           break;
  //         }
  //       } else {
  //         items.push(text);
  //       }
  //     }
  //     $scope.changed = changed;
  //   })
  //   .error(function(e){
  //     error(e.stack);
  //   });
  // }]);

  // optionModule.controller('storageController',
  //   ['$scope', '$document', function($scope, $document) {
  //   let status = $document.find('#status');
  //   let statusSync = $document.find('#status_sync');
  //   let configStatus = $document.find('#config_view_status');
  //   let configView = $document.find('#config_view');

  //   $scope.$watchCollection('options', function(newValues, oldValues) {
  //     debug('options was changed.', newValues, oldValues);
  //   });

  //   $scope.save = function() {
  //     return new Promise(function(resolve, reject) {
  //       chrome.storage.local.set($scope.options, function() {
  //         chrome.runtime.sendMessage({ event: 'initialize' });

  //         updateMessage(status, 'saved.')
  //         .then(resolve)
  //         .catch(reject);
  //       });
  //     });
  //   };
  //   $scope.load = function() {
  //     return new Promise(function(resolve, reject) {
  //       loadFunc(chrome.storage.local)
  //       .then(function() {
  //         updateMessage(status, 'loaded.')
  //         .then(resolve)
  //         .catch(reject);
  //       });
  //     });
  //   };
  //   $scope.init = function() {
  //     return new Promise(function(resolve, reject) {
  //       angular.copy(defaultValues, $scope.$parent.options);
  //       updateMessage(status, 'initialized.')
  //       .then(resolve)
  //       .catch(reject);
  //     });
  //   };
  //   $scope.syncSave = function() {
  //     return new Promise(function(resolve, reject) {
  //       chrome.storage.sync.set($scope.options, function() {
  //         if (chrome.runtime.lastError) {
  //           error(chrome.runtime.lastError.message);
  //           reject(chrome.runtime.lastError);
  //           return;
  //         }

  //         updateMessage(statusSync, 'saved.')
  //         .then(resolve)
  //         .catch(reject);
  //       });
  //     });
  //   };
  //   $scope.syncLoad = function() {
  //     return new Promise(function(resolve, reject) {
  //       loadFunc(chrome.storage.sync)
  //       .then(function() {
  //         return updateMessage(statusSync, 'loaded.');
  //       })
  //       .then(resolve)
  //       .catch(reject);
  //     });
  //   };
  //   $scope.export = function() {
  //     return new Promise(function(resolve, reject) {
  //       let exportOptions = angular.copy($scope.options);
  //       delete exportOptions[versionKey];
  //       delete exportOptions[previousSessionTimeKey];
  //       configView.val(angular.toJson(exportOptions, true));

  //       updateMessage(configStatus, 'exported.')
  //       .then(resolve)
  //       .catch(reject);
  //     });
  //   };
  //   $scope.import = function() {
  //     return new Promise(function(resolve, reject) {
  //       angular.copy(
  //         angular.fromJson(configView.val()), $scope.$parent.options);

  //       updateMessage(configStatus, 'imported.')
  //       .then(resolve)
  //       .catch(reject);
  //     });
  //   };
  //   function getStorage(storageType) {
  //     return new Promise(function(resolve, reject) {
  //       storageType.get(null, function(items) {
  //         if (chrome.runtime.lastError) {
  //           error(chrome.runtime.lastError.message);
  //           reject(chrome.runtime.lastError);
  //           return;
  //         }

  //         let options = {};
  //         for (let key in defaultValues) {
  //           if (defaultValues.hasOwnProperty(key)) {
  //             options[key] = items.hasOwnProperty(key) ?
  //                               items[key] : defaultValues[key];
  //           }
  //         }
  //         resolve(options);
  //       });
  //     });
  //   }
  //   function loadFunc(storageType) {
  //     return new Promise(function(resolve, reject) {
  //       getStorage(storageType)
  //       .then(function(items) {
  //         $scope.$apply(function() {
  //           $scope.$parent.options = items;
  //           resolve();
  //         });
  //       })
  //       .catch(reject);
  //     });
  //   }
  //   function updateMessage(element, message) {
  //     return new Promise(function(resolve) {
  //       element.text(message);
  //       setTimeout(function() {
  //         element.text('');
  //         resolve();
  //       }, 1000);
  //     });
  //   }

  //   // initialize.
  //   $scope.load();
  // }]);

  // optionModule.controller('RegexToolController',
  //   ['$scope', '$sce', function($scope, $sce) {
  //   $scope.regex = [
  //     {
  //       translationName: 'regex_reference',
  //       reference: [
  //         [
  //           { word: '[abc]',    translationName : 'regex_single' },
  //           { word: '.',        translationName : 'regex_any_single' },
  //           { word: '(...)',    translationName : 'regex_capture' },
  //         ],
  //         [
  //           { word: '[^abc]',   translationName : 'regex_any_except' },
  //           { word: '\\s',      translationName : 'regex_whitespace' },
  //           { word: '(a|b)',    translationName : 'regex_or' },
  //         ],
  //         [
  //           { word: '[a-z]',    translationName : 'regex_range' },
  //           { word: '\\S',      translationName : 'regex_non_whitespace' },
  //           { word: 'a?',       translationName : 'regex_zero_one' },
  //         ],
  //         [
  //           { word: '[a-zA-Z]', translationName : 'regex_range_or' },
  //           { word: '\\d',      translationName : 'regex_digit' },
  //           { word: 'a*',       translationName : 'regex_zero_more' },
  //         ],
  //         [
  //           { word: '^',        translationName : 'regex_start' },
  //           { word: '\\D',      translationName : 'regex_non_digit' },
  //           { word: 'a+',       translationName : 'regex_one_more' },
  //         ],
  //         [
  //           { word: '$',        translationName : 'regex_end' },
  //           { word: '\\w',      translationName : 'regex_word' },
  //           { word: 'a{3}',     translationName : 'regex_exactly' },
  //         ],
  //         [
  //           { word: '\\W',      translationName : 'regex_non_word' },
  //           { word: 'a{3,}',    translationName : 'regex_three_or_more' },
  //           { word: '\\b',      translationName : 'regex_word_boundary' },
  //         ],
  //         [
  //           { word: 'a{3,6}',   translationName : 'regex_between' },
  //         ],
  //       ],
  //     },
  //   ];
  //   $scope.$watch('regex.word', function(newValue, oldValue) {
  //     debug('regex.word is changed.', newValue, oldValue);
  //     regexCheck();
  //   });
  //   $scope.$watch('regex.option', function(newValue, oldValue) {
  //     debug('regex.option is changed.', newValue, oldValue);
  //     regexCheck();
  //   });
  //   $scope.$watch('regex.target', function(newValue, oldValue) {
  //     debug('regex.target is changed.', newValue, oldValue);
  //     regexCheck();
  //   });

  //   function replacer(str) {
  //     return '<span style="background: red;">' + str + '</span>';
  //   }

  //   function regexCheck() {
  //     let splitedTargets;
  //     let regex;
  //     try {
  //       splitedTargets = $scope.regex.target.split('\n');
  //       regex = new RegExp(
  //         $scope.regex.word, $scope.regex.option === true ? 'i' : '');
  //     } catch (e) {
  //       error('regexCheck is error. so this process is skipped.');
  //       return;
  //     }

  //     let resultHTML = '';
  //     splitedTargets.forEach(function(v) {
  //       resultHTML += v.replace(regex, replacer) + '<br>';
  //     });
  //     $scope.regex.result = $sce.trustAsHtml(resultHTML);
  //   }
  // }]);
}(this, this.document));
