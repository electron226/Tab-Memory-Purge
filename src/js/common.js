/*jshint maxlen: 120, unused: false*/
(function(window) {
  "use strict";

  /* for this script. */
  function setObjectProperty(obj, name, value)//{{{
  {
    console.log('setObjectProperty in common.js', obj, name, value);
    if (obj.hasOwnProperty(name)) {
      throw new Error('Already contain to + obj', name, value);
    }
    obj[name] = value;
  }//}}}

  setObjectProperty(window, 'versionKey', 'version');
  setObjectProperty(window, 'previousSessionTimeKey', 'previous_session_time');

  function closureExtensionOption()//{{{
  {
    /*jshint -W069*/
    var config = new Map();
    config.set('no_release', false);
    config.set('timer', 20);
    config.set('exclude_url',
      '^https://\n' +
      '^http*://(10.\\d{0,3}|172.(1[6-9]|2[0-9]|3[0-1])|192.168).\\d{1,3}.\\d{1,3}\n' +
      'localhost\n' +
      'nicovideo.jp\n' +
      'youtube.com'
    );
    config.set('regex_insensitive', true);
    config.set('enable_auto_purge', true);
    config.set('remaiming_memory', 500);
    config.set('max_history', 7);
    config.set('max_sessions', 10);
    config.set('purging_all_tabs_except_active', false);
    config.set('max_opening_tabs', 5);
    config.set('interval_timing', 5);
    config.set('new_tab_opens_with_purged_tab', false);
    config.set('get_title_when_does_not_title', false);

    config.set('keybind_release', JSON.stringify({}));
    config.set('keybind_switch_not_release', JSON.stringify({}));
    config.set('keybind_all_purge', JSON.stringify({}));
    config.set('keybind_all_purge_without_exclude_list', JSON.stringify({}));
    config.set('keybind_all_unpurge', JSON.stringify({}));
    config.set('keybind_exclude_url',
      'nicovideo.jp\n' +
      'youtube.com');
    config.set('keybind_regex_insensitive', true);
    config.set(window['versionKey'], chrome.app.getDetails());
    config.set(window['previousSessionTimeKey'], null);

    return {
      get: function(key) { return config.get(key); },
      replace: function(key, value) {
        if (config.has(key)) {
          config.set(key, value);
        }
        throw new Error("Doesn't exist key: " + key);
      },
      forEach: function(callback, thisArgs) {
        if (toType(callback) !== 'function') {
          throw new Error("callback isn't function");
        }
        var iter = config.entries();
        var i = iter.next();
        while (!i.done) {
          callback.call(thisArgs, i.value[1], i.value[0], config);
          i = iter.next();
        }
      },
      has:     function(key) { return config.has(key); },
      entries: function()    { return config.entries(); },
      keys:    function()    { return config.keys(); },
      values:  function()    { return config.values(); },
    };
  }//}}}

  setObjectProperty(window, 'defaultValues', closureExtensionOption());

  setObjectProperty(window, 'dbName', 'TMP_DB');
  setObjectProperty(window, 'dbVersion', 2);
  setObjectProperty(window, 'dbHistoryName', 'history');
  setObjectProperty(window, 'dbDataURIName', 'dataURI');
  setObjectProperty(window, 'dbPageInfoName', 'pageInfo');
  setObjectProperty(window, 'dbSessionName', 'session');
  setObjectProperty(window, 'dbSavedSessionName', 'savedSession');

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
  setObjectProperty(window, 'dbCreateStores', dbCreateStores);

  var blankUrl = chrome.runtime.getURL('blank.html');
  setObjectProperty(window, 'extensionExcludeUrl',
      '^chrome-*\\w*://\n' +
      '^view-source:\n' +
      '^file:///\n' +
      '^' + blankUrl
  );

  // initTranslationsでキー名を使用するときに使う。
  // どのファイルを選択しても問題ない。
  setObjectProperty(window, 'translationPath',
    chrome.runtime.getURL('_locales/ja/messages.json') ||
    chrome.runtime.getURL('_locales/en/messages.json'));
  // file of get scroll position of tab.
  setObjectProperty(window, 'getScrollPosScript', 'js/load_scripts/getScrollPosition.js');

  // a value which represents of the exclude list.
  var excludeValues = [
    'DISABLE_TIMER',     // 1
    'INVALID_EXCLUDE',   // 2
    'KEYBIND_EXCLUDE',   // 4
    'NORMAL',            // 8
    'USE_EXCLUDE',       // 16
    'TEMP_EXCLUDE',      // 32
    'EXTENSION_EXCLUDE', // 64
  ];
  var i = 0;
  while (i < excludeValues.length) {
    setObjectProperty(window, excludeValues[i], 1 << i);
    ++i;
  }

  // the path of icons.
  // defined NORMAL etc... in common.js.
  var icons = new Map();
  var iconNumbers = new Map();
  iconNumbers.set('icon_disable_timer', DISABLE_TIMER);
  iconNumbers.set('icon_019', NORMAL);
  iconNumbers.set('icon_019_use_exclude', USE_EXCLUDE);
  iconNumbers.set('icon_019_temp_exclude', TEMP_EXCLUDE);
  iconNumbers.set('icon_019_extension_exclude', EXTENSION_EXCLUDE);

  var keybindIconSuffix = '_with_keybind';
  var iter = iconNumbers.entries();
  for (i = iter.next(); !i.done; i = iter.next()) {
    icons.set(i.value[1], chrome.runtime.getURL('icon/' + i.value[0] + '.png'));
    icons.set(i.value[1] | KEYBIND_EXCLUDE,
      chrome.runtime.getURL('icon/' + i.value[0] + keybindIconSuffix + '.png'));
  }
  setObjectProperty(window, 'icons', icons);

  setObjectProperty(window, 'blankUrl', blankUrl);
  setObjectProperty(window, 'optionPage', chrome.runtime.getURL('options.html'));
  setObjectProperty(window, 'changeHistory', chrome.runtime.getURL('History.txt'));
  setObjectProperty(window, 'UPDATE_CONFIRM_DIALOG', 'TMP_UPDATE_CONFIRMATION_DIALOG');
  setObjectProperty(window, 'RESTORE_PREVIOUS_SESSION', 'TMP_RESTORE_PREVIOUS_SESSION');
  setObjectProperty(window, 'updateCheckTime', 30 * 60 * 1000); // min * sec * Millisec.
})(this);
