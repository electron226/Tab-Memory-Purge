(function(document) {
  'use strict';

  var optionModule = angular.module('options', ['ngSanitize', 'myCommons']);
  optionModule.controller('OptionController', function($scope, $http, $document) {
    $scope.options = angular.copy(defaultValues);

    var clicked = false;
    function getTransform(height)
    {
      return (clicked) ? 'translate(0px, ' + height + ')'
                       : 'translate(0px, -' + height+ ')';
    }

    var sizeY = '400px';
    var regTool = angular.element($document).find(
      '[ng-controller="RegexToolController"]');
    $scope.showRegexTool = function() {
      regTool[0].style.transform = getTransform(sizeY);
      clicked = !clicked;
    };

    // select menu.
    $scope.menu = {
      menuElement: angular.element(document.getElementById('config_change')),
      barName: 'change_bar',
      items: [
        { 'name': 'option' },
        { 'name': 'keybind' },
        { 'name': 'history' },
        { 'name': 'change_history' },
        { 'name': 'information' },
      ],
      select: '',
      enable: function(name) {
        this.commonFunc(name, 'inline', 'black');
      },
      disable: function(name) {
        this.commonFunc(name, 'none', 'lightgray');
      },
      commonFunc: function(name, displayType, color) {
        if (name.length === 0) {
          console.error('The name of arguments of commonFunc is length zero.');
          return;
        }

        var t = this.menuElement.find('.' + name);
        if (t.length !== 0) {
          t.find('.' + this.barName).css('display', displayType);
          t.find('[translation="' + name + '"]').css('color', color);
        }
      },
    };

    var pageElement = angular.element(document.getElementById('option_items'))
                      .children('section');
    var historyList = document.getElementById('historyList');
    var footer = document.querySelector('footer');
    $scope.$watch('menu.select', function(newValue, oldValue) {
      console.debug('menu.select was changed. on OptionController.');
      if (angular.isString(newValue) && angular.isString(oldValue)) {
        $scope.menu.disable(oldValue);
        $scope.menu.enable(newValue);

        angular.forEach(pageElement, function(value, _) {
          var className = value.className.replace(/ng-scope/, '').trim();
          value.style.display = (newValue === className) ? 'block' : 'none';
        });

        footer.style.display =
          (newValue === 'option' || newValue === 'keybind') ? 'block' : 'none';
        historyList.style.display = (newValue === 'history') ? 'block' : 'none';
      }
    });

    $scope.menuSelect = function($event) {
      $scope.menu.select = angular.element($event.target)
                           .attr('translation').trim();
    };

    $(document).ready(function(){
      $scope.menu.items.forEach(function(value, _) {
        $scope.menu.disable(value.name);
      });
      $scope.menu.select = $scope.menu.items[0].name;
    });
  });

  optionModule.controller('keybindController', function($scope, $document) {
    $scope.keys = [];
    $scope.start = null;

    var section = $document.find('[ng-controller="keybindController"]');
    console.log(section[0]);
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
        for (var i = 0; i < pressKeys.length; i++) {
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
      $scope.start = angular.element($event.target.parentNode.parentNode);
    };

    $scope.clearBind = function($event) {
      var keyBinds = angular.copy($scope.options.keybind);
      keyBinds[$event.target.parentNode.parentNode.className] = '{}';
      $scope.options.keybind = keyBinds;
    };

    $document.keyup(function(event) {
      if (angular.isObject($scope.start)) {
        var keyBinds = angular.copy($scope.options.keybind);
        keyBinds[$scope.start[0].className] = angular.toJson(keyCheck(event));
        $scope.$apply(function() {
          $scope.options.keybind = keyBinds;
        });

        $scope.start = null;
      }
    });

    angular.forEach($scope.options.keybind, function(value, key) {
      $scope.keys.push({ name: key, value: value });
    });
  });

  optionModule.controller('historyController', function($scope, $location, $anchorScroll) {
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
    $scope.$watch('menu.select', function(newValue, oldValue) {
      console.debug('menu.select was changed on historyController.');
      showFlag = (newValue === 'history') ? true : false;
      if (showFlag && firstFlag) {
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
  });

  optionModule.controller('changeHistoryController', function($scope, $http) {
    $scope.changed = [];

    $http.get(changeHistory)
    .success(function(data) {
      var lists = data.split('\n');
      var text = null;
      var dateVer = null;
      var items = [];
      for (var i = 0; i < lists.length; i++) {
        text = jQuery.trim(lists[i]);
        if (text.length === 0) {
          continue;
        }

        if (text.match(/^\d+\/\d+\/\d+/) !== null) {
          if (angular.isString(dateVer) && items.length > 0) {
            $scope.changed.push({ dateVer: dateVer, items: items });
            dateVer = null;
            items = [];
          }

          dateVer = text;
        } else {
          items.push(text);
        }
      }
    })
    .error(function(data, status, headers, config){
      console.error('changed history do not get.');
    });
  });

  optionModule.controller('storageController', function($scope) {
    var status = document.getElementById('status');
    var statusSync = document.getElementById('status_sync');
    var configStatus = document.getElementById('config_view_status');
    var configView = document.getElementById('config_view');

    $scope.$watchCollection('options', function(newValues, oldValues) {
      console.debug('options was changed.', newValues, oldValues);
    });

    $scope.save = function() {
      chrome.storage.local.set($scope.options);
      $scope.updateMessage(status, 'saved.');
    };
    $scope.load = function() {
      $scope.loadFunc(chrome.storage.local, function() {
        $scope.updateMessage(status, 'loaded.');
      });
    };
    $scope.init = function() {
      angular.copy(defaultValues, $scope.options);
      $scope.updateMessage(status, 'initialized.');
    };
    $scope.syncSave = function() {
      chrome.storage.sync.set($scope.options);
      $scope.updateMessage(statusSync, 'saved.');
    };
    $scope.syncLoad = function() {
      $scope.loadFunc(chrome.storage.sync, function() {
        $scope.updateMessage(statusSync, 'loaded.');
      });
    };
    $scope.loadFunc = function(storageType, callback) {
      $scope.getStorage(storageType, function(items) {
        $scope.$apply(function () {
          angular.copy(items, $scope.options);
          (callback || angular.noop)(options);
        });
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
      $scope.updateMessage(configStatus, 'exported.');
    };
    $scope.import = function() {
      angular.copy(angular.fromJson(configView.value), $scope.options);
      $scope.updateMessage(configStatus, 'imported.');
    };
    $scope.updateMessage = function(element, message) {
      element.innerText = message;
      setTimeout(function() {
        element.textContent = '';
      }, 1000);
    };

    // initialize.
    $scope.load();
  });
  optionModule.controller('RegexToolController', function($scope, $sce) {
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
      $scope.regexCheck();
    });
    $scope.$watch('regex.option', function(newValue, oldValue) {
      console.debug('regex.option is changed.', newValue, oldValue);
      $scope.regexCheck();
    });
    $scope.$watch('regex.target', function(newValue, oldValue) {
      console.debug('regex.target is changed.', newValue, oldValue);
      $scope.regexCheck();
    });

    function replacer(str) {
      return '<span style="background: red;">' + str + '</span>';
    };

    $scope.regexCheck = function() {
      try {
        var splitedTargets = $scope.regex.target.split('\n');
        var regex = new RegExp(
          $scope.regex.word, $scope.regex.option === true ? 'i' : '');
      } catch (e) {
        console.error('regexCheck is error. so this process is skipped.');
        return;
      }

      var resultHTML = '';
      for (var i = 0; i < splitedTargets.length; i++) {
        resultHTML += splitedTargets[i].replace(regex, replacer) + '<br>';
      }
      $scope.regex.result = $sce.trustAsHtml(resultHTML);
    };
  });
})(document);
