/*jshint maxlen: 120, unused: false*/
(function(window) {
  "use strict";

  /* Default Values. */
  var defaultValues = {
    'release_page': 'author',
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

    'keybind': {
      'release': JSON.stringify({}),
      'switch_not_release': JSON.stringify({}),
      'all_unpurge': JSON.stringify({}),
      'restore': JSON.stringify({}),
    },

    'savedSessions': [],
  };
  window.historyKey = window.historyKey || 'history';
  window.sessionKey = window.sessionKey || 'sessions';
  window.currentSessionKey = window.currentSessionKey || 'currentSession';
  window.versionKey = window.versionKey || 'version';
  defaultValues[window.historyKey] = {};
  defaultValues[window.sessionKey] = [];
  defaultValues[window.currentSessionKey] = null;
  defaultValues[window.versionKey] = {};

  window.defaultValues = window.defaultValues || defaultValues;

  // initTranslationsでキー名を使用するときに使う。
  // どのファイルを選択しても問題ない。
  window.translationPath = chrome.runtime.getURL('_locales/ja/messages.json') ||
                           chrome.runtime.getURL('_locales/en/messages.json');

  // The url of the release point.
  window.blankUrls = {
    'local': chrome.runtime.getURL('blank.html'),
    'normal': 'http://electron226.github.io/Tab-Memory-Purge',
  };

  // file of get scroll position of tab.
  window.getScrollPosScript = 'src/content_scripts/getScrollPosition.js';

  // a value which represents of the exclude list.
  window.NORMAL_EXCLUDE    = window.NORMAL_EXCLUDE || 50000;
  window.USE_EXCLUDE       = window.USE_EXCLUDE || 50001;
  window.TEMP_EXCLUDE      = window.TEMP_EXCLUDE ||50002;
  window.EXTENSION_EXCLUDE = window.EXTENSION_EXCLUDE || 50003;

  // the path of icons.
  // defined NORMAL_EXCLUDE etc... in common.js.
  var icons = {};
  icons[NORMAL_EXCLUDE] = chrome.runtime.getURL('icon/icon_019.png');
  icons[USE_EXCLUDE] = chrome.runtime.getURL('icon/icon_019_use_exclude.png');
  icons[TEMP_EXCLUDE] = chrome.runtime.getURL('icon/icon_019_temp_exclude.png');
  icons[EXTENSION_EXCLUDE] =
      chrome.runtime.getURL('icon/icon_019_extension_exclude.png');
  window.icons = window.icons || icons;

  window.extensionExcludeUrl =
      '^chrome-*\\w*://\n' +
      '^view-source:\n' +
      '^file:///\n' +
      '^' + blankUrls.normal;

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
})(window);
