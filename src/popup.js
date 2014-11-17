(function() {
  "use strict";

  var popupModule = angular.module('popup', ['myCommons']);
  popupModule.controller('popupController',
    ['$scope', function($scope) {
    $scope.commands = [
      { name: "release", state: true },
      { name: "not_release", state: true },
      { name: "remove_not_release", state: true },
      { name: "all_purge", state: true },
      { name: "all_purge_without_exclude_list", state: true },
      { name: "all_unpurge", state: true },
    ];

    $scope.clicked = function(name) {
      window.close();
      switch (name) {
        case 'not_release':
        case 'remove_not_release':
          chrome.runtime.sendMessage({ event: 'switch_not_release' });
          break;
        default:
          chrome.runtime.sendMessage({ event: name });
          break;
      }
    };

    chrome.runtime.sendMessage({ event: 'current_icon' }, function(iconValue) {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.messsage);
        return;
      }

      $scope.$apply(function() {
        if (iconValue === TEMP_EXCLUDE) {
          $scope.commands[1].state = false; // not_release
          $scope.commands[2].state = true; // remove_not_release
        } else {
          $scope.commands[1].state = true; // not_release
          $scope.commands[2].state = false; // remove_not_release
        }
      });
    });
  }]);
})(document);
