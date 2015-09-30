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
  function ajax(pObjOpts)//{{{
  {
    var lStrMethod            = pObjOpts.method || 'GET';
    var lStrUrl               = pObjOpts.url;
    var lBoolAsync            = pObjOpts.async || true;
    var lStrUser              = pObjOpts.user || '';
    var lStrPassword          = pObjOpts.password || '';
    var lNumTimeout           = (pObjOpts.timeout || 60) * 1000;
    var lStrMimeType          = pObjOpts.mimeType;
    var lArrayHeaders         = pObjOpts.headers;
    var lData                 = pObjOpts.data || null;
    var lStrResponseType      = pObjOpts.responseType;
    var lFuncReadyStateChange = pObjOpts.readyStateChange;
    var lXmlHttpReq           = new XMLHttpRequest();

    return new Promise(function(resolve, reject) {
      lXmlHttpReq = new XMLHttpRequest();

      lXmlHttpReq.open(lStrMethod, lStrUrl, lBoolAsync, lStrUser, lStrPassword);
      lXmlHttpReq.timeout = lNumTimeout;
      if (lArrayHeaders !== void 0 && lArrayHeaders !== null) {
        if (lArrayHeaders.length !== 2) {
          reject(
            new Error('headers is not array type, or array size is not 2.'));
          return;
        }
        lXmlHttpReq.setRequestHeader.apply(null, lArrayHeaders);
      }
      if (lFuncReadyStateChange !== void 0 && lFuncReadyStateChange !== null) {
        lXmlHttpReq.onreadystatechange = lFuncReadyStateChange;
      }
      if (lStrMimeType !== void 0 && lStrMimeType !== null) {
        lXmlHttpReq.overrideMimeType(lStrMimeType);
      }
      if (lStrResponseType !== void 0 && lStrResponseType !== null) {
        lXmlHttpReq.responseType = lStrResponseType;
      }

      lXmlHttpReq.ontimeout = function() {
        reject(new Error('timeout: \n' + JSON.stringfy(pObjOpts, '    ')));
      };
      lXmlHttpReq.onload = function() {
        resolve({
          status:   lXmlHttpReq.status,
          response: this.response,
          xhr:      lXmlHttpReq,
        });
      };
      lXmlHttpReq.onerror = function(e) {
        reject(new Error(e));
      };
      lXmlHttpReq.send(lData);
    });
  }//}}}

  function loadTranslation(pElement, pStrUrl) //{{{
  {
    return new Promise((resolve, reject) => {
      var lStrTarget       = "";
      var lElementSnapshot = null;
      var lElItem          = document.createDocumentFragment();
      var lStrTextName     = "";
      var i                = 0;

      ajax({ url: pStrUrl }).then(pObjResult => {
        if (pObjResult.status === 200) {
          lStrTarget = JSON.parse(pObjResult.response);
          lElementSnapshot =
            pElement.evaluate('//*[@translation]', pElement, null, 7, null);

          for (i = 0; i < lElementSnapshot.snapshotLength; i = (i + 1) | 0) {
            lElItem      = lElementSnapshot.snapshotItem(i);
            lStrTextName = lElItem.getAttribute('translation');
            if (lStrTarget.hasOwnProperty(lStrTextName)) {
              lElItem.textContent = chrome.i18n.getMessage(lStrTextName);
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

  function getHostName(pStrUrl)//{{{
  {
    console.info('getHostName', pStrUrl);

    var lArrayResult = /\/\/([\w-.~]*)\//i.exec(pStrUrl);
    if (lArrayResult) {
      return lArrayResult[1];
    } else {
      console.error("Don't get hostname.", pStrUrl);
      return null;
    }
  }//}}}

  function getListAfterJoinHistoryDataOnDB(pArraySessions)//{{{
  {
    return new Promise(function(resolve) {
      var histories    = [];
      var pageInfos    = [];
      var dataURIs     = [];
      var lDate        = new Date();
      var lDateTemp    = new Date();
      var lDateAdd     = new Date();
      var rListResult  = [];
      var lListData    = [];
      var lObjPageInfo = {};
      var lObjDataURI  = {};
      var lObjPage     = {};
      var lObjAdd      = {};

      histories = pArraySessions[0];
      pageInfos = pArraySessions[1];
      dataURIs  = pArraySessions[2];

      lObjPageInfo = {};
      pageInfos.forEach(pValue => {
        lObjPageInfo[pValue.url] = { title: pValue.title, host: pValue.host };
      });

      lObjDataURI = {};
      dataURIs.forEach(pValue => {
        lObjDataURI[pValue.host] = pValue.dataURI;
      });

      rListResult = [];
      lListData   = [];
      lDateTemp   = null;
      histories.forEach(pValue => {
        lObjPage = lObjPageInfo[pValue.url];
        if (lObjPage === void 0 || lObjPage === null) {
          console.warn(
            "Don't find data in pageInfo of indexedDB.", pValue.url);
          return;
        }

        lDate = new Date(pValue.date);
        if (!lDateTemp) {
          lDateTemp = lDate;
        }

        if (formatDate(lDateTemp, 'YYYY/MM/DD') !==
            formatDate(lDate, 'YYYY/MM/DD')) {
          lDateAdd = new Date(lDateTemp.getFullYear(),
                              lDateTemp.getMonth(),
                              lDateTemp.getDate(),
                              0, 0, 0, 0);
          rListResult.push({ date : lDateAdd, data : lListData });
          lDateTemp = lDate;
          lListData = [];
        }

        lObjAdd = {
          date    : pValue.date,
          url     : pValue.url,
          title   : lObjPage.title,
          host    : lObjPage.host,
          dataURI : lObjDataURI[lObjPage.host] || gMapIcons.get(NORMAL),
        };
        if (pValue.id) { lObjAdd.id = pValue.id; }
        if (pValue.windowId) { lObjAdd.windowId = pValue.windowId; }

        lListData.push(lObjAdd);
      });

      if (lListData.length > 0) {
        lDateAdd = new Date(lDateTemp.getFullYear(),
                            lDateTemp.getMonth(),
                            lDateTemp.getDate(),
                            0, 0, 0, 0);
        rListResult.push({ date : lDateAdd, data : lListData });
      }

      resolve(rListResult);
    });
  }//}}}

  /**
   * Get history list.
   * @param {Database} pInstanceDB -
   *     the instance of Database class in indexedDB.js.
   * @param {String} pStrDbName - the target history name in indexedDB.
   * @return {Promise} return promise.
   */
  function getHistoryListFromIndexedDB(pInstanceDB, pStrDbName)//{{{
  {
    return new Promise((resolve, reject) => {
      var lArrayPromise = [];
      lArrayPromise.push( pInstanceDB.getAll({ name: pStrDbName }) );
      lArrayPromise.push( pInstanceDB.getAll({ name: gStrDbPageInfoName }) );
      lArrayPromise.push( pInstanceDB.getAll({ name: gStrDbDataURIName }) );

      Promise.all(lArrayPromise)
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
    if (1 < pElement.location.search.length) {
      // 最初の1文字(?)を除いた文字列を取得
      var lStrQuery = decodeURIComponent(pElement.location.search.substring(1));

      // 引数ごとに分割
      var parameters     = lStrQuery.split('&');
      var rObjResult     = {};
      var lArrayElement  = [];
      var lStrParamName  = "";
      var lStrParamValue = "";
      var i              = 0;

      i = 0;
      parameters.forEach(pValue => {
        lArrayElement = pValue.split('=');
        if (lArrayElement[0] === '' ||
            lArrayElement[1] === undefined ||
            lArrayElement[1] === null) {
          return;
        }

        lStrParamName             = lArrayElement[0];
        lStrParamValue            = decodeURIComponent(lArrayElement[1]);
        rObjResult[lStrParamName] = lStrParamValue;
      });

      return rObjResult;
    }

    return null;
  }//}}}

  function closureGetDataURI()//{{{
  {
    function getDataType(pArrayBuf)//{{{
    {
      if (pArrayBuf[0] === 0xFF &&
          pArrayBuf[1] === 0xD8 &&
          pArrayBuf[pArrayBuf.byteLength - 2] === 0xFF &&
          pArrayBuf[pArrayBuf.byteLength - 1] === 0xD9) {
        return 'image/jpeg';
      } else if (pArrayBuf[0] === 0x89 && pArrayBuf[1] === 0x50 &&
                 pArrayBuf[2] === 0x4E && pArrayBuf[3] === 0x47) {
        return 'image/png';
      } else if (pArrayBuf[0] === 0x47 && pArrayBuf[1] === 0x49 &&
                 pArrayBuf[2] === 0x46 && pArrayBuf[3] === 0x38) {
        return 'image/gif';
      } else if (pArrayBuf[0] === 0x42 && pArrayBuf[1] === 0x4D) {
        return 'image/bmp';
      } else if (pArrayBuf[0] === 0x00 &&
                 pArrayBuf[1] === 0x00 &&
                 pArrayBuf[2] === 0x01) {
        return 'image/x-icon';
      } else {
        return 'image/unknown';
      }
    }//}}}

    function getDataURI(pStrUrl)//{{{
    {
      return new Promise(function(resolve, reject) {
        var lU8ArrayBytes  = new Uint8Array();
        var lStrDataType   = '';
        var lStrBinaryData = '';
        var i              = 0;

        ajax({
          url:          pStrUrl,
          responseType: 'arraybuffer',
        }).then(pResult => {
          if (pResult.status === 200) {
            lU8ArrayBytes  = new Uint8Array(pResult.response);
            lStrDataType   = getDataType(lU8ArrayBytes);
            lStrBinaryData = '';

            for (i = 0; i < lU8ArrayBytes.byteLength; i = (i + 1) | 0) {
              lStrBinaryData += String.fromCharCode(lU8ArrayBytes[i]);
            }

            resolve(
              `data:${lStrDataType};base64,${window.btoa(lStrBinaryData)}`);
          } else {
            reject(new Error(pResult.xhr.statusText));
          }
        }).catch(reject);
      });
    }//}}}

    return getDataURI;
  }//}}}

  function hasStringOfAttributeOfElement(pElement, pStrAttrName, lStrAdd)//{{{
  {
    var lRegex = new RegExp(`(^|\\s+)${lStrAdd}`, '');
    return lRegex.test(pElement.getAttribute(pStrAttrName));
  }//}}}

  function addStringToAttributeOfElement(pElement, pStrAttrName, lStrAdd)//{{{
  {
    if (!hasStringOfAttributeOfElement(pElement, pStrAttrName, lStrAdd)) {
      var lStrAttr = pElement.getAttribute(pStrAttrName);

      pElement.setAttribute(
        pStrAttrName, (lStrAttr ? lStrAttr + ' ' : '') + lStrAdd);
      return true;
    }
    return false;
  }//}}}

  function removeStringFromAttributeOfElement(//{{{
    pElement, pStrAttrName, pStrRemove, pStrReplace)
  {
    var lRegex    = new RegExp('(^|\\s+)' + pStrRemove, 'ig');
    var lStrValue = pElement.getAttribute(pStrAttrName);
    if (lStrValue) {
      pElement.setAttribute(
        pStrAttrName, lStrValue.replace(lRegex, pStrReplace || ''));
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
    if (pEvent === void 0 || pEvent === null) {
      throw new Error("Invalid argument. don't get event object.");
    }

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
   * @param {Object} pObjKeyInfo has got return value of keyCheck function.
   * @return {String} result string.
   */
  function generateKeyString(pObjKeyInfo) //{{{
  {
    if (toType(pObjKeyInfo) !== 'object') {
      throw new Error('Invalid type of argument.');
    }

    var lStrOutput = '';
    if (pObjKeyInfo.meta)  { lStrOutput += 'Meta +'; }
    if (pObjKeyInfo.ctrl)  { lStrOutput += 'Ctrl +'; }
    if (pObjKeyInfo.alt)   { lStrOutput += 'Alt +'; }
    if (pObjKeyInfo.shift) { lStrOutput += 'Shift +'; }

    lStrOutput += ' ';

    /* refernece to
     * http://www.javascripter.net/faq/keycodes.htm */
    switch (pObjKeyInfo.keyCode) {
      case 8:   lStrOutput += 'BackSpace'; break;
      case 9:   lStrOutput += 'Tab'; break;
      case 12:  lStrOutput += 'Numpad 5'; break;
      case 13:  lStrOutput += 'Enter'; break;
      case 19:  lStrOutput += 'Pause'; break;
      case 20:  lStrOutput += 'CapsLock'; break;
      case 27:  lStrOutput += 'Esc'; break;
      case 32:  lStrOutput += 'Space'; break;
      case 33:  lStrOutput += 'Page Up'; break;
      case 34:  lStrOutput += 'Page Down'; break;
      case 35:  lStrOutput += 'End'; break;
      case 36:  lStrOutput += 'Home'; break;
      case 37:  lStrOutput += 'Left'; break;
      case 38:  lStrOutput += 'Up'; break;
      case 39:  lStrOutput += 'Right'; break;
      case 40:  lStrOutput += 'Down'; break;
      case 44:  lStrOutput += 'PrintScreen'; break;
      case 45:  lStrOutput += 'Insert'; break;
      case 46:  lStrOutput += 'Delete'; break;
      case 106: lStrOutput += 'Numpad*'; break;
      case 107: lStrOutput += 'Numpad+'; break;
      case 109: lStrOutput += 'Numpad-'; break;
      case 110: lStrOutput += 'Numpad.'; break;
      case 111: lStrOutput += 'Numpad/'; break;
      case 144: lStrOutput += 'NumLock'; break;
      case 145: lStrOutput += 'ScrollLock'; break;
      case 188: lStrOutput += ','; break;
      case 190: lStrOutput += '.'; break;
      case 191: lStrOutput += '/'; break;
      case 192: lStrOutput += '`'; break;
      case 219: lStrOutput += '['; break;
      case 220: lStrOutput += '\\'; break;
      case 221: lStrOutput += ']'; break;
      case 222: lStrOutput += '\''; break;
      default:
        if (48 <= pObjKeyInfo.keyCode && pObjKeyInfo.keyCode <= 57 || // 0 to 9
            65 <= pObjKeyInfo.keyCode && pObjKeyInfo.keyCode <= 90) { // A to Z
          lStrOutput += String.fromCharCode(pObjKeyInfo.keyCode);
        } else if (96 <= pObjKeyInfo.keyCode && pObjKeyInfo.keyCode <= 105) {
          // Numpad 0 to Numpad 9
          lStrOutput += 'Numpad ' + (pObjKeyInfo.keyCode - 96);
        } else if (112 <= pObjKeyInfo.keyCode && pObjKeyInfo.keyCode <= 123) {
          // F1 to F12
          lStrOutput += 'F' + (pObjKeyInfo.keyCode - 111);
        } else {
          throw new Error('Invalid keyCode.');
        }
        break;
    }

    return lStrOutput.trim();
  }//}}}

  /* base program.
   * http://javascriptweblog.wordpress.com/2011/08/08/fixing-the-javascript-typeof-operator/
   *
   * I have added about NaN
   */
  function toType(pObj) {//{{{
    var lStrType =
      ({}).toString.call(pObj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
    if (lStrType === 'global') {
      if (pObj === void 0)    { return 'undefined'; }
      else if (pObj === null) { return 'null'; }
    } else if (lStrType === 'number') {
      if (isNaN(pObj)) { return 'NaN'; }
    }
    return lStrType;
  }//}}}

  /**
   * checkFunctionArguments
   *
   * Function confirm that type of received the arguments.
   *
   * @param {arguments or array} pArguments -
   *     you want to confirm the arguments of function.
   * @param {array of array of string} pArrayTypes -
   *     you want to confirm the array of
   *     the string represent the type of the arguments of the function.
   *     String of Array acknowledge the type of arguments.
   *
   *     If array of string is empty, it admit all type.
   *
   *     If array of string is function,
   *     When return value is true, it determines to match.
   *     Arguments of Function are
   *        1: one of a value of arguments.
   *        2 or later: none;
   * @param {boolean} [pBoolLenAllow] -
   *     Whether admitting that the length of
   *     pArguments and pArrayTypes do not match.
   *     default is false.
   * @return {string or boolean}
   *     If exist an error, to return the string.
   *     return false of boolean if doesn't exist the error.
   */
  function checkFunctionArguments(pArguments, pArrayTypes, pBoolLenAllow)//{{{
  {
    var lArrayArgs        = (toType(pArguments) === 'array') ?
                            pArguments :
                            Array.prototype.slice.call(pArguments);
    var rStrError         = '';
    var lStrErr           = '';
    var lStrType          = '';
    var lBoolResultOfFunc = true;
    var lNumMatchToAll    = 0;
    var lBoolLengthAllow  = pBoolLenAllow || false;

    if (lBoolLengthAllow === false &&
        lArrayArgs.length !== pArrayTypes.length) {
      throw new Error(
        "The value of the arguments is not same length: " +
        `first: ${lArrayArgs.length}, second: ${pArrayTypes.length}`);
    }

    lArrayArgs.forEach((pValue, i) => {
      lStrErr = '';
      lNumMatchToAll = 0;

      lStrType = toType(pArrayTypes[i]);
      switch (lStrType) {
      case 'function':
        lBoolResultOfFunc = pArrayTypes[i](pValue);
        if (lBoolResultOfFunc === void 0 || lBoolResultOfFunc === null) {
          throw new Error("Function is not return the boolean.");
        } else if (lBoolResultOfFunc === true) {
          lStrErr += `Arg ${i}: The result of the function was error.\n`;
          ++lNumMatchToAll;
        }
        break;
      case 'array':
        pArrayTypes[i].forEach(pStrType => {
          if (toType(pValue) !== pStrType) {
            lStrErr += `Arg ${i}: isn't ${pStrType} type\n`;
            ++lNumMatchToAll;
          }
        });
        break;
      default:
        throw new Error(
          "Invalid arugments. pArrayTypes is not array or function.");
      }

      if (lNumMatchToAll === pArrayTypes[i].length) {
        rStrError += lStrErr;
      }
    });

    return rStrError.length > 0 ? rStrError : false;
  }//}}}

  /**
   * 日付をフォーマットする
   * http://qiita.com/osakanafish/items/c64fe8a34e7221e811d0
   * @param  {Date}   pDate     日付
   * @param  {String} [pStrFormat] フォーマット
   * @return {String}          フォーマット済み日付
   */
  function formatDate(pDate, pStrFormat)//{{{
  {
    var lStrMilliSeconds = "";
    var lNumLength       = 0;
    var i                = 0;

    if (!pStrFormat) {
      pStrFormat = 'YYYY-MM-DD hh:mm:ss.SSS';
    }
    pStrFormat = pStrFormat.replace(/YYYY/g, pDate.getFullYear());
    pStrFormat = pStrFormat.replace(
      /MM/g, ('0' + (pDate.getMonth() + 1)).slice(-2));
    pStrFormat = pStrFormat.replace(/DD/g, ('0' + pDate.getDate()).slice(-2));
    pStrFormat = pStrFormat.replace(/hh/g, ('0' + pDate.getHours()).slice(-2));
    pStrFormat = pStrFormat.replace(
      /mm/g, ('0' + pDate.getMinutes()).slice(-2));
    pStrFormat = pStrFormat.replace(
      /ss/g, ('0' + pDate.getSeconds()).slice(-2));
    if (pStrFormat.match(/S/g)) {
      lStrMilliSeconds = ('00' + pDate.getMilliseconds()).slice(-3);
      lNumLength = pStrFormat.match(/S/g).length;
      for (i = 0; i < lNumLength; i = (i + 1) | 0) {
        pStrFormat =
          pStrFormat.replace(/S/, lStrMilliSeconds.substring(i, i + 1));
      }
    }
    return pStrFormat;
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
    console.info('setObjectProperty', arguments);

    var lArrayArgs = Array.prototype.slice.call(arguments);
    if (lArrayArgs.length < 2) {
      throw new Error('setObjectProperty arguments is less.');
    }

    var lObjToAdd = lArrayArgs[0];
    var lObjName  = lArrayArgs[1];
    var lValue    = lArrayArgs[2];
    if (toType(lObjName) === 'function') {
      if (lObjName.name.length === 0) {
        throw new Error('a nameless function.');
      }
      if (lObjToAdd.hasOwnProperty(lObjName.name)) {
        throw new Error('Already had added to object.', lArrayArgs);
      }

      lObjToAdd[lObjName.name] = lObjName;
      return;
    }

    if (lObjToAdd.hasOwnProperty(lObjName)) {
      throw new Error('Already had added to object.', lArrayArgs);
    }
    lObjToAdd[lObjName] = lValue;
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
  setObjectProperty(window, 'checkFunctionArguments', checkFunctionArguments);
  setObjectProperty(window, 'formatDate',        formatDate);
  setObjectProperty(window, 'setObjectProperty', setObjectProperty);
  //}}}
})(this);
