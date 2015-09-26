/*jshint maxlen: 120, unused: false*/
(function(window) {
  "use strict";

  /* for this script. */
  function setObjectProperty(pObj, pStrName, pValue)//{{{
  {
    console.log('setObjectProperty in common.js', pObj, pStrName, pValue);
    if (pObj.hasOwnProperty(pStrName)) {
      throw new Error('Already contain to pObj', pStrName, pValue);
    }
    pObj[pStrName] = pValue;
  }//}}}

  setObjectProperty(window, 'gStrVersionKey', 'version');
  setObjectProperty(window, 'gStrPreviousSessionTimeKey', 'previous_session_time');

  function closureExtensionOption()//{{{
  {
    /*jshint -W069*/
    var lStrKeybindDefault = JSON.stringify({});
    var lMapConfig = new Map();
    lMapConfig.set('no_release', false);
    lMapConfig.set('timer', 20);
    lMapConfig.set('exclude_url',
      '^https://\n' +
      '^http*://(10.\\d{0,3}|172.(1[6-9]|2[0-9]|3[0-1])|192.168).\\d{1,3}.\\d{1,3}\n' +
      'localhost\n' +
      'nicovideo.jp\n' +
      'youtube.com'
    );
    lMapConfig.set('regex_insensitive', true);
    lMapConfig.set('enable_auto_purge', true);
    lMapConfig.set('remaiming_memory', 500);
    lMapConfig.set('max_history', 7);
    lMapConfig.set('max_sessions', 10);
    lMapConfig.set('purging_all_tabs_except_active', false);
    lMapConfig.set('max_opening_tabs', 5);
    lMapConfig.set('interval_timing', 5);
    lMapConfig.set('new_tab_opens_with_purged_tab', false);
    lMapConfig.set('get_title_when_does_not_title', false);
    lMapConfig.set('not_purge_playsound_tab', true);

    lMapConfig.set('keybind_release', lStrKeybindDefault);
    lMapConfig.set('keybind_switch_not_release', lStrKeybindDefault);
    lMapConfig.set('keybind_all_purge', lStrKeybindDefault);
    lMapConfig.set('keybind_all_purge_without_exclude_list', lStrKeybindDefault);
    lMapConfig.set('keybind_all_unpurge', lStrKeybindDefault);
    lMapConfig.set('keybind_exclude_url',
      'nicovideo.jp\n' +
      'youtube.com');
    lMapConfig.set('keybind_regex_insensitive', true);
    lMapConfig.set(window['gStrVersionKey'], chrome.app.getDetails());
    lMapConfig.set(window['gStrPreviousSessionTimeKey'], null);

    return {
      get: function(pKey) { return lMapConfig.get(pKey); },
      replace: function(pKey, pValue) {
        if (lMapConfig.has(pKey)) {
          lMapConfig.set(pKey, pValue);
        }
        throw new Error(`Doesn't exist pKey: ${pKey}`);
      },
      forEach: function(pCallback, pThisArgs) {
        if (toType(pCallback) !== 'function') {
          throw new Error("pCallback isn't function");
        }
        var iter = lMapConfig.entries();
        var i = iter.next();
        while (!i.done) {
          pCallback.call(pThisArgs, i.value[1], i.value[0], lMapConfig);
          i = iter.next();
        }
      },
      has:     function(pKey) { return lMapConfig.has(pKey); },
      entries: function()    { return lMapConfig.entries(); },
      keys:    function()    { return lMapConfig.keys(); },
      values:  function()    { return lMapConfig.values(); },
    };
  }//}}}

  setObjectProperty(window, 'gMapDefaultValues', closureExtensionOption());

  setObjectProperty(window, 'gStrDbName', 'TMP_DB');
  setObjectProperty(window, 'gNumDbVersion', 2);
  setObjectProperty(window, 'gStrDbHistoryName', 'history');
  setObjectProperty(window, 'gStrDbDataURIName', 'dataURI');
  setObjectProperty(window, 'gStrDbPageInfoName', 'pageInfo');
  setObjectProperty(window, 'gStrDbSessionName', 'session');
  setObjectProperty(window, 'gStrDbSavedSessionName', 'savedSession');

  var lObjCreateStores = {};//{{{
  lObjCreateStores[window.gStrDbHistoryName] = {
    property: {
      keyPath: 'date',
      autoIncrement: false,
    },
  };
  lObjCreateStores[window.gStrDbDataURIName] = {
    property: {
      keyPath: 'host',
      autoIncrement: false,
    },
  };
  lObjCreateStores[window.gStrDbPageInfoName] = {
    property: {
      keyPath: 'url',
      autoIncrement: false,
    },
  };
  lObjCreateStores[window.gStrDbSessionName] = {
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
  lObjCreateStores[window.gStrDbSavedSessionName] = {
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
  setObjectProperty(window, 'gObjDbCreateStores', lObjCreateStores);//}}}

  var gStrBlankUrl = chrome.runtime.getURL('blank.html');
  setObjectProperty(window, 'gStrExtensionExcludeUrl', '^' + gStrBlankUrl);
  setObjectProperty(window, 'gStrChromeExcludeUrl',
      '^chrome-*\\w*://\n' +
      '^view-source:\n' +
      '^file:///'
  );


  // initTranslationsでキー名を使用するときに使う。
  // どのファイルを選択しても問題ない。
  setObjectProperty(window, 'gStrTranslationPath',
    chrome.runtime.getURL('_locales/ja/messages.json') ||
    chrome.runtime.getURL('_locales/en/messages.json'));
  // file of get scroll position of tab.
  setObjectProperty(window, 'gStrGetScrollPosScript', 'js/load_scripts/getScrollPosition.js');

  // a value which represents of the exclude list.
  var lArrayExcludeValues = [
    'DISABLE_AUTOPURGE',     // 1
    'INVALID_EXCLUDE',   // 2
    'KEYBIND_EXCLUDE',   // 4
    'NORMAL',            // 8
    'USE_EXCLUDE',       // 16
    'TEMP_EXCLUDE',      // 32
    'EXTENSION_EXCLUDE', // 64
    'CHROME_EXCLUDE',    // 128
    'EXTENSION_ICON_38', // 256
    'EXTENSION_ICON_48', // 512
    'EXTENSION_ICON_128', // 1024
  ];
  var i = 0;
  while (i < lArrayExcludeValues.length) {
    setObjectProperty(window, lArrayExcludeValues[i], 1 << i);
    ++i;
  }

  // the path of icons.
  // defined NORMAL etc... in common.js.
  var lMapIcons = new Map();
  var lMapIconNumbers = new Map();
  lMapIconNumbers.set(DISABLE_AUTOPURGE, 'icon_disable_timer');
  lMapIconNumbers.set(NORMAL,            'icon_019');
  lMapIconNumbers.set(USE_EXCLUDE,       'icon_019_use_exclude');
  lMapIconNumbers.set(TEMP_EXCLUDE,      'icon_019_temp_exclude');
  lMapIconNumbers.set(EXTENSION_EXCLUDE, 'icon_019_extension_exclude');
  lMapIconNumbers.set(CHROME_EXCLUDE,    'icon_019_extension_exclude');

  var lStrIconDir           = 'img/icons/';
  var lStrKeybindIconSuffix = '_with_keybind';
  var iter = lMapIconNumbers.entries();
  i    = iter.next();
  while (!i.done) {
    lMapIcons.set(i.value[0], chrome.runtime.getURL(`${lStrIconDir}${i.value[1]}.png`));
    lMapIcons.set(i.value[0] | KEYBIND_EXCLUDE,
      chrome.runtime.getURL(`${lStrIconDir}${i.value[1]}${lStrKeybindIconSuffix}.png`));
    i = iter.next();
  }

  var lMapMainIcons = new Map();
  lMapMainIcons.set(EXTENSION_ICON_38, 'icon_038');
  lMapMainIcons.set(EXTENSION_ICON_48, 'icon_048');
  lMapMainIcons.set(EXTENSION_ICON_128, 'icon_128');

  iter = lMapMainIcons.entries();
  i    = iter.next();
  while (!i.done) {
    lMapIcons.set(i.value[0], chrome.runtime.getURL(`${lStrIconDir}${i.value[1]}.png`));
    i = iter.next();
  }

  setObjectProperty(window, 'gMapIcons', lMapIcons);

  setObjectProperty(window, 'gStrBlankUrl', gStrBlankUrl);
  setObjectProperty(window, 'gStrOptionPage', chrome.runtime.getURL('options.html'));
  setObjectProperty(window, 'gStrChangeHistory', chrome.runtime.getURL('History.txt'));
  setObjectProperty(window, 'gStrDeleteIconPath', 'img/icons/close.svg');
  setObjectProperty(window, 'UPDATE_CONFIRM_DIALOG', 'TMP_UPDATE_CONFIRMATION_DIALOG');
  setObjectProperty(window, 'RESTORE_PREVIOUS_SESSION', 'TMP_RESTORE_PREVIOUS_SESSION');
  setObjectProperty(window, 'gNumUpdateCheckTime', 30 * 60 * 1000); // min * sec * Millisec.
})(this);
