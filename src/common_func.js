/*jshint unused: false*/
/**
 * ネイティブで動作する関数の集まり
 */
(function(window) {
  "use strict";
  /**
   * keyCheck
   * return key information object.
   *
   * @param {Event} e Event on keypress, keydown or keyup.
   * @return {Object} object of key information.
   */
  window.keyCheck = window.keyCheck || function(e) {
    if (e === void 0) {
      throw new Error("Invalid argument. don't get event object.");
    }

    return {
      ctrl: e.ctrlKey,
      alt: e.altKey,
      shift: e.shiftKey,
      meta: e.metaKey,
      keyCode: e.keyCode
    };
  };

  /**
   * generateKeyString
   * Based on key info create string.
   *
   * @param {Object} keyInfo has got return value of keyCheck function.
   * @return {String} result string.
   */
  window.generateKeyString = window.generateKeyString || function(keyInfo) {
    if (toType(keyInfo) !== 'object') {
      throw new Error('Invalid type of argument.');
    }

    var output = '';
    if (keyInfo.meta) { output += 'Meta +'; }
    if (keyInfo.ctrl) { output += 'Ctrl +'; }
    if (keyInfo.alt) { output += 'Alt +'; }
    if (keyInfo.shift) { output += 'Shift +'; }

    output += ' ';

    /* refernece to
     * http://www.javascripter.net/faq/keycodes.htm */
    switch (keyInfo.keyCode) {
      case 8: output += 'BackSpace'; break;
      case 9: output += 'Tab'; break;
      case 12: output += 'Numpad 5'; break;
      case 13: output += 'Enter'; break;
      case 19: output += 'Pause'; break;
      case 20: output += 'CapsLock'; break;
      case 27: output += 'Esc'; break;
      case 32: output += 'Space'; break;
      case 33: output += 'Page Up'; break;
      case 34: output += 'Page Down'; break;
      case 35: output += 'End'; break;
      case 36: output += 'Home'; break;
      case 37: output += 'Left'; break;
      case 38: output += 'Up'; break;
      case 39: output += 'Right'; break;
      case 40: output += 'Down'; break;
      case 44: output += 'PrintScreen'; break;
      case 45: output += 'Insert'; break;
      case 46: output += 'Delete'; break;
      case 106: output += 'Numpad*'; break;
      case 107: output += 'Numpad+'; break;
      case 109: output += 'Numpad-'; break;
      case 110: output += 'Numpad.'; break;
      case 111: output += 'Numpad/'; break;
      case 144: output += 'NumLock'; break;
      case 145: output += 'ScrollLock'; break;
      case 188: output += ','; break;
      case 190: output += '.'; break;
      case 191: output += '/'; break;
      case 192: output += '`'; break;
      case 219: output += '['; break;
      case 220: output += '\\'; break;
      case 221: output += ']'; break;
      case 222: output += '\''; break;
      default:
        if (48 <= keyInfo.keyCode && keyInfo.keyCode <= 57 || // 0 to 9
            65 <= keyInfo.keyCode && keyInfo.keyCode <= 90) { // A to Z
          output += String.fromCharCode(keyInfo.keyCode);
        } else if (96 <= keyInfo.keyCode && keyInfo.keyCode <= 105) {
          // Numpad 0 to Numpad 9
          output += 'Numpad ' + (keyInfo.keyCode - 96);
        } else if (112 <= keyInfo.keyCode && keyInfo.keyCode <= 123) {
          // F1 to F12
          output += 'F' + (keyInfo.keyCode - 111);
        } else {
          throw new Error('Invalid keyCode.');
        }
        break;
    }

    return trim(output);
  };

  /* base program.
   * http://javascriptweblog.wordpress.com/2011/08/08/fixing-the-javascript-typeof-operator/
   */
  window.toType = window.toType || function(obj) {
    var type = ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
    if (type === 'global') {
      if (obj === void 0) { return 'undefined'; }
      else if (obj === null) { return 'null'; }
    }
    return type;
  };

  /**
   * 日付をフォーマットする
   * http://qiita.com/osakanafish/items/c64fe8a34e7221e811d0
   * @param  {Date}   date     日付
   * @param  {String} [format] フォーマット
   * @return {String}          フォーマット済み日付
   */
  window.formatDate = window.formatDate || function(date, format) {
    if (!format) {
      format = 'YYYY-MM-DD hh:mm:ss.SSS';
    }
    format = format.replace(/YYYY/g, date.getFullYear());
    format = format.replace(/MM/g, ('0' + (date.getMonth() + 1)).slice(-2));
    format = format.replace(/DD/g, ('0' + date.getDate()).slice(-2));
    format = format.replace(/hh/g, ('0' + date.getHours()).slice(-2));
    format = format.replace(/mm/g, ('0' + date.getMinutes()).slice(-2));
    format = format.replace(/ss/g, ('0' + date.getSeconds()).slice(-2));
    if (format.match(/S/g)) {
      var milliSeconds = ('00' + date.getMilliseconds()).slice(-3);
      var length = format.match(/S/g).length;
      for (var i = 0; i < length; i++) {
        format = format.replace(/S/, milliSeconds.substring(i, i + 1));
      }
    }
    return format;
  };

  window.trim = window.trim || function(string) {
    if (toType(string) !== 'string') {
      throw new Error('Argument error. used not string object.');
    }
    return string.replace(/(^\s+)|(\s+$)/g, '');
  };

  window.compareObject = window.compareObject || function(leftObj, rightObj) {
    if (leftObj === void 0 || rightObj === void 0) {
      throw new Error('Invalid type of arguments.');
    }

    var key;
    for (key in leftObj) {
      if (!rightObj.hasOwnProperty(key) || leftObj[key] !== rightObj[key]) {
        return false;
      }
    }

    for (key in rightObj) {
      if (!leftObj.hasOwnProperty(key) || leftObj[key] !== rightObj[key]) {
        return false;
      }
    }
    return true;
  };

  window.unique = window.unique || function(array) {
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
  };

  window.arrayEqual = window.arrayEqual || function(x1, x2) {
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
  window.sleep = window.sleep || function(T) {
    var d1 = new Date().getTime();
    var d2 = new Date().getTime();
    while (d2 < d1 + T) {
      d2 = new Date().getTime();
    }
  };

  window.dictSize = window.dictSize || function(dict) {
    var c = 0;
    for (var _ in dict) {
      c++;
    }
    return c;
  };

  window.equals = window.equals || function(l, r) {
    if (toType(l) === toType(r)) {
      throw new Error('Do not equal argument type.');
    }

    if (toType(l) === 'object') {
      return window.compareObject(l, r);
    } else {
      return window.arrayEqual(l, r);
    }
  };
})(window);
