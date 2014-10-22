/*jshint globalstrict: true, maxlen: 100, unused: false*/
"use strict";

// Default Values.
var default_values = default_values || {
  'release_page': 'author',
  'release_url': '',
  'no_release': false,
  'assignment_title': true,
  'assignment_favicon': true,
  'timer': 20,
  'exclude_url':
      '^https://\n' +
      '(10.\\d{0,3}|172.(1[6-9]|2[0-9]|3[0-1])|192.168).\\d{1,3}.\\d{1,3}\n' +
      'localhost\n' +
      'nicovideo.jp\n' +
      'youtube.com',
  'regex_insensitive': true,
  'forcibly_close_restore': false,
  'enable_auto_purge': true,
  'remaiming_memory': 200,
  'max_history': 7,

  'release_keybind': JSON.stringify({}),
  'switch_not_release_keybind': JSON.stringify({}),
  'all_unpurge_keybind': JSON.stringify({}),
  'restore_keybind': JSON.stringify({}),

  'history': {},
  'backup': {},
};

// initTranslationsでキー名を使用するときに使う。
// どのファイルを選択しても問題ない。
var translation_path = chrome.runtime.getURL('_locales/ja/messages.json') ||
                       chrome.runtime.getURL('_locales/en/messages.json');

// The url of the release point.
var blank_urls = {
  'local': chrome.runtime.getURL('blank.html'),
  'normal': 'https://tabmemorypurge.appspot.com/blank.html',
};

// file of get scroll position of tab.
var get_scrollPos_script = 'src/content_scripts/getScrollPosition.js';

// a value which represents of the exclude list.
var NORMAL_EXCLUDE = NORMAL_EXCLUDE || 50000;
var USE_EXCLUDE = USE_EXCLUDE || 50001;
var TEMP_EXCLUDE = TEMP_EXCLUDE ||50002;
var EXTENSION_EXCLUDE = EXTENSION_EXCLUDE || 50003;

// the path of icons.
// defined NORMAL_EXCLUDE etc... in common.js.
var icons = {};
icons[NORMAL_EXCLUDE] = chrome.runtime.getURL('icon/icon_019.png');
icons[USE_EXCLUDE] = chrome.runtime.getURL('icon/icon_019_use_exclude.png');
icons[TEMP_EXCLUDE] = chrome.runtime.getURL('icon/icon_019_temp_exclude.png');
icons[EXTENSION_EXCLUDE] =
    chrome.runtime.getURL('icon/icon_019_extension_exclude.png');

var extension_exclude_url =
    '^chrome-*\\w*://\n' +
    '^view-source:\n' +
    'tabmemorypurge.appspot.com/\n' +
    '^file:///\n';
