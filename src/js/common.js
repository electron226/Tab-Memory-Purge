/*jshint maxlen: 120, unused: false*/
(function(window) {
  "use strict";

  /* for this script. */
  function setObjectProperty(pObj, pStrName, pValue)//{{{
  {
    console.info('setObjectProperty in common.js', pObj, pStrName, pValue);
    if (pObj.hasOwnProperty(pStrName)) {
      throw new Error('Already contain to pObj', pStrName, pValue);
    }
    pObj[pStrName] = pValue;
  }//}}}

  setObjectProperty(window, 'gStrVersionKey', 'version');
  setObjectProperty(window, 'gStrPreviousSessionTimeKey', 'previous_session_time');

  function initializeDefaultConfigOfExtension()//{{{
  {
    /*jshint -W069*/
    var lStrKeybindDefault = JSON.stringify({});
    var lMapConfig = new Map();

    lMapConfig.set('no_release', false);
    lMapConfig.set('timer', 20);
    lMapConfig.set('exclude_url',
      '^https://\n' +
      '.*://(10|172|192).\d+.\d+.\d+\n' +
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
    lMapConfig.set('get_title_when_does_not_title', true);
    lMapConfig.set('not_purge_playsound_tab', true);

    lMapConfig.set('restored_type', 'restore_to_original_window');

    lMapConfig.set('keybind_release', lStrKeybindDefault);
    lMapConfig.set('keybind_switch_not_release', lStrKeybindDefault);
    lMapConfig.set('keybind_switch_not_release_host', lStrKeybindDefault);
    lMapConfig.set('keybind_all_purge', lStrKeybindDefault);
    lMapConfig.set('keybind_all_purge_without_exclude_list', lStrKeybindDefault);
    lMapConfig.set('keybind_all_unpurge', lStrKeybindDefault);
    lMapConfig.set('keybind_exclude_url',
      'nicovideo.jp\n' +
      'youtube.com');
    lMapConfig.set('keybind_regex_insensitive', true);
    lMapConfig.set(window['gStrVersionKey'], chrome.app.getDetails());
    lMapConfig.set(window['gStrPreviousSessionTimeKey'], null);

    return lMapConfig;
  }//}}}

  setObjectProperty(window, 'gMapDefaultValues', initializeDefaultConfigOfExtension());

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
  lArrayExcludeValues.forEach((pValue, i) => {
    setObjectProperty(window, pValue, 1 << i);
  });

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
  lMapIconNumbers.forEach((pValue, pKey) => {
    lMapIcons.set(pKey, chrome.runtime.getURL(`${lStrIconDir}${pValue}.png`));
    lMapIcons.set(pKey | KEYBIND_EXCLUDE,
      chrome.runtime.getURL(`${lStrIconDir}${pValue}${lStrKeybindIconSuffix}.png`));
  });

  var lMapMainIcons = new Map();
  lMapMainIcons.set(EXTENSION_ICON_38, 'icon_038');
  lMapMainIcons.set(EXTENSION_ICON_48, 'icon_048');
  lMapMainIcons.set(EXTENSION_ICON_128, 'icon_128');

  lMapMainIcons.forEach((pValue, pKey) => {
    lMapIcons.set(pKey, chrome.runtime.getURL(`${lStrIconDir}${pValue}.png`));
  });
  setObjectProperty(window, 'gMapIcons', lMapIcons);

  setObjectProperty(window, 'gStrBlankUrl', gStrBlankUrl);
  setObjectProperty(window, 'gStrOptionPage', chrome.runtime.getURL('options.html'));
  setObjectProperty(window, 'gStrChangeHistory', chrome.runtime.getURL('History.txt'));
  setObjectProperty(window, 'gStrDeleteIconPath', 'img/icons/close.svg');
  setObjectProperty(window, 'UPDATE_CONFIRM_DIALOG', 'TMP_UPDATE_CONFIRMATION_DIALOG');
  setObjectProperty(window, 'RESTORE_PREVIOUS_SESSION', 'TMP_RESTORE_PREVIOUS_SESSION');
  setObjectProperty(window, 'gNumUpdateCheckTime', 30 * 60 * 1000); // min * sec * Millisec.
})(this);
