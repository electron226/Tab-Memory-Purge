(function() {
  'use strict';

  var optionModule = angular.module('options', ['myCommons']);
  optionModule.config(['$compileProvider', function($compileProvider){
    var urlRegex =
    /^\s*(data|https?|ftp|mailto|file|chrome-extension|blob:chrome-extension):/;
    $compileProvider.aHrefSanitizationWhitelist(urlRegex);
    $compileProvider.imgSrcSanitizationWhitelist(urlRegex);
  }]);
  optionModule.controller('OptionController',
    ['$scope', '$http', '$document', function($scope, $http, $document) {
    $scope.options = angular.copy(defaultValues);
    $scope.currentLocale = chrome.i18n.getUILanguage();
    $scope.previousSessionTime = null;

    $scope.db = new Database(dbName, dbVersion);
    $scope.db.open(dbCreateStores);

    var regTool = $document.find(
      '[ng-controller="RegexToolController"]');
    $scope.showRegexTool = function() {
      regTool.toggleClass('show');
    };

    // select menu.
    $scope.selectMenu = '';
    $scope.menuItems = angular.copy(optionMenus);
    var menu = {
      menuElement: $document.find('#config_change'),
      barName: 'change_bar',
      enable: function(name) {
        this.commonFunc(name, true, 'black');
      },
      disable: function(name) {
        this.commonFunc(name, false, 'lightgray');
      },
      commonFunc: function(name, show, color) {
        if (name.length === 0) {
          error('The name of arguments of commonFunc is length zero.');
          return;
        }

        var t = this.menuElement.find('.' + name);
        if (t.length !== 0) {
          var bar = t.find('.' + this.barName);
          (show) ? bar.show() : bar.hide();
          t.find('[translation="' + name + '"]').css('color', color);
        }
      },
    };

    var pageElement = $document.find('#option_items').children('section');
    var footer = $document.find('footer');
    $scope.$watch('selectMenu', function(newValue, oldValue) {
      debug('selectMenu was changed. on OptionController.',
        newValue, oldValue);
      if (angular.isString(newValue) && angular.isString(oldValue)) {
        menu.disable(oldValue);
        menu.enable(newValue);

        pageElement.each(function(index, element) {
          var el = angular.element(element);
          var className = el.attr('class').replace(/ng-scope/, '').trim();
          if (newValue === className) {
            el.show();
          } else {
            el.hide();
          }
        });

        if (newValue === 'option' || newValue === 'keybind') {
          footer.show();
        } else {
          footer.hide();
        }
      }
    });

    $scope.menuSelect = function($event) {
      $scope.selectMenu = angular.element(
        $event.target).attr('translation').trim();

      if ($scope.showRestoreMessage) {
        $scope.showRestoreMessage = false;
      }
    };

    $document.ready(function(){
      $scope.menuItems.forEach(function(value) {
        menu.disable(value.name);
      });

      chrome.runtime.sendMessage(
        { event: 'display_option_page' }, function(response) {
        $scope.$apply(function() {
          if (response === 'updated') {
            $scope.showRestoreMessage =
              $scope.options.when_updated_restore_session ? false : true;
            response = 4; // 4 == changed history.
            $scope.previousSessionTime = $scope.options[previousSessionTimeKey];
          }
          $scope.selectMenu = $scope.menuItems[response ? response : 0].name;
        });
      });
    });

    chrome.runtime.onMessage.addListener(function(message) {
      if (message.event === 'contextMenus') {
        $scope.$apply(function() {
          $scope.selectMenu = $scope.menuItems[message.index].name;
        });
      }
    });
  }]);

  optionModule.controller('keybindController',
    ['$scope', '$document', function($scope, $document) {
    $scope.keys = [];
    $scope.start = null;

    var section = $document.find('[ng-controller="keybindController"]');
    $scope.$watch('options.keybind', function(newValue, oldValue) {
      debug('keybind was changed.', newValue, oldValue);
      if (angular.isObject(newValue)) {
        var pressKeys = section.find('input[type="text"].pressKey');
        if (pressKeys.length === 0) {
          error('option.keybind is watching error. pressKeys is zero.');
          return;
        }

        var obj = null;
        var className = null;
        for (var i = 0, len = pressKeys.length; i < len; i++) {
          className = pressKeys[i].parentNode.parentNode.className;
          obj = angular.fromJson(newValue[className]);
          pressKeys[i].value = jQuery.isEmptyObject(obj) ?
                               '' : generateKeyString(obj);
        }
      }
    });

    $scope.setBind = function($event) {
      $scope.start = angular.element($event.target.parentNode.parentNode)[0];
    };

    $scope.clearBind = function($event) {
      var keyBinds = angular.copy($scope.options.keybind);
      keyBinds[$event.target.parentNode.parentNode.className] = '{}';
      $scope.$parent.options.keybind = keyBinds;
    };

    $document.keyup(function(event) {
      if (angular.isObject($scope.start)) {
        var keyBinds = angular.copy($scope.options.keybind);
        keyBinds[$scope.start.className] = angular.toJson(keyCheck(event));
        $scope.$apply(function() {
          $scope.$parent.options.keybind = keyBinds;
        });

        $scope.start = null;
      }
    });

    angular.forEach($scope.options.keybind, function(value, key) {
      $scope.keys.push({ name: key, value: value });
    });
  }]);

  optionModule.controller('historyController', ['$scope', function($scope) {
    $scope.history = [];
    $scope.selectHistory = '';
    var searchDate = null;

    $scope.$watch('selectHistory', function(newValue) {
      debug('selectHistory was changed on historyController.', newValue);
      if (angular.isUndefined(newValue) || newValue === null) {
        searchDate = null;
        return;
      }

      searchDate = newValue;
    });

    $scope.showDate = function(date) {
      if (angular.isDate(searchDate)) {
        return (date.getTime() === searchDate.getTime()) ? true : false;
      } else {
        return true;
      }
    };

    var showHistory = function() {
      return new Promise(function(resolve, reject) {
        var p = [];
        p.push( $scope.db.getAll({ name: dbHistoryName }) );
        p.push( $scope.db.getAll({ name: dbPageInfoName }) );
        p.push( $scope.db.getAll({ name: dbDataURIName }) );

        Promise.all(p)
        .then(function(results) {
          return new Promise(function(resolve2) {
            var histories = results[0];
            var pageInfos = results[1];
            var dataURIs = results[2];

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
                date    : v.date,
                url     : v.url,
                title   : page.title,
                host    : page.host,
                dataURI : dataURIDict[page.host] || icons[NORMAL_EXCLUDE],
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

            resolve2(showList);
          });
        })
        .then(function(showList) {
          $scope.$apply(function() {
            $scope.history = showList;
            resolve();
          });
        })
        .catch(function(e) {
          error(e.stack);
          reject(e);
        });
      });
    };

    $scope.reloadHistory = showHistory;

    $scope.deleteHistory = function(date) {
      return new Promise(function(resolve, reject) {
        var begin = new Date(
          date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
        var end = new Date(
          date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
        $scope.db.getCursor({
          name: dbHistoryName,
          range: IDBKeyRange.bound(begin.getTime(), end.getTime()),
        })
        .then(function(histories) {
          var delKeys = histories.map(function(v) {
            return v.date;
          });
          return $scope.db.delete({
            name: dbHistoryName,
            keys: delKeys,
          });
        })
        .then(showHistory)
        .then(resolve)
        .catch(function(e) {
          error(e.stack);
          reject(e);
        });
      });
    };

    $scope.deleteHistoryItem = function(date) {
      return new Promise(function(resolve, reject) {
        $scope.db.delete({
          name: dbHistoryName,
          keys: date,
        })
        .then(showHistory)
        .then(resolve)
        .catch(function(e) {
          error(e.stack);
          reject(e);
        });
      });
    };

    var firstFlag = true;
    var showFlag = false;
    $scope.$watch('selectMenu', function(newValue) {
      debug('selectMenu was changed on historyController.');
      showFlag = (newValue === 'history') ? true : false;
      if (firstFlag && showFlag) {
        showHistory();
        firstFlag = false;
      }
    });
  }]);

  optionModule.controller('sessionHistoryController',
    ['$scope', function($scope) {
      $scope.sessionHistory = [];
      $scope.savedSessionHistory = [];
      $scope.displaySavedSession = null;
      $scope.currentSessionTime = null;

      var showSavedSession = function() {
        return new Promise(function(resolve, reject) {
          loadSession($scope.db, dbSavedSessionName)
          .then(function(showList) {
            $scope.$apply(function() {
              $scope.savedSessionHistory = showList;
              resolve();
            });
          })
          .catch(function(e) {
            error(e.stack);
            reject(e);
          });
        });
      };

      var showSession = function() {
        return new Promise(function(resolve, reject) {
          var p = [];
          p.push(
            new Promise(function(resolve2, reject2) {
              chrome.runtime.sendMessage(
                { event: 'current_session' }, function(currentSessionTime) {
                  if (chrome.runtime.lastError) {
                    reject2(chrome.runtime.lastError);
                    return;
                  }
                  resolve2(currentSessionTime);
              });
            })
          );
          p.push( loadSession($scope.db, dbSessionName) );

          Promise.all(p).then(function(results) {
            var currentSessionTime = results[0];
            var showSessionList = results[1];

            $scope.$apply(function() {
              $scope.currentSessionTime = currentSessionTime;
              $scope.sessionHistory = showSessionList;
              resolve();
            });
          })
          .catch(function(e) {
            error(e.stack);
            reject(e);
          });
        });
      };

      $scope.reloadSession = showSession;

      var firstFlag = true;
      var showFlag = false;
      $scope.$watch('selectMenu', function(newValue) {
        debug('selectMenu was changed on historyController.');
        showFlag = (newValue === 'session_history') ? true : false;
        if (firstFlag && showFlag) {
          showSession();
          showSavedSession();
          firstFlag = false;
        }
      });

      $scope.savedSessionClicked = function(session) {
        $scope.displaySavedSession = session.data;
      };

      $scope.deleteSavedSession = function(session) {
        return new Promise(function(resolve, reject) {
          if (session === void 0 || session === null || session.length === 0) {
            reject();
            return;
          }

          $scope.db.getCursor({
            name: dbSavedSessionName,
            range: IDBKeyRange.only(session[0].date),
            indexName: 'date',
          })
          .then(function(sessions) {
            var delKeys = sessions.map(function(v) {
              return v.id;
            });

            return $scope.db.delete({
              name: dbSavedSessionName,
              keys: delKeys,
            });
          })
          .then(function() {
            $scope.displaySavedSession = null;
            return showSavedSession();
          })
          .then(resolve)
          .catch(function(e) {
            error(e.stack);
            reject();
          });
        });
      };

      $scope.deleteSavedSpecificSession = function(sessions, id) {
        return new Promise(function(resolve, reject) {
          $scope.db.delete({
            name: dbSavedSessionName,
            keys: id,
          })
          .then(function() {
            return new Promise(function(resolve2) {
              var newSessions = sessions.filter(function(v) {
                return v.id !== id;
              });
              $scope.displaySavedSession = newSessions;
              resolve2();
            });
          })
          .then(function() {
            return showSavedSession();
          })
          .then(resolve)
          .catch(reject);
        });
      };

      $scope.deleteSpecificSession = function(sessions, id) {
        debug(sessions, id);
        return new Promise(function(resolve, reject) {
          $scope.db.delete({
            name: dbSessionName,
            keys: id,
          })
          .then(function() {
            return showSession();
          })
          .then(resolve)
          .catch(reject);
        });
      };

      $scope.saved = function(session) {
        return new Promise(function(resolve, reject) {
          $scope.db.getCursor({
            name      : dbSessionName,
            range     : IDBKeyRange.only(session.date),
            indexName : 'date',
          })
          .then(function(histories) {
            return $scope.db.put({
              name: dbSavedSessionName,
              data: histories,
            });
          })
          .then(function() {
            return showSavedSession();
          })
          .then(resolve)
          .catch(function(e) {
            error(e.stack);
            reject();
          });
        });
      };

      $scope.deleted = function(session) {
        return new Promise(function(resolve, reject) {
          $scope.db.getCursor({
            name: dbSessionName,
            range: IDBKeyRange.only(session.date),
            indexName: 'date',
          })
          .then(function(targetSessions) {
            var delKeys = targetSessions.map(function(v) {
              return v.id;
            });
            return $scope.db.delete({
              name: dbSessionName,
              keys: delKeys,
            });
          })
          .then(function() {
            return showSession();
          })
          .then(resolve)
          .catch(function(e) {
            error(e.stack);
            reject(e);
          });
        });
      };

      $scope.restored = function(session) {
        chrome.runtime.sendMessage(
          { event: 'restore', session: angular.copy(session) });
      };
  }]);

  optionModule.controller('changeHistoryController',
    ['$scope', '$http', function($scope, $http) {
    $scope.changed = [];

    $http.get(changeHistory)
    .success(function(data) {
      var lists = data.split('\n');
      var text = null;
      var dateVer = null;
      var items = [];
      var changed = [];
      for (var i = 0, len = lists.length; i < len; i++) {
        text = jQuery.trim(lists[i]);
        if (text.length === 0) {
          continue;
        }

        if (text.match(/^\d+\/\d+\/\d+/) !== null) {
          if (angular.isString(dateVer) && items.length > 0) {
            changed.push({ dateVer: dateVer, items: items });
            dateVer = null;
            items = [];
          }

          dateVer = text;
        } else {
          items.push(text);
        }
      }
      $scope.changed = changed;
    })
    .error(function(e){
      error(e.stack);
    });
  }]);

  optionModule.controller('storageController',
    ['$scope', '$document', function($scope, $document) {
    var status = $document.find('#status');
    var statusSync = $document.find('#status_sync');
    var configStatus = $document.find('#config_view_status');
    var configView = $document.find('#config_view');

    $scope.$watchCollection('options', function(newValues, oldValues) {
      debug('options was changed.', newValues, oldValues);
    });

    $scope.save = function() {
      return new Promise(function(resolve, reject) {
        chrome.storage.local.set($scope.options, function() {
          chrome.runtime.sendMessage({ event: 'initialize' });

          updateMessage(status, 'saved.')
          .then(resolve)
          .catch(reject);
        });
      });
    };
    $scope.load = function() {
      return new Promise(function(resolve, reject) {
        loadFunc(chrome.storage.local)
        .then(function() {
          updateMessage(status, 'loaded.')
          .then(resolve)
          .catch(reject);
        });
      });
    };
    $scope.init = function() {
      return new Promise(function(resolve, reject) {
        angular.copy(defaultValues, $scope.$parent.options);
        updateMessage(status, 'initialized.')
        .then(resolve)
        .catch(reject);
      });
    };
    $scope.syncSave = function() {
      return new Promise(function(resolve, reject) {
        chrome.storage.sync.set($scope.options, function() {
          if (chrome.runtime.lastError) {
            error(chrome.runtime.lastError.message);
            reject(chrome.runtime.lastError);
            return;
          }

          updateMessage(statusSync, 'saved.')
          .then(resolve)
          .catch(reject);
        });
      });
    };
    $scope.syncLoad = function() {
      return new Promise(function(resolve, reject) {
        loadFunc(chrome.storage.sync)
        .then(function() {
          return updateMessage(statusSync, 'loaded.');
        })
        .then(resolve)
        .catch(reject);
      });
    };
    $scope.export = function() {
      return new Promise(function(resolve, reject) {
        var exportOptions = angular.copy($scope.options);
        delete exportOptions[versionKey];
        delete exportOptions[previousSessionTimeKey];
        configView.val(angular.toJson(exportOptions, true));

        updateMessage(configStatus, 'exported.')
        .then(resolve)
        .catch(reject);
      });
    };
    $scope.import = function() {
      return new Promise(function(resolve, reject) {
        angular.copy(
          angular.fromJson(configView.val()), $scope.$parent.options);

        updateMessage(configStatus, 'imported.')
        .then(resolve)
        .catch(reject);
      });
    };
    function getStorage(storageType) {
      return new Promise(function(resolve, reject) {
        storageType.get(null, function(items) {
          if (chrome.runtime.lastError) {
            error(chrome.runtime.lastError.message);
            reject(chrome.runtime.lastError);
            return;
          }

          var options = {};
          for (var key in defaultValues) {
            if (defaultValues.hasOwnProperty(key)) {
              options[key] = items.hasOwnProperty(key) ?
                                items[key] : defaultValues[key];
            }
          }
          resolve(options);
        });
      });
    }
    function loadFunc(storageType) {
      return new Promise(function(resolve, reject) {
        getStorage(storageType)
        .then(function(items) {
          $scope.$apply(function() {
            $scope.$parent.options = items;
            resolve();
          });
        })
        .catch(reject);
      });
    }
    function updateMessage(element, message) {
      return new Promise(function(resolve) {
        element.text(message);
        setTimeout(function() {
          element.text('');
          resolve();
        }, 1000);
      });
    }

    // initialize.
    $scope.load();
  }]);

  optionModule.controller('RegexToolController',
    ['$scope', '$sce', function($scope, $sce) {
    $scope.regex = [
      {
        translationName: 'regex_reference',
        reference: [
          [
            { word: '[abc]',    translationName : 'regex_single' },
            { word: '.',        translationName : 'regex_any_single' },
            { word: '(...)',    translationName : 'regex_capture' },
          ],
          [
            { word: '[^abc]',   translationName : 'regex_any_except' },
            { word: '\\s',      translationName : 'regex_whitespace' },
            { word: '(a|b)',    translationName : 'regex_or' },
          ],
          [
            { word: '[a-z]',    translationName : 'regex_range' },
            { word: '\\S',      translationName : 'regex_non_whitespace' },
            { word: 'a?',       translationName : 'regex_zero_one' },
          ],
          [
            { word: '[a-zA-Z]', translationName : 'regex_range_or' },
            { word: '\\d',      translationName : 'regex_digit' },
            { word: 'a*',       translationName : 'regex_zero_more' },
          ],
          [
            { word: '^',        translationName : 'regex_start' },
            { word: '\\D',      translationName : 'regex_non_digit' },
            { word: 'a+',       translationName : 'regex_one_more' },
          ],
          [
            { word: '$',        translationName : 'regex_end' },
            { word: '\\w',      translationName : 'regex_word' },
            { word: 'a{3}',     translationName : 'regex_exactly' },
          ],
          [
            { word: '\\W',      translationName : 'regex_non_word' },
            { word: 'a{3,}',    translationName : 'regex_three_or_more' },
            { word: '\\b',      translationName : 'regex_word_boundary' },
          ],
          [
            { word: 'a{3,6}',   translationName : 'regex_between' },
          ],
        ],
      },
    ];
    $scope.$watch('regex.word', function(newValue, oldValue) {
      debug('regex.word is changed.', newValue, oldValue);
      regexCheck();
    });
    $scope.$watch('regex.option', function(newValue, oldValue) {
      debug('regex.option is changed.', newValue, oldValue);
      regexCheck();
    });
    $scope.$watch('regex.target', function(newValue, oldValue) {
      debug('regex.target is changed.', newValue, oldValue);
      regexCheck();
    });

    function replacer(str) {
      return '<span style="background: red;">' + str + '</span>';
    }

    function regexCheck() {
      var splitedTargets;
      var regex;
      try {
        splitedTargets = $scope.regex.target.split('\n');
        regex = new RegExp(
          $scope.regex.word, $scope.regex.option === true ? 'i' : '');
      } catch (e) {
        error('regexCheck is error. so this process is skipped.');
        return;
      }

      var resultHTML = '';
      splitedTargets.forEach(function(v) {
        resultHTML += v.replace(regex, replacer) + '<br>';
      });
      $scope.regex.result = $sce.trustAsHtml(resultHTML);
    }
  }]);
})();
