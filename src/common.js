/*jshint maxlen: 120, unused: false*/
(function(window) {
  "use strict";

  /* Default Values. */
  var defaultValues = {
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
    'when_updated_restore_session': false,
    'interval_timing': 5,

    'keybind': {
      'release': JSON.stringify({}),
      'switch_not_release': JSON.stringify({}),
      'all_purge': JSON.stringify({}),
      'all_purge_without_exclude_list': JSON.stringify({}),
      'all_unpurge': JSON.stringify({}),
    },
    'keybind_exclude_url':
        'nicovideo.jp\n' +
        'youtube.com',
    'keybind_regex_insensitive': true,
  };
  window.versionKey = window.versionKey || 'version';
  defaultValues[window.versionKey] = chrome.app.getDetails();

  window.previousSessionTimeKey =
    window.previousSessionTimeKey || 'previous_session_time';
  defaultValues[window.previousSessionTimeKey] = null;

  window.defaultValues = window.defaultValues || defaultValues;

  window.dbName             = window.dbName             || 'TMP_DB';
  window.dbVersion          = window.dbVersion          || 2;
  window.dbHistoryName      = window.dbHistoryName      || 'history';
  window.dbDataURIName      = window.dbDataURIName      || 'dataURI';
  window.dbPageInfoName     = window.dbPageInfoName     || 'pageInfo';
  window.dbSessionName      = window.dbSessionName      || 'session';
  window.dbSavedSessionName = window.dbSavedSessionName || 'savedSession';

  var dbCreateStores = {};
  dbCreateStores[window.dbHistoryName] = {
    property: {
      keyPath: 'date',
      autoIncrement: false,
    },
  };
  dbCreateStores[window.dbDataURIName] = {
    property: {
      keyPath: 'host',
      autoIncrement: false,
    },
  };
  dbCreateStores[window.dbPageInfoName] = {
    property: {
      keyPath: 'url',
      autoIncrement: false,
    },
  };
  dbCreateStores[window.dbSessionName] = {
    property: {
      keyPath: 'id',
      autoIncrement: true,
    },
    indexs: {
      date: {
        targets: ['date'],
        property: { unique: false },
      },
    },
  };
  dbCreateStores[window.dbSavedSessionName] = {
    property: {
      keyPath: 'id',
      autoIncrement: true,
    },
    indexs: {
      date: {
        targets: ['date'],
        property: { unique: false },
      },
    },
  };
  window.dbCreateStores = window.dbCreateStores || dbCreateStores;

  // The url of the release point.
  window.blankUrl = chrome.runtime.getURL('blank.html');

  window.extensionExcludeUrl =
      '^chrome-*\\w*://\n' +
      '^view-source:\n' +
      '^file:///\n' +
      '^' + blankUrl;

  // initTranslationsでキー名を使用するときに使う。
  // どのファイルを選択しても問題ない。
  window.translationPath = chrome.runtime.getURL('_locales/ja/messages.json') ||
                           chrome.runtime.getURL('_locales/en/messages.json');
  // file of get scroll position of tab.
  window.getScrollPosScript = 'src/content_scripts/getScrollPosition.js';

  // a value which represents of the exclude list.
  var excludeValues = [
    'DISABLE_TIMER',     // 1
    'KEYBIND_EXCLUDE',   // 2
    'NORMAL_EXCLUDE',    // 4
    'USE_EXCLUDE',       // 8
    'TEMP_EXCLUDE',      // 16
    'EXTENSION_EXCLUDE', // 32
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

  window.parentMenuId = 'parentMenu';
  window.switchDisableTimerMenuItemId = 'disableTimer';
  window.excludeDialogMenuItemId = 'currentTabExcludeDialog';

  window.contextMenus = [
    {
      id    : parentMenuId,
      title : chrome.i18n.getMessage('optionPage'),
    },
    {
      id    : switchDisableTimerMenuItemId,
      title : chrome.i18n.getMessage('switchTimer'),
    },
    {
      id    : excludeDialogMenuItemId,
      title : chrome.i18n.getMessage('add_current_tab_exclude_list'),
    },
  ];
})(window);
