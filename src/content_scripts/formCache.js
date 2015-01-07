(function(document) {
  "use strict";

  var PREFIX = 'TMP_';

  var SKIP_TYPE = [
    'file', 'submit', 'image', 'reset', 'button',
  ];
  function checkSkipType(type)
  {
    return SKIP_TYPE.some(function(v) {
      return type === v;
    });
  }

  (function() {
    var restored = {};

    var el, keyName, value;
    var elements = document.evaluate(
      '//form//input | //textarea', document, null, 7, null);
    for (var i = 0, len = elements.snapshotLength; i < len; i++) {
      el = elements.snapshotItem(i);
      if (el.name === void 0 || el.name === null || checkSkipType(el.type)) {
        continue;
      }

      keyName = PREFIX + el.name;
      value   = sessionStorage.getItem(keyName);
      if (value === void 0 || value === null) {
        continue;
      }

      switch (el.type) {
      case 'checkbox':
      case 'radio':
        el.checked = (el.value === value) ? true : false;
        break;
      default:
        el.value = value;
        break;
      }

      restored[keyName] = true;
    }

    for (var key in restored) {
      sessionStorage.removeItem(key);
    }
  })();

  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    switch (message.event) {
    case 'form_cache':
      var el;
      var elements = document.evaluate(
        '//form//input | //textarea', document, null, 7, null);
      for (var i = 0, len = elements.snapshotLength; i < len; i++) {
        el = elements.snapshotItem(i);
        if (el.name === void 0 || el.name === null ||
            el.value === void 0 || el.value === null || el.value === '' ||
            checkSkipType(el.type)) {
          continue;
        }

        switch (el.type) {
        case 'checkbox':
        case 'radio':
          if (!el.checked) {
            continue;
          }
          break;
        }

        sessionStorage.setItem(PREFIX + el.name, el.value);
      }
      sendResponse();
      break;
    }
  });

  console.log('the form cache scripts of TAB MEMORY PURGE is loaded.');
})(document);
