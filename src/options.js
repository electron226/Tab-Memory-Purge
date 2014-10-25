/*jshint shadow: true, loopfunc: true*/
/*global generateRegexTool: true, generateKeyString: true, keyCheck: true,
  formatDate: true */
(function(document) {
  'use strict';

  var TIMEOUT_TIME = 1000;

  var TRANSLATION_SUFFIX = 'Text';
  var HISTORY_LIST_IDNAME = 'history_date_list';
  var HISTORY_SECTION_IDNAME = 'history_options';
  var CHANGE_HISTORY_SECTION_IDNAME = 'change_history_options';

  var RELEASE_PAGE_NAME = 'release_page';
  var ASSIGNMENT_NAME = 'assignment';
  var RELEASE_URL_NAME = 'release_url';

  var BIND_START_CLASSNAME = 'bindStart';
  var BIND_CLEAR_CLASSNAME = 'bindClear';
  var KEYDATA_NAME_SUFFIX = '_keybind';
  var KEYDATA_CLASSNAME = 'keydata';
  var KEYPRESS_CLASSNAME = 'pressKey';
  var KEYBIND_SECTION_IDNAME = 'keybind_options';
  var KEYBIND_STATUS_CLASSNAME = 'status';

  var OPERATE_STATUS_IDNAME = 'status';
  var OPERATE_STATUS_SYNC_IDNAME = 'status_sync';

  var CONFIGVIEW_IDNAME = 'config_view';
  var CONFIGVIEW_STATUS_IDNAME = 'config_view_status';

  var SAVE_BUTTONNAME = 'save';
  var LOAD_BUTTONNAME = 'load';
  var INIT_BUTTONNAME = 'init';
  var SAVESYNC_BUTTONNAME = 'save_sync';
  var LOADSYNC_BUTTONNAME = 'load_sync';

  function loadValues(document, values, callback, storageType)
  {
    if (document === void 0 ||
        toType(values) !== 'object' && values !== null || values === void 0) {
      throw new Error('Arguments type error.');
    }
    if (storageType === void 0 || storageType === null) {
      storageType = chrome.storage.local;
    }

    // Get All Option Value.
    storageType.get(null, function(items) {
      items = values || items;
      var element = null;
      for (var key in items) {
        element = document.evaluate(
            '//*[@name="' + key + '"]', document, null, 7, null);
        if (element.snapshotLength === 0) {
          console.error('loadValues() Get ' + key + ' error.');
          continue;
        }

        var value = items[key];
        switch (element.snapshotItem(0).type) {
          case 'radio':
            element = document.evaluate(
                '//input[@name="' + key + '"][@value="' + value + '"]',
                document, null, 7, null);
            if (element.snapshotLength !== 1) {
              console.log('loadValues() Get ' + key + ' error.');
              continue;
            }
            element.snapshotItem(0).checked = true;
            break;
          case 'checkbox':
            element.snapshotItem(0).checked = value;
            break;
          case 'number':
            element.snapshotItem(0).value = value;
            break;
          case 'password':
          case 'text':
          case 'textarea':
            element.snapshotItem(0).value = trim(value);
            break;
        }
      }

      if (toType(callback) === 'function') {
        callback();
      }
    });
  }

  function saveValues(document, callback, storageType)
  {
    if (document === void 0) {
      throw new Error('Invalid argument.');
    }
    if (storageType === void 0 || storageType === null) {
      storageType = chrome.storage.local;
    }

    var writeData = {};
    var xPathArticle = '//article[@id="option_items"]';
    var inputs = document.evaluate(
      xPathArticle + '//input' +
      '|' + xPathArticle + '//textarea', document, null, 7, null);
    for (var i = 0; i < inputs.snapshotLength; i++) {
      var item = inputs.snapshotItem(i);
      if (item.name.length === 0) {
        continue;
      }

      switch (item.type) {
        case 'radio':
          if (item.checked) {
            writeData[item.name] = item.value;
          }
          break;
        case 'checkbox':
          writeData[item.name] = item.checked;
          break;
        case 'password':
        case 'text':
        case 'textarea':
          writeData[item.name] = trim(item.value);
          break;
        case 'number':
          writeData[item.name] = item.value;
          break;
      }
    }

    storageType.set(writeData, callback);
  }

  /* section buttons. */
  var switch_section = {
    barName: 'change_bar',
    idSuffix: '_options',

    'switch': function(menus, id_name) {
      for (var i = 0; i < menus.snapshotLength; i++) {
        var mId = menus.snapshotItem(i).id;
        if (mId !== id_name) {
          this.disable(mId);
        } else {
          this.enable(mId);
        }
      }
    },
    'enable': function(id_name) {
      var el = document.getElementById(id_name);
      var bar = el.getElementsByClassName(this.barName)[0];
      var option = document.getElementById(id_name + this.idSuffix);
      option.style.display = 'block';
      bar.style.display = 'inline';
      el.style.color = 'gray';
    },
    'disable': function(id_name) {
      var el = document.getElementById(id_name);
      var bar = el.getElementsByClassName(this.barName)[0];
      var option = document.getElementById(id_name + this.idSuffix);
      option.style.display = 'none';
      bar.style.display = 'none';
      el.style.color = 'lightgray';
    },
  };

  function switchPage(id)
  {
    var page_title =
      document.getElementsByClassName(id + TRANSLATION_SUFFIX)[0];
    document.getElementById('menu_title').textContent =
    page_title.textContent;

    if (id !== 'history') {
      var history_list = document.getElementById(HISTORY_LIST_IDNAME);
      history_list.style.display = 'none';
    }

    var footer = document.getElementsByTagName('footer')[0];
    switch (id) {
      case 'option':
      case 'keybind':
        footer.style.display = 'block';
        break;
      case 'history':
        footer.style.display = 'none';
        showHistory();
        break;
      case 'change_history':
        footer.style.display = 'none';
        showChangeHistory();
        break;
      case 'information':
        footer.style.display = 'none';
        break;
    }
  }

  function showHistory(callback) {
    chrome.storage.local.get(historyKey, function(items) {
      var i, j;
      var data = items.history;
      var history_date = [];
      for (i in data) {
        history_date.push(i);
      }
      history_date.reverse();

      var history_list = document.getElementById(HISTORY_LIST_IDNAME);
      history_list.innerHTML = '';
      history_list.style.display ='block';

      /**
       * 
       *
       * @return {undefined}
       */
      var section = document.getElementById(HISTORY_SECTION_IDNAME);
      section.innerHTML = '';
      var fieldset, legend, date, dateText, list, listBtn, btnDiv;
      var div, span, a;
      for (i = 0; i < history_date.length; i++) {
        fieldset = document.createElement('fieldset');
        legend = document.createElement('legend');

        date = new Date(parseInt(history_date[i], 10));
        legend.id = date.getTime();
        dateText = formatDate(date, 'YYYY/MM/DD');
        legend.textContent = dateText;
        fieldset.appendChild(legend);

        list = data[history_date[i]].reverse();
        for (j = 0; j < list.length; j++) {
          div = document.createElement('div');

          span = document.createElement('span');
          span.textContent = formatDate(new Date(list[j].time), 'hh:mm:ss');
          span.style.marginRight = '2em';
          div.appendChild(span);

          a = document.createElement('a');
          a.href = list[j].url;
          a.textContent = list[j].title;
          div.appendChild(a);

          fieldset.appendChild(div);
        }

        section.appendChild(fieldset);

        btnDiv = document.createElement('div');
        listBtn = document.createElement('button');
        listBtn.name = date.getTime();
        listBtn.textContent = dateText;
        listBtn.onclick = function() {
          window.location.replace(optionPage + '#' + this.name);
        };
        btnDiv.appendChild(listBtn);
        history_list.appendChild(btnDiv);
      }

      if (toType(callback) === 'function') {
        callback();
      }
    });
  }

  /* Update History */
  function readHistoryFile(file_path, callback)
  {
    var h = new XMLHttpRequest();
    h.open("GET", file_path, true);
    h.onreadystatechange = function() {
      if (h.readyState !== 4) {
        return;
      }
      var text = h.responseText.split('\n');
      var t;
      for (var i = 0; i < text.length; i++) {
        t = text[i];
        if (t === '') {
          continue;
        }

        callback(t);
      }
    };
    h.send(null);
  }

  function showChangeHistory()
  {
    var elChangeHistory =
      document.getElementById(CHANGE_HISTORY_SECTION_IDNAME);
    readHistoryFile(changeHistory, function(text) {
      var el;
      if (text.match(/^\d+\/\d+\/\d+/) !== null) {
        el = 'h3';
      } else {
        el = 'div';
      }
      var cElement = document.createElement(el);
      cElement.textContent = text;
      if (el === 'div') {
        cElement.style.marginLeft = '1.5em';
      }
      elChangeHistory.appendChild(cElement);
    });
  }

  // 「解放に使うぺージを指定」の項目の有効無効状態を確認・変更
  function releasePageChangeState()
  {
    var selectElement = document.evaluate(
      '//input[@name="' + RELEASE_PAGE_NAME +
      '" and @value="' + ASSIGNMENT_NAME + '"]', document, null, 7, null);
    if (selectElement.snapshotLength !== 1) {
      throw new Error("onReleasePage function. can't get selectElement.");
    }

    var state = selectElement.snapshotItem(0).checked;
    var release_url = document.querySelector(
      "input[name='" + RELEASE_URL_NAME + "']");
    release_url.disabled = !state;
  }

  function initKeybind(document, values, callback)
  {
    if (document === void 0 ||
        toType(values) !== 'object' && values !== null) {
      throw new Error(
        'initKeybind function is error. Invalid type of arguments.');
    }

    // show current key.
    chrome.storage.local.get(null, function(items) {
      var regex = new RegExp('([\\w_]+)' + KEYDATA_NAME_SUFFIX);
      items = values || items;
      var matches, keyInfo, output;
      for (var key in items) {
        matches = key.match(regex);
        if (matches) {
          keyInfo = JSON.parse(items[key]);
          output = null;
          try {
            output = generateKeyString(keyInfo);
          } catch (e) {
            output = '';
          }
          copyKeyInfo(document, matches[1], KEYPRESS_CLASSNAME, output);
          copyKeyInfo(
            document, matches[1], KEYDATA_CLASSNAME, JSON.stringify(keyInfo));
        }
      }
      if (toType(callback) === 'function') {
        callback();
      }
    });
  }

  function copyKeyInfo(document, bindStart, keyClassName, output)
  {
    if (document === void 0 ||
      toType(bindStart) !== 'string' ||
      toType(keyClassName) !== 'string' ||
      toType(output) !== 'string') {
      throw new Error(
          'copyKeyInfo function is error. invalid type of arguments.');
    }

    var elementCode =
      '//section[@id="' + KEYBIND_SECTION_IDNAME + '"]' +
      '//tr[@name="' + bindStart + '"]';
    var element = document.evaluate(
      elementCode + '//*[@class="' + keyClassName + '"]',
      document, null, 7, null);
    if (element.snapshotLength !== 1) {
      throw new Error('snapshotLength is not 1 in copyKeyINfo.');
    }
    element.snapshotItem(0).value = output;
  }

  function saveProcess(status, storageType)
  {
    saveValues(document, function() {
      chrome.runtime.sendMessage({ event: 'initialize' });

      status.innerHTML = 'Options Saved.';
      setTimeout(function() {
        status.innerHTML = '';
      }, TIMEOUT_TIME);
    }, storageType);
  }

  function loadProcess(status, storageType)
  {
    loadValues(document, null, function() {
      initKeybind(document, null, function() {
        status.innerHTML = 'Options Loaded.';
        setTimeout(function() {
          status.innerHTML = '';
        }, TIMEOUT_TIME);
      });
    }, storageType);
  }

  function initProcess(status)
  {
    loadValues(document, defaultValues, function() {
      initKeybind(document, defaultValues, function() {
        status.innerHTML = 'Options Initialized.';
        setTimeout(function() {
          status.innerHTML = '';
        }, TIMEOUT_TIME);
      });
    });
  }

  function checkNumberLimit()
  {
    var min = parseInt(this.min, 10);
    var max = parseInt(this.max, 10);
    var value = parseInt(this.value, 10);
    if (this.min && value < min) {
      this.value = this.min;
    }
    if (this.max && value > max) {
      this.value = this.max;
    }
  }


 chrome.runtime.onMessage.addListener(function(message) {
   switch (message.event) {
   case 'contextMenus':
     if (message.target === void 0 || message.target === null) {
       console.error('runtime.onMessage is failed. target was not found.');
       return;
     }

     var section_menus = document.evaluate(
       '//nav//tr', document, null, 7, null);
     if (section_menus.snapshotLength > 0) {
       switch_section.switch(section_menus, message.target);
       switchPage(message.target);
     } else {
       console.error('a section menu is not find.');
     }
     break;
   }
 });

 /* DOM Content Loaded. */
 document.addEventListener('DOMContentLoaded', function() {
   initTranslations(document, translationPath, TRANSLATION_SUFFIX);
   loadValues(document, defaultValues, function() {
     initKeybind(document, null, function() {
       loadValues(document, null, function() {
         releasePageChangeState();
       });
     });
   });

   /* 設定項目など */
   var release_elements = document.evaluate(
       '//input[@name="' + RELEASE_PAGE_NAME + '"]', document, null, 7, null);
   for (var i = 0; i < release_elements.snapshotLength; i++) {
     release_elements.snapshotItem(i).addEventListener(
       'click', releasePageChangeState);
   }

   var section_menus = document.evaluate('//nav//tr', document, null, 7, null);
   for (var i = 0; i < section_menus.snapshotLength; i++) {
     section_menus.snapshotItem(i).addEventListener('click', function() {
       switch_section.switch(section_menus, this.id);
       switchPage(this.id);
     });
   }

   chrome.runtime.sendMessage({ event: 'display_option_page' }, function(id) {
     if (id === void 0 || id === null) {
       id = section_menus.snapshotItem(0).id;
     }
     switch_section.switch(section_menus, id);
     switchPage(id);
   });

   /* KeyBinds */
   // Set Button
   var bindButtons = document.evaluate(
     '//button[@class="' + BIND_START_CLASSNAME + '"]',
     document, null, 7, null);
   var bindStart = null;
   function setButtonClicked()
   {
     bindStart = this.parentNode.parentNode.attributes.name.nodeValue;
   }
   for (var i = 0; i < bindButtons.snapshotLength; i++) {
     bindButtons.snapshotItem(i).addEventListener('click', setButtonClicked);
   }

   // Clear Button
   var bindClears = document.evaluate(
     '//button[@class="' + BIND_CLEAR_CLASSNAME + '"]',
     document, null, 7, null);
   function clearButtonClicked()
   {
     var name = this.parentNode.parentNode.attributes.name.nodeValue;
     var optionName = name + KEYDATA_NAME_SUFFIX;
     if (defaultValues.hasOwnProperty(optionName)) {
       var keyInfo = JSON.parse(defaultValues[optionName]);
       var output = null;
       try {
         output = generateKeyString(keyInfo);
       } catch (e) {
         output = '';
       }
       copyKeyInfo(document, name, KEYPRESS_CLASSNAME, output);
       copyKeyInfo(
         document, name, KEYDATA_CLASSNAME, JSON.stringify(keyInfo));
     }
   }
   for (var i = 0; i < bindClears.snapshotLength; i++) {
     bindClears.snapshotItem(i).addEventListener('click', clearButtonClicked);
   }

   document.addEventListener('keyup', function(event) {
     try {
       if (bindStart !== null) {
         var keyInfo = keyCheck(event);
         var output = generateKeyString(keyInfo);
         copyKeyInfo(document, bindStart, KEYPRESS_CLASSNAME, output);
         copyKeyInfo(
           document, bindStart, KEYDATA_CLASSNAME, JSON.stringify(keyInfo));
       }
     } catch (e) {
       if (e.message !== "It don't correspond.") {
         console.log(e.message);
         return;
       }

       var elementCode =
         '//section[@id="' + KEYBIND_SECTION_IDNAME + '"]' +
         '//tr[@name="' + bindStart + '"]';
       var bind_status = document.evaluate(
         elementCode + '//*[@class="' + KEYBIND_STATUS_CLASSNAME  + '"]',
         document, null, 7, null);
       if (bind_status.snapshotLength !== 1) {
           throw new Error('snapshotLength is not 1.');
       }
       var item = bind_status.snapshotItem(0);
       item.innerText = e.message;
       setTimeout(function() {
         item.innerText = '';
       }, TIMEOUT_TIME);
     } finally {
       bindStart = null;
     }
   });

   var inputNumbers = document.evaluate(
     '//input[@type="number"]', document, null, 7, null);
   for (var i = 0; i < inputNumbers.snapshotLength; i++) {
     inputNumbers.snapshotItem(i).onchange = checkNumberLimit;
   }

   /* status */
   var status = document.getElementById(OPERATE_STATUS_IDNAME);
   var status_sync = document.getElementById(OPERATE_STATUS_SYNC_IDNAME);
   var processFunc = {};
   processFunc[SAVE_BUTTONNAME] = saveProcess;
   processFunc[LOAD_BUTTONNAME] = loadProcess;
   processFunc[INIT_BUTTONNAME] = initProcess;
   processFunc[SAVESYNC_BUTTONNAME] = saveProcess;
   processFunc[LOADSYNC_BUTTONNAME] = loadProcess;
   function runProcess()
   {
     processFunc[this.id](status);
   }
   function runSyncProcess()
   {
     processFunc[this.id](status_sync, chrome.storage.sync);
   }

   document.getElementById(SAVE_BUTTONNAME).addEventListener(
     'click', runProcess, false);
   document.getElementById(LOAD_BUTTONNAME).addEventListener(
     'click', runProcess, false);
   document.getElementById(INIT_BUTTONNAME).addEventListener(
     'click', runProcess, false);
   document.getElementById(SAVESYNC_BUTTONNAME).addEventListener(
     'click', runSyncProcess, false);
   document.getElementById(LOADSYNC_BUTTONNAME).addEventListener(
     'click', runSyncProcess, false);

   // Import and Export
   var config_view = document.getElementById(CONFIGVIEW_IDNAME);
   var config_view_status = document.getElementById(CONFIGVIEW_STATUS_IDNAME);
   document.getElementById('export').addEventListener('click', function() {
     chrome.storage.local.get(null, function(items) {
       // unecessary options to delete.
       delete items.backup;
       delete items.history;

       config_view.value = JSON.stringify(items, null, '    ');
     });
   }, false);
   document.getElementById('import').addEventListener('click', function() {
     try {
       var items = JSON.parse(config_view.value);
       loadValues(document, items, function() {
         config_view_status.textContent = 'Success. Please, save';
         config_view_status.style.color = 'green';
         setTimeout(function() {
           config_view_status.innerHTML = '';
         }, TIMEOUT_TIME);
       });
     } catch (error) {
       config_view_status.textContent = 'Import error. invalid string.';
       config_view_status.style.color = 'red';
       return;
     }
   }, false);

   /* 正規表現確認ツール関係 */
   // 正規表現確認ツールの表示・非表示アニメーション
   var switch_button_name = 'close_button';
   var tool_box = document.getElementById('tool_box');
   tool_box.appendChild(
     generateRegexTool('460px', switch_button_name, TRANSLATION_SUFFIX));

   // toggle
   var switchButton = document.getElementsByClassName('switch_tool')[0];
   switchButton.addEventListener('click', function() {
     var close_button = tool_box.getElementsByClassName(switch_button_name)[0];
     var evt = document.createEvent('UIEvent');
     evt.initEvent('click', false, false);
     close_button.dispatchEvent(evt);
   });
 });
})(document);
