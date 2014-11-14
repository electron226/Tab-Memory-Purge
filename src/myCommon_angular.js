(function(window) {
  "use strict";

  window.commonModule = window.commonModule ||
                        window.angular.module('myCommons', []);
  window.commonModule.directive('translation',
    ['$http', function($http) {
      return {
        link: function(scope, element, attrs) {
          $http.get(translationPath, { cache: true })
          .success(function(data) {
            if (data.hasOwnProperty(attrs.translation)) {
              for (var i = 0, len = element.length; i < len; i++) {
                element[i].textContent =
                  chrome.i18n.getMessage(attrs.translation);
              }
            }
          })
          .error(function(data, status, headers, config){
            console.debug(data, status, headers, config);
          });
        }
      };
    }]);
})(window);
