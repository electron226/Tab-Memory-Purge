// Default Values. use InitValues Function.
if (!default_values) {
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

    // In Options. do not change items.
    'sample_url_text':
        'file:///G:/Project/Google Chrome/Tab Memory Purge/blank_sample.html',

    // In Extensions.
    'extension_exclude_url':
        '^chrome-*\\w*://\n' +
        '^view-source:\n' +
        'tabmemorypurge.appspot.com/\n' +
        '^file:///\n'
  };
}

// a value which represents of the exclude list.
if (!NORMAL_EXCLUDE) { var NORMAL_EXCLUDE = 50000; }
if (!USE_EXCLUDE) { var USE_EXCLUDE = 50001; }
if (!TEMP_EXCLUDE) { var TEMP_EXCLUDE = 50002; }
if (!EXTENSION_EXCLUDE) { var EXTENSION_EXCLUDE = 50003; }

if (!getType) {
  function getType(obj)
  {
    if (obj instanceof Boolean || typeof obj == 'boolean') return 'boolean';
    if (obj instanceof Number || typeof obj == 'number') return 'number';
    if (obj instanceof String || typeof obj == 'string') return 'string';
    if (obj instanceof Array) return 'array';
    if (obj instanceof Function) return 'function';
    if (obj === null) return 'null';
    if (obj === undefined) return 'undefined';
    if (obj instanceof Object) return 'object';

    throw 'Unknown type';
  }
}

if (!Trim) {
  function Trim(string)
  {
    if (getType(string) != 'string') {
      throw 'Argument error. used not string object.';
    }
    return string.replace(/(^\s+)|(\s+$)/g, '');
  }
}

if (!Unique) {
  function Unique(array)
  {
    if (getType(array) != 'array') {
      throw 'Argument error. used not array object.';
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
  }
}

if (!ArrayEqual) {
  function ArrayEqual(x1, x2)
  {
    if (x1.length != x2.length) {
      return false;
    }

    var i = 0, j = 0;
    while (i < x1.length && j < x2.length) {
      if (x1[i] != x2[j]) {
        return false;
      }
      i++;
      j++;
    }
    return true;
  }
}

if (!Sleep) {
  function Sleep(T) {
    var d1 = new Date().getTime();
    var d2 = new Date().getTime();
    while (d2 < d1 + T) {
      d2 = new Date().getTime();
    }
  }
}
