/**
 * ネイティブで動作する関数の集まり
 */
(function(window) {
  "use strict";

  /**
   * ajax
   *
   * Function for use Ajax process with XMLHttpRequest.
   *
   * @param {object} obj - The options for Ajax.
   * @param {string} obj.url - You want to get the url.
   * @param {boolean} [obj.async] - Do you want to use async process?.
   * @param {string} [obj.user] -
   *     The user name to use for authentication purposes.
   * @param {string} [obj.password] -
   *     The password to use for authentication purposes.
   * @param {number} [timeout] - The time to occur timeout. to set seconds time.
   * @param {string} [mimeType] - You want to set mimeType.
   * @param {array of string} [headers] - You want to set the array of header.
   *     [ headerName, headerValue ]
   * @param {(ArrayBufferView|Blob|Document|DomString?FormData)}
   *     [data] - You want to send the data.
   * @param {string} [responseType] - You want to get a response type.
   *     You are able to select from among the following:
   *         "" - default
   *         "arraybuffer" - ArrayBuffer
   *         "blob" - Blob
   *         "document" - Document
   *         "text" - String
   *         "json" - json object.
   * @param {function} [readyStateChange] -
   *     Call the function when each time the state change is changed.
   * @return {promise} a promise object.
   */
  function ajax(obj)//{{{
  {
    var method           = obj.method || 'GET';
    var url              = obj.url;
    var async            = obj.async || true;
    var user             = obj.user || '';
    var password         = obj.password || '';
    var timeout          = (obj.timeout || 60) * 1000;
    var mimeType         = obj.mimeType;
    var headers          = obj.headers;
    var data             = obj.data || null;
    var responseType     = obj.responseType;
    var readyStateChange = obj.readyStateChange;

    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();

      xhr.open(method, url, async, user, password);
      xhr.timeout = timeout;
      if (headers !== void 0 && headers !== null) {
        if (headers.length !== 2) {
          reject(
            new Error('headers is not array type, or array size is not 2.'));
          return;
        }
        xhr.setRequestHeader.apply(null, headers);
      }
      if (readyStateChange !== void 0 && readyStateChange !== null) {
        xhr.onreadystatechange = readyStateChange;
      }
      if (mimeType !== void 0 && mimeType !== null) {
        xhr.overrideMimeType(mimeType);
      }
      if (responseType !== void 0 && responseType !== null) {
        xhr.responseType = responseType;
      }

      xhr.ontimeout = function() {
        reject(new Error('timeout: ' + obj));
      };
      xhr.onload = function() {
        resolve({
          status:   xhr.status,
          response: this.response,
          xhr:      xhr,
        });
      };
      xhr.onerror = function(e) {
        reject(new Error(e));
      };
      xhr.send(data);
    });
  }//}}}

  function loadTranslation(document, url) //{{{
  {
    return new Promise((resolve, reject) => {
      ajax({ url: url }).then(ret => {
        if (ret.status === 200) {
          var t = JSON.parse(ret.response);
          var el = document.evaluate(
            '//*[@translation]', document, null, 7, null);
          var item, textName;
          var i = 0;
          while (i < el.snapshotLength) {
            item = el.snapshotItem(i);
            textName = item.getAttribute('translation');
            if (t.hasOwnProperty(textName)) {
              item.textContent = chrome.i18n.getMessage(textName);
            }

            ++i;
          }
          resolve();
        } else {
          reject(new Error(ret.xhr.statusText));
        }
      })
      .catch(reject);
    });
  }//}}}

  function getHostName(url)//{{{
  {
    console.log('getHostName', url);

    var result = /\/\/([\w-.~]*)\//i.exec(url);
    if (result) {
      return result[1];
    } else {
      console.error("Don't get hostname.", url);
      return null;
    }
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
            dataURI : dataURIDict[page.host] || icons.get(NORMAL),
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
      var i = 0;
      var element, paramName, paramValue;
      while (i < parameters.length) {
        element = parameters[i].split('=');
        if (element[0] === '' ||
            element[1] === undefined ||
            element[1] === null) {
          ++i;
          continue;
        }

        paramName = element[0];
        paramValue = decodeURIComponent(element[1]);
        result[paramName] = paramValue;

        ++i;
      }

      return result;
    }

    return null;
  }//}}}

  function closureGetDataURI()//{{{
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
        ajax({
          url: url,
          responseType: 'arraybuffer',
        }).then(ret => {
          if (ret.status === 200) {
            var bytes = new Uint8Array(ret.response);
            var dataType = getDataType(bytes);
            var binaryData = '';
            var i = 0;
            while (i < bytes.byteLength) {
              binaryData += String.fromCharCode(bytes[i]);
              ++i;
            }

            resolve('data:' + dataType + ';base64,' + window.btoa(binaryData));
          } else {
            reject(new Error(ret.xhr.statusText));
          }
        }).catch(reject);
      });
    }//}}}

    return getDataURI;
  }//}}}

  function hasStringOfAttributeOfElement(element, attrName, addStr)//{{{
  {
    var re = new RegExp('(^|\\s+)' + addStr, '');
    return re.test(element.getAttribute(attrName));
  }//}}}

  function addStringToAttributeOfElement(element, attrName, addStr)//{{{
  {
    if (!hasStringOfAttributeOfElement(element, attrName, addStr)) {
      var oldAttribute = element.getAttribute(attrName);
      element.setAttribute(
        attrName, (oldAttribute ? oldAttribute + ' ' : '') + addStr);
      return true;
    }
    return false;
  }//}}}

  function removeStringFromAttributeOfElement(//{{{
    element, attrName, removeStr, replaceStr)
  {
    var re = new RegExp('(^|\\s+)' + removeStr, 'ig');
    var value = element.getAttribute(attrName);
    if (value) {
      element.setAttribute(attrName, value.replace(re, replaceStr || ''));
    }
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
      var i = 0;
      while (i < length) {
        format = format.replace(/S/, milliSeconds.substring(i, i + 1));
        ++i;
      }
    }
    return format;
  }//}}}

  /**
   * setObjectProperty
   *
   * @param {object} obj - add to object.
   * @param {string or function} name - add to a name, or function.
   *      If it nameless function is an error.
   * @param {any} [value] - add any object to obj.
   */
  function setObjectProperty()//{{{
  {
    console.log('setObjectProperty', arguments);
    var args = Array.prototype.slice.call(arguments);
    if (args.length < 2) {
      throw new Error('setObjectProperty arguments is less.');
    }

    var obj = args[0];
    var name = args[1];
    var value = args[2];
    if (toType(name) === 'function') {
      if (name.name.length === 0) {
        throw new Error('a nameless function.');
      }
      if (obj.hasOwnProperty(name.name)) {
        throw new Error('Already had added to object.', obj, name.name);
      }

      obj[name.name] = name;
      return;
    }

    if (obj.hasOwnProperty(name)) {
      throw new Error('Already had added to object.', obj, name, value);
    }
    obj[name] = value;
  }//}}}

  //{{{ method.
  // If you want to minify js file, you must set function name.
  setObjectProperty(window, 'ajax', ajax);
  setObjectProperty(
    window, 'getListAfterJoinHistoryDataOnDB', getListAfterJoinHistoryDataOnDB);
  setObjectProperty(window, 'getHostName',       getHostName);
  setObjectProperty(
    window, 'getHistoryListFromIndexedDB',       getHistoryListFromIndexedDB);
  setObjectProperty(window, 'loadTranslation',   loadTranslation);
  setObjectProperty(window, 'getQueryString',    getQueryString);
  setObjectProperty(window, 'getDataURI',        closureGetDataURI());
  setObjectProperty(window, 'hasStringOfAttributeOfElement',
                    hasStringOfAttributeOfElement);
  setObjectProperty(window, 'addStringToAttributeOfElement',
                    addStringToAttributeOfElement);
  setObjectProperty(window, 'removeStringFromAttributeOfElement',
                    removeStringFromAttributeOfElement);
  setObjectProperty(window, 'keyCheck',          keyCheck);
  setObjectProperty(window, 'generateKeyString', generateKeyString);
  setObjectProperty(window, 'toType',            toType);
  setObjectProperty(window, 'formatDate',        formatDate);
  setObjectProperty(window, 'setObjectProperty', setObjectProperty);
  //}}}
})(window);
