(function(document) {
  "use strict";

  //{{{ the variables in this script.
  var sStrPrefix = 'TMP_';
  var sStrXPath  = '//input | //textarea';
  //}}}

  function checkSkipType(pStrType)//{{{
  {
    var lArraySkipType = [ 'file', 'submit', 'image', 'reset', 'button', ];
    return lArraySkipType.some(v => pStrType === v);
  }//}}}

  (function() {//{{{
    var lSetRestored     = new Set();
    var lElement         = document.createDocumentFragment();
    var lElementSnapshot = null;
    var lStrKeyName      = "";
    var lValue           = null;
    var iter             = lSetRestored.keys();
    var i                = 0;
    var j                = null;

    lElementSnapshot = document.evaluate(sStrXPath, document, null, 7, null);
    i = 0;
    while (i < lElementSnapshot.snapshotLength) {
      lElement = lElementSnapshot.snapshotItem(i);
      if (lElement.name === void 0 ||
          lElement.name === null ||
          checkSkipType(lElement.type)) {
        ++i;
        continue;
      }

      lStrKeyName = sStrPrefix + lElement.name;
      lValue      = sessionStorage.getItem(lStrKeyName);
      lValue      = (toType(lValue) === 'string') ? JSON.parse(lValue) : lValue;
      if (lValue === void 0 || lValue === null || lValue.length === 0) {
        ++i;
        continue;
      }

      switch (lElement.type) {
      case 'checkbox':
      case 'radio':
        lElement.checked =
          lValue.some(v => (lElement.value === v)) ? true : false;
        break;
      default:
        lElement.value = lValue.shift();
        sessionStorage.setItem(lStrKeyName, JSON.stringify(lValue));
        break;
      }

      lSetRestored.add(lStrKeyName);
      ++i;
    }

    iter = lSetRestored.keys();
    j    = iter.next();
    while (!j.done) {
      sessionStorage.removeItem(j.value);
      j = iter.next();
    }
  })();//}}}

  chrome.runtime.onMessage.addListener(//{{{
    (pObjMessage, pObjSender, pFuncSendResponse) => {
    switch (pObjMessage.event) {
    case 'form_cache':
      var lElement    = document.createDocumentFragment();
      var lElSnapshot = null;
      var lStrKeyName = "";
      var lValue      = null;
      var i           = 0;

      lElSnapshot = document.evaluate(sStrXPath, document, null, 7, null);
      i = 0;
      while (i < lElSnapshot.snapshotLength) {
        lElement = lElSnapshot.snapshotItem(i);
        if (lElement.name === void 0 || lElement.name === null ||
            lElement.value === void 0 || lElement.value === null ||
            lElement.value === '' || checkSkipType(lElement.type)) {
            ++i;
          continue;
        }

        switch (lElement.type) {
        case 'checkbox':
        case 'radio':
          if (!lElement.checked) {
            ++i;
            continue;
          }
          break;
        }

        lStrKeyName = sStrPrefix + lElement.name;
        lValue      = sessionStorage.getItem(lStrKeyName);
        lValue      = (toType(lValue) === 'string') ? JSON.parse(lValue) : [];

        lValue.push(lElement.lValue);
        sessionStorage.setItem(lStrKeyName, JSON.stringify(lValue));
        ++i;
      }

      pFuncSendResponse();
      break;
    }
  });//}}}

  console.log('the form cache scripts of TAB MEMORY PURGE is loaded.');
})(this.document);
