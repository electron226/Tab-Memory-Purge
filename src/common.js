/*jshint maxlen: 120, unused: false*/
(function(window) {
  "use strict";

  /* Default Values. */
  var defaultValues = {
    'release_page': 'normal',
    'release_url': '',
    'no_release': false,
    'timer': 20,
    'exclude_url':
        '^https://\n' +
        '^http*://(10.\\d{0,3}|172.(1[6-9]|2[0-9]|3[0-1])|192.168).\\d{1,3}.\\d{1,3}\n' +
        'localhost\n' +
        'nicovideo.jp\n' +
        'youtube.com',
    'regex_insensitive': true,
    'enable_auto_purge': true,
    'remaiming_memory': 500,
    'max_history': 7,
    'max_sessions': 10,
    'purging_all_tabs_except_active': false,
    'max_opening_tabs': 5,

    'keybind': {
      'release': JSON.stringify({}),
      'switch_not_release': JSON.stringify({}),
      'all_unpurge': JSON.stringify({}),
      'restore': JSON.stringify({}),
    },
    'keybind_exclude_url':
        'nicovideo.jp\n' +
        'youtube.com',
    'keybind_regex_insensitive': true,

    'savedSessions': [],
  };
  window.historyKey        = window.historyKey        || 'history';
  window.sessionKey        = window.sessionKey        || 'sessions';
  window.currentSessionKey = window.currentSessionKey || 'currentSession';
  window.versionKey        = window.versionKey        || 'version';
  defaultValues[window.historyKey]        = {};
  defaultValues[window.sessionKey]        = [];
  defaultValues[window.currentSessionKey] = null;
  defaultValues[window.versionKey]        = chrome.app.getDetails();

  window.defaultValues = window.defaultValues || defaultValues;

  // The url of the release point.
  window.blankUrls = {
    'local'  : chrome.runtime.getURL('blank.html'),
    'normal' : 'http://electron226.github.io/Tab-Memory-Purge',
  };

  window.extensionExcludeUrl =
      '^chrome-*\\w*://\n' +
      '^view-source:\n' +
      '^file:///\n' +
      '^' + blankUrls.normal;

  // initTranslationsでキー名を使用するときに使う。
  // どのファイルを選択しても問題ない。
  window.translationPath = chrome.runtime.getURL('_locales/ja/messages.json') ||
                           chrome.runtime.getURL('_locales/en/messages.json');
  // file of get scroll position of tab.
  window.getScrollPosScript = 'src/content_scripts/getScrollPosition.js';

  // a value which represents of the exclude list.
  var excludeValues = [
    'DISABLE_TIMER', 'KEYBIND_EXCLUDE',
    'NORMAL_EXCLUDE', 'USE_EXCLUDE', 'TEMP_EXCLUDE', 'EXTENSION_EXCLUDE',
  ];
  excludeValues.forEach(function(v, i) {
    window[v] = window[v] || 1 << i;
  });

  // the path of icons.
  // defined NORMAL_EXCLUDE etc... in common.js.
  var icons = {};
  var iconPartOfNamesAndNumbers = {
    'icon_disable_timer'         : DISABLE_TIMER,
    'icon_019'                   : NORMAL_EXCLUDE,
    'icon_019_use_exclude'       : USE_EXCLUDE,
    'icon_019_temp_exclude'      : TEMP_EXCLUDE,
    'icon_019_extension_exclude' : EXTENSION_EXCLUDE,
  };
  var keybindIconSuffix = '_with_keybind';
  for (var key in iconPartOfNamesAndNumbers) {
    icons[iconPartOfNamesAndNumbers[key]] =
        chrome.runtime.getURL('icon/' + key + '.png');
    icons[iconPartOfNamesAndNumbers[key] | KEYBIND_EXCLUDE] =
        chrome.runtime.getURL('icon/' + key + keybindIconSuffix + '.png');
  }
  window.icons = window.icons || icons;

  window.optionPage = chrome.runtime.getURL('options.html');
  window.changeHistory = chrome.runtime.getURL('History.txt');

  window.optionMenus = [
    { 'name': 'option' },
    { 'name': 'keybind' },
    { 'name': 'history' },
    { 'name': 'session_history' },
    { 'name': 'change_history' },
    { 'name': 'information' },
  ];

  window.switchDisableTimerMenuItemId = 'disableTimer';
  window.excludeDialogMenuItemId = 'currentTabExcludeDialog';
})(window);
