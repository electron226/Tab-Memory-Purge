/*jshint globalstrict: true, maxlen: 100, unused: false*/
"use strict";

// Default Values.
var default_values = {
  // Set item in Options, and Extensions
  'release_page_radio': 'author',
  'release_url_text': '',
  'no_release_checkbox': false,
  'assignment_title_checkbox': true,
  'assignment_favicon_checkbox': true,
  'timer_number': 20,
  'exclude_url_textarea':
      '^https://\n' +
      '(10.\\d{0,3}|172.(1[6-9]|2[0-9]|3[0-1])|192.168).\\d{1,3}.\\d{1,3}\n' +
      'localhost\n' +
      'nicovideo.jp\n' +
      'youtube.com',
  'regex_insensitive_checkbox': true,
  'forcibly_close_restore_checkbox': false,

  // keybind
  'release_keybind_text': JSON.stringify({}),
  'switch_not_release_keybind_text': JSON.stringify({}),
  'all_unpurge_keybind_text': JSON.stringify({}),
  'restore_keybind_text': JSON.stringify({}),
};

// a value which represents of the exclude list.
var NORMAL_EXCLUDE = 50000;
var USE_EXCLUDE = 50001;
var TEMP_EXCLUDE = 50002;
var EXTENSION_EXCLUDE = 50003;

var translation_path = chrome.runtime.getURL('_locales/ja/messages.json');

// get data from assignment file.
// then search class in the document.
// and change string of its element inside.
function initTranslations(document, load_file, suffix)
{
  if (document === void 0 ||
      toType(load_file) !== 'string' ||
      toType(suffix) !== 'string') {
    throw new Error('Invalid type of arguments.');
  }

  var request = new XMLHttpRequest();
  request.onload = function() {
    var translations = JSON.parse(this.responseText);
    for (var key in translations) {
      var el = document.getElementsByClassName(key + suffix);
      var message = chrome.i18n.getMessage(key);
      for (var j = 0; j < el.length; j++) {
        var string = el[j].innerHTML;
        var index = string.lastIndexOf('</');
        el[j].innerHTML = string.substring(0, index) +
                          message + string.substring(index);
      }
    }
  };
  request.open('GET', load_file, true);
  request.send(null);
}

/* base program.
 * http://javascriptweblog.wordpress.com/2011/08/08/fixing-the-javascript-typeof-operator/
 */
function toType(obj) {
  var type = ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
  if (type === 'global') {
    if (obj === void 0) { return 'undefined'; }
    if (obj === null) { return 'null'; }
  }
  return type;
}

function trim(string) {
  if (toType(string) !== 'string') {
    throw new Error('Argument error. used not string object.');
  }
  return string.replace(/(^\s+)|(\s+$)/g, '');
}

function unique(array) {
  if (toType(array) !== 'array') {
    throw new Error('Argument error. used not array object.');
  }

  var tempdict = {};
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var val = array[i];
    if (!(val in tempdict)) {
      tempdict[val] = true;
      ret.push(val);
    }
  }

  return ret;
}

function arrayEqual(x1, x2) {
  if (x1.length !== x2.length) {
    return false;
  }

  var i = 0, j = 0;
  while (i < x1.length && j < x2.length) {
    if (x1[i] !== x2[j]) {
      return false;
    }
    i++;
    j++;
  }
  return true;
}

// ブラウザの応答性は下がる(ビジーウェイト)
function sleep(T) {
  var d1 = new Date().getTime();
  var d2 = new Date().getTime();
  while (d2 < d1 + T) {
    d2 = new Date().getTime();
  }
}
