(function(document) {
  "use strict";

  var PREFIX = 'TMP_';
  var XPATH = '//input | //textarea';

  function checkSkipType(type)
  {
    var SKIP_TYPE = [
      'file', 'submit', 'image', 'reset', 'button',
    ];

    return SKIP_TYPE.some(function(v) {
      return type === v;
    });
  }

  (function() {
    var restored = {};

    var el, keyName, value;
    var elements = document.evaluate(XPATH, document, null, 7, null);
    for (var i = 0, len = elements.snapshotLength; i < len; i++) {
      el = elements.snapshotItem(i);
      if (el.name === void 0 || el.name === null || checkSkipType(el.type)) {
        continue;
      }

      keyName = PREFIX + el.name;
      value   = sessionStorage.getItem(keyName);
      value   = (toType(value) === 'string') ? JSON.parse(value) : value;
      if (value === void 0 || value === null || value.length === 0) {
        continue;
      }

      switch (el.type) {
      case 'checkbox':
      case 'radio':
        /*jshint loopfunc: true*/
        el.checked =
          value.some(function(v) { return el.value === v; }) ? true : false;
        break;
      default:
        el.value = value.shift();
        sessionStorage.setItem(keyName, JSON.stringify(value));
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
      var el, keyName, value;
      var elements = document.evaluate(XPATH, document, null, 7, null);
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

        keyName = PREFIX + el.name;
        value   = sessionStorage.getItem(keyName);
        value   = (toType(value) === 'string') ? JSON.parse(value) : [];

        value.push(el.value);
        sessionStorage.setItem(keyName, JSON.stringify(value));
      }
      sendResponse();
      break;
    }
  });

  console.log('the form cache scripts of TAB MEMORY PURGE is loaded.');
})(this.document);
