/**
 * ネイティブで動作する関数の集まり
 */
(function(window) {
  "use strict";

  var ajaxTimeout = 60 * 1000;

  function loadTranslation(document, path) //{{{
  {
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', path, true);
      xhr.ontimeout = function() {
        console.error('timeout. path: ' + path);
      };
      xhr.onload = function() {
        if (xhr.status === 200) {
          var t = JSON.parse(this.response);
          var el = document.evaluate(
            '//*[@translation]', document, null, 7, null);
          var item, textName;
          for (var i = 0; i < el.snapshotLength; i++) {
            item = el.snapshotItem(i);
            textName = item.getAttribute('translation');
            if (t.hasOwnProperty(textName)) {
              item.textContent = chrome.i18n.getMessage(textName);
            }
          }
          resolve(true);
        } else {
          reject(new Error(xhr.statusText));
        }
      };
      xhr.onerror = reject;
      xhr.timeout = ajaxTimeout;
      xhr.send();
    });
  }//}}}

  function getListAfterJoinHistoryDataOnDB(array)//{{{
  {
    return new Promise(function(resolve) {
      var histories = array[0];
      var pageInfos = array[1];
      var dataURIs  = array[2];

      var pageInfoDict = {};
      pageInfos.forEach(function(v) {
        pageInfoDict[v.url] = { title: v.title, host: v.host };
      });

      var dataURIDict = {};
      dataURIs.forEach(function(v) {
        dataURIDict[v.host] = v.dataURI;
      });

      var page;
      var date, tempDate;
      var showList = [];
      var dataList = [];
      histories.forEach(function(v) {
        page = pageInfoDict[v.url];
        if (page === void 0 || page === null) {
          console.warn("Don't find data in pageInfo of indexedDB.", v.url);
          return;
        }

        date = new Date(v.date);
        if (!tempDate) {
          tempDate = date;
        }

        if (formatDate(tempDate, 'YYYY/MM/DD') !==
          formatDate(date, 'YYYY/MM/DD')) {
          showList.push({
            date : new Date(tempDate.getFullYear(),
              tempDate.getMonth(),
              tempDate.getDate(),
              0, 0, 0, 0),
            data : dataList,
          });
            tempDate = date;
            dataList = [];
          }

          dataList.push({
            id      : v.id,
            date    : v.date,
            url     : v.url,
            title   : page.title,
            host    : page.host,
            dataURI : dataURIDict[page.host] || icons[NORMAL],
          });
      });

      if (dataList.length > 0) {
        showList.push({
          date : new Date(tempDate.getFullYear(),
                          tempDate.getMonth(),
                          tempDate.getDate(),
                          0, 0, 0, 0),
          data : dataList,
        });
      }

      resolve(showList);
    });
  }//}}}

  /**
   * Get history list.
   * @param {Database} db - the instance of Database class in indexedDB.js.
   * @param {String} dbName - the target history name in indexedDB.
   * @return {Promise} return promise.
   */
  function getHistoryListFromIndexedDB(db, dbName)//{{{
  {
    return new Promise(function(resolve, reject) {
      var p = [];
      p.push( db.getAll({ name: dbName }) );
      p.push( db.getAll({ name: dbPageInfoName }) );
      p.push( db.getAll({ name: dbDataURIName }) );

      Promise.all(p)
      .then(getListAfterJoinHistoryDataOnDB)
      .then(resolve)
      .catch(reject);
    });
  }//}}}

  /**
   * 受け取った引数を分解し、連想配列(ハッシュ)として返す。
   * @return {Object} 引数を表す連想配列。キーは受け取った引数名。
   *                  引数がない場合はnullが返る。
   */
  function getQueryString(document)//{{{
  {
    if (1 < document.location.search.length) {
      // 最初の1文字(?)を除いた文字列を取得
      var query = decodeURIComponent(document.location.search.substring(1));

      // 引数ごとに分割
      var parameters = query.split('&');
      var result = {};
      for (var i = 0; i < parameters.length; i = (i + 1) | 0) {
        var element = parameters[i].split('=');
        if (element[0] === '' ||
            element[1] === undefined || element[1] === null) {
          continue;
        }

        var paramName = element[0];
        var paramValue = decodeURIComponent(element[1]);
        result[paramName] = paramValue;
      }

      return result;
    }

    return null;
  }//}}}

  function closureGetDataURI(timeout)//{{{
  {
    function getDataType(buf)//{{{
    {
      if (buf[0] === 0xFF &&
          buf[1] === 0xD8 &&
          buf[buf.byteLength - 2] === 0xFF &&
          buf[buf.byteLength - 1] === 0xD9) {
        return 'image/jpeg';
      } else if (buf[0] === 0x89 && buf[1] === 0x50 &&
                 buf[2] === 0x4E && buf[3] === 0x47) {
        return 'image/png';
      } else if (buf[0] === 0x47 && buf[1] === 0x49 &&
                 buf[2] === 0x46 && buf[3] === 0x38) {
        return 'image/gif';
      } else if (buf[0] === 0x42 && buf[1] === 0x4D) {
        return 'image/bmp';
      } else if (buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x01) {
        return 'image/x-icon';
      } else {
        return 'image/unknown';
      }
    }//}}}

    function getDataURI(url)//{{{
    {
      return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.ontimeout = function() {
          console.error('timeout. url: ' + url);
        };
        xhr.onload = function() {
          if (xhr.status === 200) {
            var bytes = new Uint8Array(this.response);
            var dataType = getDataType(bytes);
            var binaryData = '';
            for (var i = 0, len = bytes.byteLength; i < len; i++) {
              binaryData += String.fromCharCode(bytes[i]);
            }

            resolve('data:' + dataType + ';base64,' + window.btoa(binaryData));
          } else {
            reject(new Error(xhr.statusText));
          }
        };
        xhr.onerror = reject;
        xhr.timeout = timeout;
        xhr.send();
      });
    }//}}}

    return getDataURI;
  }//}}}

  /**
   * keyCheck
   * return key information object.
   *
   * @param {Event} e Event on keypress, keydown or keyup.
   * @return {Object} object of key information.
   */
  function keyCheck(e) {//{{{
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
  }//}}}

  /**
   * generateKeyString
   * Based on key info create string.
   *
   * @param {Object} keyInfo has got return value of keyCheck function.
   * @return {String} result string.
   */
  function generateKeyString(keyInfo) {//{{{
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
      case 8:   output += 'BackSpace'; break;
      case 9:   output += 'Tab'; break;
      case 12:  output += 'Numpad 5'; break;
      case 13:  output += 'Enter'; break;
      case 19:  output += 'Pause'; break;
      case 20:  output += 'CapsLock'; break;
      case 27:  output += 'Esc'; break;
      case 32:  output += 'Space'; break;
      case 33:  output += 'Page Up'; break;
      case 34:  output += 'Page Down'; break;
      case 35:  output += 'End'; break;
      case 36:  output += 'Home'; break;
      case 37:  output += 'Left'; break;
      case 38:  output += 'Up'; break;
      case 39:  output += 'Right'; break;
      case 40:  output += 'Down'; break;
      case 44:  output += 'PrintScreen'; break;
      case 45:  output += 'Insert'; break;
      case 46:  output += 'Delete'; break;
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

    return output.trim();
  }//}}}

  /* base program.
   * http://javascriptweblog.wordpress.com/2011/08/08/fixing-the-javascript-typeof-operator/
   */
  function toType(obj) {//{{{
    var type = ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
    if (type === 'global') {
      if (obj === void 0) { return 'undefined'; }
      else if (obj === null) { return 'null'; }
    }
    return type;
  }//}}}

  /**
   * 日付をフォーマットする
   * http://qiita.com/osakanafish/items/c64fe8a34e7221e811d0
   * @param  {Date}   date     日付
   * @param  {String} [format] フォーマット
   * @return {String}          フォーマット済み日付
   */
  function formatDate(date, format)//{{{
  {
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
  }//}}}

  function setObjectProperty(obj, name, value)//{{{
  {
    if (obj.hasOwnProperty(name)) {
      throw new Error('Already had added to object.', obj, name, value);
    }

    obj[name] = value;
  }//}}}

  //{{{ method.
  setObjectProperty(window,
    'getListAfterJoinHistoryDataOnDB', getListAfterJoinHistoryDataOnDB);
  setObjectProperty(window,
    'getHistoryListFromIndexedDB', getHistoryListFromIndexedDB);
  setObjectProperty(window, 'loadTranslation', loadTranslation);
  setObjectProperty(window, 'getQueryString', getQueryString);
  setObjectProperty(window, 'getDataURI', closureGetDataURI(ajaxTimeout));
  setObjectProperty(window, 'keyCheck', keyCheck);
  setObjectProperty(window, 'generateKeyString', generateKeyString);
  setObjectProperty(window, 'toType', toType);
  setObjectProperty(window, 'formatDate', formatDate);
  //}}}
})(window);
