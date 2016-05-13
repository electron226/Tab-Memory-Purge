(function(document) {
  "use strict";

  //{{{ the variables in this script.
  const sStrPrefix = 'TMP_';
  const sStrXPath  = '//input | //textarea';
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
    var lValue           = null;
    var lStrKeyName      = "";
    var i                = 0;

    lElementSnapshot = document.evaluate(sStrXPath, document, null, 7, null);
    for (i = 0; i < lElementSnapshot.snapshotLength; i = (i + 1) | 0) {
      lElement = lElementSnapshot.snapshotItem(i);
      if (lElement.name === void 0 ||
          lElement.name === null ||
          checkSkipType(lElement.type)) {
        continue;
      }

      lStrKeyName = sStrPrefix + lElement.name;
      lValue      = sessionStorage.getItem(lStrKeyName);
      lValue      = (toType(lValue) === 'string') ? JSON.parse(lValue) : lValue;
      if (lValue === void 0 || lValue === null || lValue.length === 0) {
        continue;
      }

      switch (lElement.type) {
      case 'checkbox':
      case 'radio':
        /* eslint no-loop-func: "off" */
        lElement.checked =
          lValue.some(v => (lElement.value === v)) ? true : false;
        break;
      default:
        lElement.value = lValue.shift();
        sessionStorage.setItem(lStrKeyName, JSON.stringify(lValue));
        break;
      }

      lSetRestored.add(lStrKeyName);
    }

    lSetRestored.forEach(pValue => sessionStorage.removeItem(pValue));
  })();//}}}

  chrome.runtime.onMessage.addListener(//{{{
    (pObjMessage, pObjSender, pFuncSendResponse) => {
    switch (pObjMessage.event) {
    case 'form_cache':
      var lElement    = document.createDocumentFragment();
      var lElSnapshot = null;
      var lStrKeyName = "";
      var lValue      = null;

      lElSnapshot = document.evaluate(sStrXPath, document, null, 7, null);
      for (var i = 0; i < lElSnapshot.snapshotLength; i = (i + 1) | 0) {
        lElement = lElSnapshot.snapshotItem(i);
        if (lElement.name === void 0 || lElement.name === null ||
            lElement.value === void 0 || lElement.value === null ||
            lElement.value === '' || checkSkipType(lElement.type)) {
          continue;
        }

        switch (lElement.type) {
        case 'checkbox':
        case 'radio':
          if (!lElement.checked) {
            continue;
          }
          break;
        }

        lStrKeyName = sStrPrefix + lElement.name;
        lValue      = sessionStorage.getItem(lStrKeyName);
        lValue      = (toType(lValue) === 'string') ? JSON.parse(lValue) : [];

        lValue.push(lElement.value);
        sessionStorage.setItem(lStrKeyName, JSON.stringify(lValue));
      }

      pFuncSendResponse();
      break;
    }
  });//}}}

  console.log('the form cache scripts of TAB MEMORY PURGE is loaded.');
})(this.document);
