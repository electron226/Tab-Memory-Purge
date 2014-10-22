/*jshint shadow: true, loopfunc: true*/
/*global generateRegexTool: true, generateKeyString: true, keyCheck: true,
  formatDate: true */
(function(document) {
  'use strict';

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
          console.log('loadValues() Get ' + key + ' error.');
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
    var inputs = document.evaluate(
      '//article[@id="option_items"]//input' +
      '|//article[@id="option_items"]//textarea', document, null, 7, null);
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


  /* DOM Content Loaded. */
  document.addEventListener('DOMContentLoaded', function() {
    initTranslations(document, translationPath, 'Text');
    loadValues(document, defualtValues, function() {
      initKeybind(document, null, function() {
        loadValues(document, null, function() {
          releasePageChangeState();
        });
      });
    });

    var timeoutTime = 1000;

    /* 設定項目など */
    // 「解放に使うぺージを指定」の項目の有効無効状態を確認・変更
    function releasePageChangeState()
    {
      var selectElement = document.evaluate(
          '//input[@name="release_page" and @value="assignment"]',
          document, null, 7, null);
      if (selectElement.snapshotLength !== 1) {
        throw new Error("onReleasePage function. can't get selectElement.");
      }

      var state = selectElement.snapshotItem(0).checked;
      var release_url = document.querySelector("input[name='release_url']");
      release_url.disabled = !state;

      var assi_options = document.evaluate(
          '//li[@id="assignment_options"]/input[@type="checkbox"]',
          document, null, 7, null);
      if (assi_options.snapshotLength !== 2) {
        throw new Error("onReleasePage function. can't get assi_options.");
      }
      for (var j = 0; j < assi_options.snapshotLength; j++) {
        assi_options.snapshotItem(j).disabled = !state;
      }
    }

    var release_elements = document.evaluate(
        '//input[@name="release_page"]', document, null, 7, null);
    for (var i = 0; i < release_elements.snapshotLength; i++) {
      release_elements.snapshotItem(i).addEventListener(
        'click', releasePageChangeState);
    }

    /* section buttons. */
    var switch_section = {
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
        var bar = el.getElementsByClassName('change_bar')[0];
        var option = document.getElementById(id_name + '_options');
        option.style.display = 'block';
        bar.style.display = 'inline';
        el.style.color = 'gray';
      },
      'disable': function(id_name) {
        var el = document.getElementById(id_name);
        var bar = el.getElementsByClassName('change_bar')[0];
        var option = document.getElementById(id_name + '_options');
        option.style.display = 'none';
        bar.style.display = 'none';
        el.style.color = 'lightgray';
      },
    };

    function showHistory(callback) {
      chrome.storage.local.get('history', function(items) {
        var i, j;
        var data = items.history;
        var history_date = [];
        for (i in data) {
          history_date.push(i);
        }
        history_date.reverse();

        var section = document.getElementById('history_options');
        section.innerHTML = '';
        var fieldset, legend, date, list;
        var div, span, a;
        for (i = 0; i < history_date.length; i++) {
          fieldset = document.createElement('fieldset');
          legend = document.createElement('legend');

          date = new Date(parseInt(history_date[i], 10));
          legend.textContent = formatDate(date, 'YYYY/MM/DD');
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
        }

        if (toType(callback) === 'function') {
          callback();
        }
      });
    }

    var section_menus = document.evaluate('//nav//tr', document, null, 7, null);
    for (var i = 0; i < section_menus.snapshotLength; i++) {
      section_menus.snapshotItem(i).addEventListener('click', function() {
        switch_section.switch(section_menus, this.id);

        var page_title = this.getElementsByClassName(this.id + 'Text')[0];
        document.getElementById('menu_title').textContent =
          page_title.textContent;

        var footer = document.getElementsByTagName('footer')[0];
        if (this.id === 'history') {
          footer.style.display = 'none';
          showHistory();
        } else {
          footer.style.display = 'block';
        }
      });
    }
    if (section_menus.snapshotLength > 0) {
      var menu_item = section_menus.snapshotItem(0);
      switch_section.switch(section_menus, menu_item.id);
    } else {
      console.error('a section menu is not find.');
    }

    /* KeyBinds */
    // Set Button
    var bindButtons = document.evaluate(
                  '//button[@class="bindStart"]', document, null, 7, null);
    var bindStart = null;
    for (var i = 0; i < bindButtons.snapshotLength; i++) {
      bindButtons.snapshotItem(i).addEventListener('click', function() {
          bindStart = this.parentNode.parentNode.attributes.name.nodeValue;
      });
    }
    // Clear Button
    var bindClears = document.evaluate(
                  '//button[@class="bindClear"]', document, null, 7, null);
    for (var i = 0; i < bindClears.snapshotLength; i++) {
      bindClears.snapshotItem(i).addEventListener('click', function() {
        var name = this.parentNode.parentNode.attributes.name.nodeValue;
        var optionName = name + '_keybind';
        if (defualtValues.hasOwnProperty(optionName)) {
          var keyInfo = JSON.parse(defualtValues[optionName]);
          var output = null;
          try {
            output = generateKeyString(keyInfo);
          } catch (e) {
            output = '';
          }
          showKey(document, name, output);
          copyKeyInfoToSaveArea(name, keyInfo);
        }
      });
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
        var regex = /([\w_]+)_keybind/;
        items = values || items;
        for (var key in items) {
          var matches = key.match(regex);
          if (matches) {
            var keyInfo = JSON.parse(items[key]);
            var output = null;
            try {
              output = generateKeyString(keyInfo);
            } catch (e) {
              output = '';
            }
            showKey(document, matches[1], output);
            copyKeyInfoToSaveArea(matches[1], keyInfo);
          }
        }
        if (toType(callback) === 'function') {
          callback();
        }
      });
    }

    function showKey(document, bindStart, output)
    {
      if (document === void 0 ||
          toType(bindStart) !== 'string' || toType(output) !== 'string') {
        throw new Error(
            'showKey function is error. invalid type of arguments.');
      }

      var elementCode =
          '//section[@id="keybind_options"]//tr[@name="' + bindStart + '"]';
      var outElement = document.evaluate(
          elementCode + '//*[@class="pressKey"]', document, null, 7, null);
      if (outElement.snapshotLength !== 1) {
        throw new Error('snapshotLength is not 1 in showKey.');
      }
      outElement.snapshotItem(0).value = output;
    }

    function copyKeyInfoToSaveArea(bindStart, keyInfo)
    {
      if (toType(bindStart) !== 'string' || toType(keyInfo) !== 'object') {
        throw new Error('copyKeyInfoToSaveArea function is arguments error.');
      }

      var elementCode =
          '//section[@id="keybind_options"]//tr[@name="' + bindStart + '"]';
      var keydata = document.evaluate(
          elementCode + '//input[@class="keydata"]', document, null, 7, null);
      if (keydata.snapshotLength !== 1) {
          throw new Error('snapshotLength is not 1 in copyKeyInfoToSaveArea.');
      }
      keydata.snapshotItem(0).value = JSON.stringify(keyInfo);
    }

    document.addEventListener('keyup', function(event) {
      try {
        if (bindStart !== null) {
          var keyInfo = keyCheck(event);
          var output = generateKeyString(keyInfo);
          showKey(document, bindStart, output);
          copyKeyInfoToSaveArea(bindStart, keyInfo);
        }
      } catch (e) {
        if (e.message !== "It don't correspond.") {
          console.log(e.message);
          return;
        }

        var elementCode =
            '//section[@id="keybind_options"]//tr[@name="' + bindStart + '"]';

        var bind_status = document.evaluate(
            elementCode + '//*[@class="status"]', document, null, 7, null);
        if (bind_status.snapshotLength !== 1) {
            throw new Error('snapshotLength is not 1.');
        }
        var item = bind_status.snapshotItem(0);
        item.innerText = e.message;
        setTimeout(function() {
          item.innerText = '';
        }, timeoutTime);
      } finally {
        bindStart = null;
      }
    });

    var inputNumbers = document.evaluate(
      '//input[@type="number"]', document, null, 7, null);
    for (var i = 0; i < inputNumbers.snapshotLength; i++) {
      inputNumbers.snapshotItem(i).onchange = function() {
        var min = parseInt(this.min, 10);
        var max = parseInt(this.max, 10);
        var value = parseInt(this.value, 10);
        if (this.min && value < min) {
          this.value = this.min;
        }
        if (this.max && value > max) {
          this.value = this.max;
        }
      };
    }

    /* status */
    function saveProcess(status, storageType)
    {
      saveValues(document, function() {
        chrome.runtime.sendMessage({ event: 'initialize' });

        status.innerHTML = 'Options Saved.';
        setTimeout(function() {
          status.innerHTML = '';
        }, timeoutTime);
      }, storageType);
    }
    function loadProcess(status, storageType)
    {
      loadValues(document, null, function() {
        initKeybind(document, null, function() {
          status.innerHTML = 'Options Loaded.';
          setTimeout(function() {
            status.innerHTML = '';
          }, timeoutTime);
        });
      }, storageType);
    }
    function initProcess(status)
    {
      loadValues(document, defualtValues, function() {
        initKeybind(document, defualtValues, function() {
          status.innerHTML = 'Options Initialized.';
          setTimeout(function() {
            status.innerHTML = '';
          }, timeoutTime);
        });
      });
    }
    var status = document.getElementById('status');
    var status_sync = document.getElementById('status_sync');
    document.getElementById('save').addEventListener('click', function() {
      saveProcess(status);
    }, false);
    document.getElementById('load').addEventListener('click', function() {
      loadProcess(status);
    }, false);
    document.getElementById('init').addEventListener('click', function() {
      initProcess(status);
    }, false);
    document.getElementById('save_sync').addEventListener('click', function() {
      saveProcess(status_sync, chrome.storage.sync);
    }, false);
    document.getElementById('load_sync').addEventListener('click', function() {
      loadProcess(status_sync, chrome.storage.sync);
    }, false);

    // Import and Export
    var config_view = document.getElementById('config_view');
    var config_view_status = document.getElementById('config_view_status');
    document.getElementById('export').addEventListener('click', function() {
      chrome.storage.local.get(null, function(items) {
        config_view.value = JSON.stringify(items);
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
          }, timeoutTime);
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
      generateRegexTool('460px', switch_button_name, 'Text'));

    // toggle
    var switchButton = document.getElementsByClassName('switch_tool');
    for (var i = 0; i < switchButton.length; i++) {
      switchButton[i].addEventListener('click', function() {
        var close_button = tool_box.getElementsByClassName(switch_button_name);
        for (var j = 0; j < close_button.length; j++) {
          var evt = document.createEvent('UIEvent');
          evt.initEvent('click', false, false);
          close_button[j].dispatchEvent(evt);
        }
      });
    }
  });
})(document);
