(function(window) {
  "use strict";

  function escapeForRegExp(string) {
    console.assert(toType(string) === 'string', "not string type.");

    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  }

  function decodeForRegExp(string) {
    console.assert(toType(string) === 'string', "not string type.");

    return string.replace(/\\([-\/\\^$*+?.()|[\]{}])/g, '$1');
  }

  /**
   * closureCreateMapObserve
   *
   * This provides the function like object.observe by using the Map.
   *
   * @param {function} pChangedCallback -
   *     Function that will be called when a value is changed.
   * @return {object} Return the object for operating.
   *     Available functions.
   *         get(key: any) - returns the value of keyName.
   *         forEach(callback: function) -
   *             Iterative processing of Map in closure.
   *             Arguments of callback were value, key, map object.
   *         set(key: any, value: any) - Key and Value that you want to set.
   *         delete(key: any) - you want to delete Key.
   *         clear() - all delete items in Map.
   *         has(key: any) - If Key is found, return true.
   *                         false if it isn't found.
   *         size() -  returns the count of item in Map.
   *         setCallbackWhenChanged(callback: function) -
   *             called Function If the value of Map
   *             is added, updated, or deleted.
   *
   *             argument of callback function is the object only.
   */
  function closureCreateMapObserve(pChangedCallback)//{{{
  {
    console.assert(
        toType(pChangedCallback) === 'function' ||
        pChangedCallback === void 0 ||
        pChangedCallback === null,
        "not any type in function, undefined, ot null.");

    let unloadeds = new Map();

    return {
      get: function(pAnyKey) {//{{{
        return unloadeds.get(pAnyKey);
      },//}}}
      forEach: function(pFuncCallback) {//{{{
        console.assert(toType(pFuncCallback) === 'function',
            "not function type.");

        unloadeds.forEach(pFuncCallback);
      },//}}}
      set: function(pAnyKey, pAnyValue) {//{{{
        let change   = {};
        let old_value = null;

        change = {
          key:   pAnyKey,
          value: pAnyValue,
        };
        old_value = unloadeds.get(pAnyKey);

        if (old_value === void 0) {
          change['type'] = 'add';
        } else {
          change['type']     = 'update';
          change['oldValue'] = old_value;
        }

        unloadeds.set(pAnyKey, pAnyValue);

        if (toType(pChangedCallback) === 'function') {
          pChangedCallback(change);
        } else {
          console.warn("you should set the callback function.");
        }
      },//}}}
      delete: function(pAnyKey) {//{{{
        let change   = {};
        let old_value = null;

        change = {
          key:  pAnyKey,
          type: 'delete',
        };

        old_value = unloadeds.get(pAnyKey);
        if (old_value !== void 0) {
          change['oldValue'] = unloadeds.get(pAnyKey);
        }

        unloadeds.delete(pAnyKey);

        if (toType(pChangedCallback) === 'function') {
          pChangedCallback(change);
        } else {
          console.warn("you should set the callback function.");
        }
      },//}}}
      clear: function() {//{{{
        unloadeds.clear();
      },//}}}
      has: function(pAnyKey) {//{{{
        return unloadeds.has(pAnyKey);
      },//}}}
      size: function() {//{{{
        return unloadeds.size;
      },//}}}
      setCallbackWhenChanged: function(pCallbackWhenChanged)//{{{
      {
        console.assert(
            toType(pCallbackWhenChanged) === 'function', "not function type");

        pChangedCallback = pCallbackWhenChanged;
      },//}}}
    };
  }//}}}

  /**
   * ajax
   *
   * Function for use Ajax process with XMLHttpRequest.
   *
   * @param {object} pOpts - The options for Ajax.
   * @param {string} pOpts.url - You want to get the url.
   * @param {boolean} [pOpts.async] - Do you want to use async process?.
   * @param {string} [pOpts.user] -
   *     The user name to use for authentication purposes.
   * @param {string} [pOpts.password] -
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
  function ajax(pOpts)//{{{
  {
    console.assert(toType(pOpts) === 'object', "not object type.");

    return new Promise(function(resolve, reject) {
      let method        = pOpts.method || 'GET';
      let url           = pOpts.url;
      let async         = pOpts.async || true;
      let user          = pOpts.user || '';
      let password      = pOpts.password || '';
      let timeout       = (pOpts.timeout || 60) * 1000;
      let mimetype      = pOpts.mimeType;
      let headers       = pOpts.headers;
      let data          = pOpts.data || null;
      let response_type = pOpts.responseType;
      let ready_state_change_callback = pOpts.readyStateChange;

      let requrest = new XMLHttpRequest();
      requrest.open(method, url, async, user, password);
      requrest.timeout = timeout;
      if (headers !== void 0 && headers !== null) {
        if (headers.length !== 2) {
          reject(
            new Error('headers is not array type, or array size is not 2.'));
          return;
        }
        requrest.setRequestHeader.apply(null, headers);
      }
      if (ready_state_change_callback !== void 0 &&
          ready_state_change_callback !== null) {
        requrest.onreadystatechange = ready_state_change_callback;
      }
      if (mimetype !== void 0 && mimetype !== null) {
        requrest.overrideMimeType(mimetype);
      }
      if (response_type !== void 0 && response_type !== null) {
        requrest.responseType = response_type;
      }

      requrest.ontimeout = function() {
        reject(new Error('timeout: \n' + JSON.stringfy(pOpts, '    ')));
      };
      requrest.onload = function() {
        resolve({
          status:   requrest.status,
          response: this.response,
          xhr:      requrest,
        });
      };
      requrest.onerror = function(pErr) {
        reject(new Error(JSON.stringify(pErr)));
      };
      requrest.send(data);
    });
  }//}}}

  function loadTranslation(pElement, pUrl) //{{{
  {
    console.assert(toType(pUrl) === 'string', 'not string type.');
    console.assert(
        toType(pElement) !== void 0 &&
        toType(pElement) !== null,
        'any type in undefined or null.');

    return new Promise((resolve, reject) => {
      ajax({ url: pUrl }).then(pObjResult => {
        if (pObjResult.status === 200) {
          let target = JSON.parse(pObjResult.response);
          let snapshot =
            document.evaluate('//*[@translation]', pElement, null, 7, null);

          let item, text_name;
          for (let i = 0; i < snapshot.snapshotLength; ++i) {
            item      = snapshot.snapshotItem(i);
            text_name = item.getAttribute('translation');
            if (target.hasOwnProperty(text_name)) {
              item.innerHTML = chrome.i18n.getMessage(text_name);
            }
          }
          resolve();
        } else {
          reject(new Error(pObjResult.xhr.statusText));
        }
      })
      .catch(reject);
    });
  }//}}}

  // base program.
  // https://stackoverflow.com/questions/879152/how-do-i-make-javascript-beep
  function closureCreateBeep(pAudioCtx)//{{{
  {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audio_ctx    = pAudioCtx || new AudioContext();

    /**
     * beep
     *
     * sound the beep.
     *
     * @param {number} [pDuration] -
     *     duration of the tone in milliseconds. Default is 500.
     * @param {number} [pFurequency] -
     *     frequency of the tone is hertz. default is 440.
     * @param {number} [pVolume] -
     *     volume of the tone. default is 1, off is 0.
     * @param {string} [pType] -
     *     type of tone.
     *     Possible values are sine, square, sawtooth, triangle, and custom.
     *     default is sine.
     * @return {promise} the promise object.
     */
    function beep(pDuration, pFurequency, pVolume, pType) {
      console.assert(toType(pDuration) === 'number', "not number type.");
      console.assert(toType(pFurequency) === 'number', "not number type.");
      console.assert(toType(pVolume) === 'number', "not number type.");
      console.assert(toType(pType) === 'string', "not string type.");

      return new Promise(resolve => {
        let audio_oscillator = audio_ctx.createOscillator();
        let audio_gain_node  = audio_ctx.createGain();

        audio_oscillator.connect(audio_gain_node);
        audio_gain_node.connect(audio_ctx.destination);

        audio_gain_node.gain.value       = pVolume || 500;
        audio_oscillator.frequency.value = pFurequency || 440;
        audio_oscillator.type            = pType || 'sine';
        audio_oscillator.onended         = resolve;

        audio_oscillator.start();
        setTimeout(
          () => audio_oscillator.stop(), (pDuration ? pDuration : 500));
      });
    }

    return beep;
  }//}}}

  function getSplitURI(pUrl)//{{{
  {
    console.assert(toType(pUrl) === 'string', "not string type.");

    let result = /(\w+):\/+([\w-.~]+[:\d]*)(\/[\w-.~]*)\?*(.*)/i.exec(pUrl);
    if (result === null) {
      throw new Error(`pStrUri is not uri: ${pUrl}`);
    }

    return {
      scheme:   result[1] || null,
      hostname: result[2] || null,
      path:     result[3] || null,
      params:   result[4] || null,
    };
  }//}}}

  function getListAfterJoinHistoryDataOnDB(pSessions)//{{{
  {
    console.assert(toType(pSessions) === 'array', "not array type.");

    return new Promise(function(resolve) {
      let histories = pSessions[0];
      let pageInfos = pSessions[1];
      let dataURIs  = pSessions[2];

      let page_info = {};
      pageInfos.forEach(pValue => {
        page_info[pValue.url] = { title: pValue.title, host: pValue.host };
      });

      let data_uri = {};
      dataURIs.forEach(pValue => {
        data_uri[pValue.host] = pValue.dataURI;
      });

      let date        = null;
      let date_temp   = null;
      let date_add    = null;
      let list_result = [];
      let list_data   = [];
      let to_add      = {};
      histories.forEach(pValue => {
        let page = page_info[pValue.url];
        if (page === void 0 || page === null) {
          console.warn("Don't find data in pageInfo of indexedDB.", pValue.url);
          return;
        }

        date = new Date(pValue.date);
        if (!date_temp) {
          date_temp = date;
        }

        if (formatDate(date_temp, 'YYYY/MM/DD') !==
            formatDate(date, 'YYYY/MM/DD')) {
          date_add = new Date(date_temp.getFullYear(),
                              date_temp.getMonth(),
                              date_temp.getDate(),
                              0, 0, 0, 0);
          list_result.push({ date : date_add, data : list_data });
          date_temp = date;
          list_data = [];
        }

        to_add = {
          date    : pValue.date,
          url     : pValue.url,
          title   : page.title,
          host    : page.host,
          dataURI : data_uri[page.host] || gMapIcons.get(NORMAL),
        };
        if (pValue.id) { to_add.id = pValue.id; }
        if (pValue.windowId) { to_add.windowId = pValue.windowId; }

        list_data.push(to_add);
      });

      if (list_data.length > 0) {
        date_add = new Date(date_temp.getFullYear(),
                            date_temp.getMonth(),
                            date_temp.getDate(),
                            0, 0, 0, 0);
        list_result.push({ date : date_add, data : list_data });
      }

      resolve(list_result);
    });
  }//}}}

  /**
   * Get history list.
   * @param {Database} pInstanceDB -
   *     the instance of Database class in indexedDB.js.
   * @param {String} pDbName - the target history name in indexedDB.
   * @return {Promise} return promise.
   */
  function getHistoryListFromIndexedDB(pInstanceDB, pDbName)//{{{
  {
    console.assert(toType(pDbName) === 'string', "not string type.");

    return new Promise((resolve, reject) => {
      let promise_results = [];
      promise_results.push( pInstanceDB.getAll({ name: pDbName }) );
      promise_results.push( pInstanceDB.getAll({ name: gStrDbPageInfoName }) );
      promise_results.push( pInstanceDB.getAll({ name: gStrDbDataURIName }) );

      Promise.all(promise_results)
        .then(getListAfterJoinHistoryDataOnDB)
        .then(resolve)
        .catch(reject);
    });
  }//}}}

  /**
   * 受け取った引数を分解し、連想配列(ハッシュ)として返す。
   * @param {object} pElement - You want to get the queries is HTMLElement.
   * @return {Object} 引数を表す連想配列。キーは受け取った引数名。
   *                  引数がない場合はnullが返る。
   */
  function getQueryString(pElement)//{{{
  {
    if (pElement.location.search.length > 1) {
      // 最初の1文字(?)を除いた文字列を取得
      let query = decodeURIComponent(pElement.location.search.substring(1));

      // 引数ごとに分割
      let parameters = query.split('&');
      let result     = {};
      let elements   = [];
      let param_name  = "";
      let parama_value = "";

      parameters.forEach(pValue => {
        elements = pValue.split('=');
        if (elements[0] === '' ||
            elements[1] === undefined ||
            elements[1] === null) {
          return;
        }

        param_name         = elements[0];
        parama_value       = decodeURIComponent(elements[1]);
        result[param_name] = parama_value;
      });

      return result;
    }

    return null;
  }//}}}

  function closureGetDataURI()//{{{
  {
    function getDataType(pBuffers)//{{{
    {
      if (pBuffers[0] === 0xFF &&
          pBuffers[1] === 0xD8 &&
          pBuffers[pBuffers.byteLength - 2] === 0xFF &&
          pBuffers[pBuffers.byteLength - 1] === 0xD9) {
        return 'image/jpeg';
      } else if (pBuffers[0] === 0x89 && pBuffers[1] === 0x50 &&
                 pBuffers[2] === 0x4E && pBuffers[3] === 0x47) {
        return 'image/png';
      } else if (pBuffers[0] === 0x47 && pBuffers[1] === 0x49 &&
                 pBuffers[2] === 0x46 && pBuffers[3] === 0x38) {
        return 'image/gif';
      } else if (pBuffers[0] === 0x42 && pBuffers[1] === 0x4D) {
        return 'image/bmp';
      } else if (pBuffers[0] === 0x00 &&
                 pBuffers[1] === 0x00 &&
                 pBuffers[2] === 0x01) {
        return 'image/x-icon';
      } else {
        return 'image/unknown';
      }
    }//}}}

    function getDataURI(pUrl)//{{{
    {
      console.assert(toType(pUrl) === 'string', "not string type.");

      return new Promise(function(resolve, reject) {
        ajax({
          url:          pUrl,
          responseType: 'arraybuffer',
        }).then(pResult => {
          if (pResult.status === 200) {
            let uint8_array = new Uint8Array(pResult.response);
            let data_type   = getDataType(uint8_array);

            let binary_data = '';
            for (let i = 0; i < uint8_array.byteLength; ++i) {
              binary_data += String.fromCharCode(uint8_array[i]);
            }

            resolve(`data:${data_type};base64,${window.btoa(binary_data)}`);
          } else {
            reject(new Error(pResult.xhr.statusText));
          }
        }).catch(reject);
      });
    }//}}}

    return getDataURI;
  }//}}}

  function hasStringOfAttributeOfElement(pElement, pAttrName, pAdd)//{{{
  {
    console.assert(toType(pAttrName) === 'string', "not string type.");

    let regex = new RegExp(`(^|\\s+)${pAdd}`, '');
    return regex.test(pElement.getAttribute(pAttrName));
  }//}}}

  function addStringToAttributeOfElement(pElement, pAttrName, pAdd)//{{{
  {
    console.assert(toType(pAttrName) === 'string', "not string type.");

    if (!hasStringOfAttributeOfElement(pElement, pAttrName, pAdd)) {
      let attr = pElement.getAttribute(pAttrName);
      pElement.setAttribute(pAttrName, (attr ? attr + ' ' : '') + pAdd);
      return true;
    }
    return false;
  }//}}}

  function removeStringFromAttributeOfElement(//{{{
    pElement, pAttrName, pRemove, pReplace)
  {
    console.assert(toType(pAttrName) === 'string', "not string type.");
    console.assert(toType(pRemove) === 'string', "not string type.");
    console.assert(
        toType(pReplace) === 'string' ||
        pReplace === void 0 ||
        pReplace === null,
        "not any type in string, undefined, or null.");

    let regex = new RegExp('(^|\\s+)' + pRemove, 'ig');
    let value = pElement.getAttribute(pAttrName);
    if (value) {
      pElement.setAttribute(pAttrName, value.replace(regex, pReplace || ''));
    }
  }//}}}

  /**
   * keyCheck
   * return key information object.
   *
   * @param {Event} pEvent Event on keypress, keydown or keyup.
   * @return {Object} object of key information.
   */
  function keyCheck(pEvent) {//{{{
    console.assert(
        pEvent !== void 0 && pEvent !== null, "any type in undefined or null.");

    return {
      ctrl:    pEvent.ctrlKey,
      alt:     pEvent.altKey,
      shift:   pEvent.shiftKey,
      meta:    pEvent.metaKey,
      keyCode: pEvent.keyCode
    };
  }//}}}

  /**
   * generateKeyString
   * Based on key info create string.
   *
   * @param {Object} pKeyInfo has got return value of keyCheck function.
   * @return {String} result string.
   */
  function generateKeyString(pKeyInfo) //{{{
  {
    console.assert(toType(pKeyInfo) === 'object', "not object type.");

    let output = '';
    if (pKeyInfo.meta)  { output += 'Meta +'; }
    if (pKeyInfo.ctrl)  { output += 'Ctrl +'; }
    if (pKeyInfo.alt)   { output += 'Alt +'; }
    if (pKeyInfo.shift) { output += 'Shift +'; }

    output += ' ';

    /* refernece to
     * http://www.javascripter.net/faq/keycodes.htm */
    switch (pKeyInfo.keyCode) {
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
        /* eslint yoda: "off" */
        if (48 <= pKeyInfo.keyCode && pKeyInfo.keyCode <= 57 || // 0 to 9
            65 <= pKeyInfo.keyCode && pKeyInfo.keyCode <= 90) { // A to Z
          output += String.fromCharCode(pKeyInfo.keyCode);
        } else if (96 <= pKeyInfo.keyCode && pKeyInfo.keyCode <= 105) {
          // Numpad 0 to Numpad 9
          output += 'Numpad ' + (pKeyInfo.keyCode - 96);
        } else if (112 <= pKeyInfo.keyCode && pKeyInfo.keyCode <= 123) {
          // F1 to F12
          output += 'F' + (pKeyInfo.keyCode - 111);
        } else {
          throw new Error('Invalid keyCode.');
        }
        break;
    }

    return output.trim();
  }//}}}

  /* base program.
   * http://javascriptweblog.wordpress.com/2011/08/08/fixing-the-javascript-typeof-operator/
   *
   * I have added about NaN
   */
  function toType(pObj) {//{{{
    let type = ({}).toString.call(pObj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
    if (type === 'global') {
      if (pObj === void 0)    { return 'undefined'; }
      else if (pObj === null) { return 'null'; }
    } else if (type === 'number') {
      if (isNaN(pObj)) { return 'NaN'; }
    }
    return type;
  }//}}}

  /**
   * 日付をフォーマットする
   * http://qiita.com/osakanafish/items/c64fe8a34e7221e811d0
   * @param  {Date}   pDate     日付
   * @param  {String} [pFormat] フォーマット
   * @return {String}          フォーマット済み日付
   */
  function formatDate(pDate, pFormat)//{{{
  {
    console.assert(toType(pFormat) === 'string', "not string type.");

    if (!pFormat) {
      pFormat = 'YYYY-MM-DD hh:mm:ss.SSS';
    }
    pFormat = pFormat.replace(/YYYY/g, pDate.getFullYear());
    pFormat = pFormat.replace(
      /MM/g, ('0' + (pDate.getMonth() + 1)).slice(-2));
    pFormat = pFormat.replace(/DD/g, ('0' + pDate.getDate()).slice(-2));
    pFormat = pFormat.replace(/hh/g, ('0' + pDate.getHours()).slice(-2));
    pFormat = pFormat.replace(
      /mm/g, ('0' + pDate.getMinutes()).slice(-2));
    pFormat = pFormat.replace(
      /ss/g, ('0' + pDate.getSeconds()).slice(-2));
    if (pFormat.match(/S/g)) {
      let millisecond = ('00' + pDate.getMilliseconds()).slice(-3);
      let length = pFormat.match(/S/g).length;
      for (let i = 0; i < length; ++i) {
        pFormat = pFormat.replace(/S/, millisecond.substring(i, i + 1));
      }
    }
    return pFormat;
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
    let args = Array.prototype.slice.call(arguments);
    if (args.length < 2) {
      throw new Error('setObjectProperty arguments is less.');
    }

    let to_add = args[0];
    let name   = args[1];
    let value  = args[2];
    if (toType(name) === 'function') {
      if (name.name.length === 0) {
        throw new Error('a nameless function.');
      }
      if (to_add.hasOwnProperty(name.name)) {
        throw new Error('Already had added to object.', args);
      }

      to_add[name.name] = name;
      return;
    }

    if (to_add.hasOwnProperty(name)) {
      throw new Error('Already had added to object.', args);
    }
    to_add[name] = value;
  }//}}}

  //{{{ method.
  // If you want to minify js file, you must set function name.
  setObjectProperty(window, 'escapeForRegExp', escapeForRegExp);
  setObjectProperty(window, 'decodeForRegExp', decodeForRegExp);
  setObjectProperty(window, 'closureCreateMapObserve', closureCreateMapObserve);
  setObjectProperty(window, 'ajax', ajax);
  setObjectProperty(
    window, 'getListAfterJoinHistoryDataOnDB', getListAfterJoinHistoryDataOnDB);
  setObjectProperty(window, 'closureCreateBeep', closureCreateBeep);
  setObjectProperty(window, 'getSplitURI',       getSplitURI);
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
})(this);
