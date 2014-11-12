(function() {
  'use strict';

  var optionModule = angular.module('options', ['ngSanitize', 'myCommons']);
  optionModule.controller('OptionController',
    ['$scope', '$http', '$document', function($scope, $http, $document) {
    $scope.options = angular.copy(defaultValues);

    var regTool = $document.find(
      '[ng-controller="RegexToolController"]');
    $scope.showRegexTool = function() {
      regTool.toggleClass('show');
    };

    // select menu.
    $scope.selectMenu = '';
    $scope.menuItems = optionMenus;
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
          console.error('The name of arguments of commonFunc is length zero.');
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
    var historyList = $document.find('#historyList');
    var footer = $document.find('footer');
    $scope.$watch('selectMenu', function(newValue, oldValue) {
      console.debug('selectMenu was changed. on OptionController.',
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
        if (newValue === 'history') {
          historyList.show();
        } else {
          historyList.hide();
        }
      }
    });

    $scope.menuSelect = function($event) {
      $scope.selectMenu = angular.element(
        $event.target).attr('translation').trim();
    };

    $document.ready(function(){
      $scope.menuItems.forEach(function(value) {
        menu.disable(value.name);
      });

      chrome.runtime.sendMessage(
        { event: 'display_option_page' }, function(response) {
        $scope.$apply(function() {
          $scope.selectMenu = $scope.menuItems[response ? response : 0].name;
        });
      });
    });

    chrome.runtime.onMessage.addListener(function(message) {
      if (message.event === 'contextMenus') {
        $scope.$apply(function() {
          $scope.selectMenu = $scope.menuItems[message.target].name;
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
      console.debug('keybind was changed.', newValue, oldValue);
      if (angular.isObject(newValue)) {
        var pressKeys = section.find('input[type="text"].pressKey');
        var keyDatas = section.find('input[type="text"].keydata');
        if (pressKeys.length === 0 && keyDatas.length === 0) {
          console.error('option.keybind is watching error.' +
                        ' pressKeys or keyDatas are zero.');
          return;
        }
        if (pressKeys.length !== keyDatas.length) {
          console.error('option.keybind is watching error.' +
                        ' pressKeys and keyDatas are not equal.');
          return;
        }

        var obj = null;
        var className = null;
        for (var i = 0, len = pressKeys.length ; i < len; i++) {
          className = pressKeys[i].parentNode.parentNode.className;
          obj = angular.fromJson(newValue[className]);
          if (jQuery.isEmptyObject(obj)) {
            pressKeys[i].value = '';
          } else {
            pressKeys[i].value = generateKeyString(obj);
          }
          keyDatas[i].value = newValue[className];
        }
      }
    });

    $scope.setBind = function($event) {
      $scope.start = angular.element($event.target.parentNode.parentNode)[0];
    };

    $scope.clearBind = function($event) {
      var keyBinds = angular.copy($scope.options.keybind);
      keyBinds[$event.target.parentNode.parentNode.className] = '{}';
      $scope.options.keybind = keyBinds;
    };

    $document.keyup(function(event) {
      if (angular.isObject($scope.start)) {
        var keyBinds = angular.copy($scope.options.keybind);
        keyBinds[$scope.start.className] = angular.toJson(keyCheck(event));
        $scope.$apply(function() {
          $scope.options.keybind = keyBinds;
        });

        $scope.start = null;
      }
    });

    angular.forEach($scope.options.keybind, function(value, key) {
      $scope.keys.push({ name: key, value: value });
    });
  }]);

  optionModule.controller('historyController',
    ['$scope', '$location', '$anchorScroll',
      function($scope, $location, $anchorScroll) {
    $scope.history = [];
    $scope.jump = function($index) {
      $location.hash('history' + $index);
      $anchorScroll();
    };

    var showHistory = function(optionHistories) {
      console.debug('showHistory');
      var histories = [];
      for (var key in optionHistories) {
        histories.push({
          date: new Date(parseInt(key, 10)), history: optionHistories[key] });
      }
      $scope.history = histories;
    };

    var firstFlag = true;
    var showFlag = false;
    $scope.$watch('selectMenu', function(newValue) {
      console.debug('selectMenu was changed on historyController.');
      showFlag = (newValue === 'history') ? true : false;
      if (firstFlag && showFlag) {
        showHistory($scope.options.history);
        firstFlag = false;
      }
    });

    $scope.$watchCollection('options.history', function(newValues, oldValues) {
      console.debug('option.history was changed.', newValues, oldValues);
      if (showFlag) {
        showHistory(newValues);
      }
    });
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
    .error(function(){
      console.error('changed history do not get.');
    });
  }]);

  optionModule.controller('storageController',
    ['$scope', '$document', function($scope, $document) {
    var status = $document.find('#status');
    var statusSync = $document.find('#status_sync');
    var configStatus = $document.find('#config_view_status');
    var configView = $document.find('#config_view');

    $scope.$watchCollection('options', function(newValues, oldValues) {
      console.debug('options was changed.', newValues, oldValues);
    });

    $scope.save = function() {
      chrome.storage.local.set($scope.options, function() {
        chrome.runtime.sendMessage({ event: 'initialize' });
        updateMessage(status, 'saved.');
      });
    };
    $scope.load = function() {
      loadFunc(chrome.storage.local, function() {
        updateMessage(status, 'loaded.');
      });
    };
    $scope.init = function() {
      angular.copy(defaultValues, $scope.options);
      updateMessage(status, 'initialized.');
    };
    $scope.syncSave = function() {
      chrome.storage.sync.set($scope.options);
      updateMessage(statusSync, 'saved.');
    };
    $scope.syncLoad = function() {
      loadFunc(chrome.storage.sync, function() {
        updateMessage(statusSync, 'loaded.');
      });
    };
    $scope.getStorage = function(storageType, callback) {
      storageType.get(null, function(items) {
        var options = {};
        for (var key in items) {
          if (defaultValues.hasOwnProperty(key)) {
            options[key] = items[key];
          }
        }
        (callback || angular.noop)(options);
      });
    };
    $scope.export = function() {
      var exportOptions = angular.copy($scope.options);
      delete exportOptions.backup;
      delete exportOptions.history;
      configView.value = angular.toJson(exportOptions, true);
      updateMessage(configStatus, 'exported.');
    };
    $scope.import = function() {
      angular.copy(angular.fromJson(configView.value), $scope.options);
      updateMessage(configStatus, 'imported.');
    };
    function loadFunc(storageType, callback) {
      $scope.getStorage(storageType, function(items) {
        $scope.$apply(function () {
          angular.copy(items, $scope.options);
          (callback || angular.noop)(items);
        });
      });
    }
    function updateMessage(element, message) {
      element.text(message);
      setTimeout(function() {
        element.text('');
      }, 1000);
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
      console.debug('regex.word is changed.', newValue, oldValue);
      regexCheck();
    });
    $scope.$watch('regex.option', function(newValue, oldValue) {
      console.debug('regex.option is changed.', newValue, oldValue);
      regexCheck();
    });
    $scope.$watch('regex.target', function(newValue, oldValue) {
      console.debug('regex.target is changed.', newValue, oldValue);
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
        console.error('regexCheck is error. so this process is skipped.');
        return;
      }

      var resultHTML = '';
      for (var i = 0, len = splitedTargets.length; i < len; i++) {
        resultHTML += splitedTargets[i].replace(regex, replacer) + '<br>';
      }
      $scope.regex.result = $sce.trustAsHtml(resultHTML);
    }
  }]);
})();
