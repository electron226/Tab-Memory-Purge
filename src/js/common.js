/*eslint max-len: ["error", 120]*/
(function(window) {
  "use strict";

  /* for this script. */
  function setObjectProperty(pObj, pName, pValue)//{{{
  {
    if (pObj.hasOwnProperty(pName)) {
      throw new Error('Already contain to pObj', pName, pValue);
    }
    pObj[pName] = pValue;
  }//}}}

  setObjectProperty(window, 'gStrVersionKey', 'version');
  setObjectProperty(window, 'gStrPreviousSessionTimeKey', 'previous_session_time');

  function initializeDefaultConfigOfExtension()//{{{
  {
    /*eslint no-useless-escape: "off"*/
    let keybind_default = JSON.stringify({});
    let config = new Map();

    config.set('no_release', false);
    config.set('timer', 20);
    config.set('exclude_url',
      '^https://\n' +
      '.*://(10|172|192).\d+.\d+.\d+\n' +
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
    config.set('get_title_when_does_not_title', true);
    config.set('not_purge_playsound_tab', true);
    config.set('not_purge_pinned_tab', true);
    config.set('when_purge_tab_to_pin', false);

    config.set('popup_exclude_list', true);
    config.set('popup_exclude_playsound_tab', true);
    config.set('popup_exclude_pinned_tab', true);

    config.set('restored_type', 'restore_to_original_window');

    config.set('keybind_release', keybind_default);
    config.set('keybind_switch_not_release', keybind_default);
    config.set('keybind_switch_not_release_host', keybind_default);
    config.set('keybind_all_purge', keybind_default);
    config.set('keybind_all_purge_except_settings', keybind_default);
    config.set('keybind_all_unpurge', keybind_default);
    config.set('keybind_switch_timer_state', keybind_default);
    config.set('keybind_add_current_tab_exclude_list', keybind_default);
    config.set('keybind_clear_temporary_exclusion_list', keybind_default);
    config.set('keybind_exclude_url',
      'nicovideo.jp\n' +
      'youtube.com');
    config.set('keybind_regex_insensitive', true);
    config.set(window['gStrVersionKey'], chrome.app.getDetails());
    config.set(window['gStrPreviousSessionTimeKey'], null);

    return config;
  }//}}}

  setObjectProperty(window, 'gMapDefaultValues', initializeDefaultConfigOfExtension());

  setObjectProperty(window, 'gStrDbName', 'TMP_DB');
  setObjectProperty(window, 'gNumDbVersion', 2);
  setObjectProperty(window, 'gStrDbHistoryName', 'history');
  setObjectProperty(window, 'gStrDbDataURIName', 'dataURI');
  setObjectProperty(window, 'gStrDbPageInfoName', 'pageInfo');
  setObjectProperty(window, 'gStrDbSessionName', 'session');
  setObjectProperty(window, 'gStrDbSavedSessionName', 'savedSession');

  let create_stores = {};//{{{
  create_stores[window.gStrDbHistoryName] = {
    property: {
      keyPath: 'date',
      autoIncrement: false,
    },
  };
  create_stores[window.gStrDbDataURIName] = {
    property: {
      keyPath: 'host',
      autoIncrement: false,
    },
  };
  create_stores[window.gStrDbPageInfoName] = {
    property: {
      keyPath: 'url',
      autoIncrement: false,
    },
  };
  create_stores[window.gStrDbSessionName] = {
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
  create_stores[window.gStrDbSavedSessionName] = {
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
  setObjectProperty(window, 'gObjDbCreateStores', create_stores);//}}}

  let blank_url = chrome.runtime.getURL('blank.html');
  setObjectProperty(window, 'gStrExtensionExcludeUrl', '^' + blank_url);
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
  let exclude_values = [
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
  exclude_values.forEach((pValue, i) => {
    setObjectProperty(window, pValue, 1 << i);
  });

  // the path of icons.
  // defined NORMAL etc... in common.js.
  let icons        = new Map();
  let icon_numbers = new Map();
  icon_numbers.set(DISABLE_AUTOPURGE, 'icon_disable_timer');
  icon_numbers.set(NORMAL,            'icon_019');
  icon_numbers.set(USE_EXCLUDE,       'icon_019_use_exclude');
  icon_numbers.set(TEMP_EXCLUDE,      'icon_019_temp_exclude');
  icon_numbers.set(EXTENSION_EXCLUDE, 'icon_019_extension_exclude');
  icon_numbers.set(CHROME_EXCLUDE,    'icon_019_extension_exclude');

  let icon_dir            = 'img/icons/';
  let keybind_icon_suffix = '_with_keybind';
  icon_numbers.forEach((pValue, pKey) => {
    icons.set(pKey, chrome.runtime.getURL(`${icon_dir}${pValue}.png`));
    icons.set(pKey | KEYBIND_EXCLUDE,
      chrome.runtime.getURL(`${icon_dir}${pValue}${keybind_icon_suffix}.png`));
  });

  let main_icons = new Map();
  main_icons.set(EXTENSION_ICON_38, 'icon_038');
  main_icons.set(EXTENSION_ICON_48, 'icon_048');
  main_icons.set(EXTENSION_ICON_128, 'icon_128');

  main_icons.forEach((pValue, pKey) => {
    icons.set(pKey, chrome.runtime.getURL(`${icon_dir}${pValue}.png`));
  });
  setObjectProperty(window, 'gMapIcons', icons);

  setObjectProperty(window, 'gStrBlankUrl', blank_url);
  setObjectProperty(window, 'gStrOptionPage', chrome.runtime.getURL('options.html'));
  setObjectProperty(window, 'gStrChangeHistory', chrome.runtime.getURL('History.txt'));
  setObjectProperty(window, 'gStrDeleteIconPath', 'img/icons/close.svg');
  setObjectProperty(window, 'UPDATE_CONFIRM_DIALOG', 'TMP_UPDATE_CONFIRMATION_DIALOG');
  setObjectProperty(window, 'RESTORE_PREVIOUS_SESSION', 'TMP_RESTORE_PREVIOUS_SESSION');
  setObjectProperty(window, 'gNumUpdateCheckTime', 30 * 60 * 1000); // min * sec * Millisec.
})(this);
