"use strict"; /*jshint globalstrict: true*/

// Default Values.
var default_values = default_values || {
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
  'forcibly_close_restore_checkbox': false
};

/* base program.
 * http://javascriptweblog.wordpress.com/2011/08/08/fixing-the-javascript-typeof-operator/
 */
var toType = toType || function(obj) {
  var type = ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
  if (type === 'global') {
    if (obj === void 0) { return 'undefined'; }
    if (obj === null) { return 'null'; }
  }
  return type;
};
var getType = getType || toType;

var Trim = Trim || function(string) {
  if (toType(string) !== 'string') {
    throw new Error('Argument error. used not string object.');
  }
  return string.replace(/(^\s+)|(\s+$)/g, '');
};

var Unique = Unique || function(array) {
  if (toType(array) !== 'array') {
    throw new Error('Argument error. used not array object.');
  }

  var tempdict = {};
  var unique = [];
  for (var i = 0; i < array.length; i++) {
    var val = array[i];
    if (!(val in tempdict)) {
      tempdict[val] = true;
      unique.push(val);
    }
  }

  return unique;
};


var ArrayEqual = ArrayEqual || function(x1, x2) {
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
};

// ブラウザの応答性は下がる(ビジーウェイト)
var Sleep = Sleep || function(T) {
  var d1 = new Date().getTime();
  var d2 = new Date().getTime();
  while (d2 < d1 + T) {
    d2 = new Date().getTime();
  }
};
