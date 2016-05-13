(function(document) {
  "use strict";

  //{{{ the variables in this script.
  const EXT_PREFIX      = 'TMP_';
  const XPATH_FORM_ITEM = '//input | //textarea';
  //}}}

  function checkSkipType(pType)//{{{
  {
    let skip_types = [ 'file', 'submit', 'image', 'reset', 'button', ];
    return skip_types.some(v => (pType === v));
  }//}}}

  (() => {//{{{
    let restored = new Set();

    let snapshot = document.evaluate(XPATH_FORM_ITEM, document, null, 7, null);
    for (let i = 0; i < snapshot.snapshotLength; ++i) {
      let element = snapshot.snapshotItem(i);
      if (element.name === void 0 ||
          element.name === null ||
          checkSkipType(element.type)) {
        continue;
      }

      let key_name = EXT_PREFIX + element.name;
      let value    = sessionStorage.getItem(key_name);
      value        = (toType(value) === 'string') ? JSON.parse(value) : value;
      if (value === void 0 || value === null || value.length === 0) {
        continue;
      }

      switch (element.type) {
      case 'checkbox':
      case 'radio':
        /* eslint no-loop-func: "off" */
        element.checked =
          value.some(v => (element.value === v)) ? true : false;
        break;
      default:
        element.value = value.shift();
        sessionStorage.setItem(key_name, JSON.stringify(value));
        break;
      }

      restored.add(key_name);
    }

    restored.forEach(pValue => sessionStorage.removeItem(pValue));
  })();//}}}

  chrome.runtime.onMessage.addListener(//{{{
    (pMessage, pSender, pSendResponse) => {
    switch (pMessage.event) {
    case 'form_cache':
      {
        let snapshot = document.evaluate(
            XPATH_FORM_ITEM, document, null, 7, null);
        for (let i = 0; i < snapshot.snapshotLength; ++i) {
          let element = snapshot.snapshotItem(i);
          if (element.name === void 0 || element.name === null ||
              element.value === void 0 || element.value === null ||
              element.value === '' || checkSkipType(element.type)) {
            continue;
          }

          switch (element.type) {
          case 'checkbox':
          case 'radio':
            if (!element.checked) {
              continue;
            }
            break;
          }

          let key_name = EXT_PREFIX + element.name;
          let value    = sessionStorage.getItem(key_name);
          value        = (toType(value) === 'string') ? JSON.parse(value) : [];

          value.push(element.value);
          sessionStorage.setItem(key_name, JSON.stringify(value));
        }

        pSendResponse();
        break;
      }
    }
  });//}}}

  console.log('the form cache scripts of TAB MEMORY PURGE is loaded.');
})(this.document);
