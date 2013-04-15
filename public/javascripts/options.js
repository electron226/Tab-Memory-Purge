;/** use options.html */


/* options.htmlで読み込み時に実行するスクリプト */
var locale_i18n = [
  'extName', 'option', 'setReleaseFileUrlTitle', 'setTimerTitle',
  'otherTitle', 'assignment', 'in_extension', 'author', 'no_release',
  'explanation',
  'explanation_problem1', 'explanation_solution', 'explanation_problem2',
  'explanation_problem3', 'explanation_problem4', 'forcibly_close_restore',
  'sample', 'example', 'assignment_title', 'assignment_favicon', 'default',
  'save', 'clear', 'init', 'minute', 'exclude_url',
  'regex_tool',
  'regex_refURL', 'regex', 'regex_compare_string', 'regex_reference',
  'regex_option_reference', 'regix_result', 'regex_information',
  'regex_confuse'
];

function InitValues(document, checkTagList, default_values)
{
  if (getType(document) != 'object' ||
      getType(checkTagList) != 'array' ||
      getType(default_values) != 'object') {
    throw 'InitValues Funciton. Argument Error.';
  }

  var debugs = {};
  for (var i = 0; i < checkTagList.length; i++) {
    var tag = checkTagList[i];
    var elements = document.getElementsByTagName(tag);
    for (var z = 0; z < elements.length; z++) {
      var el = elements[z];
      if (tag == 'textarea') {
        // textarea tags
        var storageName = el.name + '_' + el.tagName.toLowerCase();
        var value = default_values[storageName] ?
                    default_values[storageName] : '';
        el.value = value;
        debugs[storageName] = value;
      } else {
        // other tags
        var storageName = el.name + '_' + el.type;
        var value = default_values[storageName];
        switch (el.type) {
          case 'radio':
            if (el.value == value) {
              el.checked = true;
              debugs[storageName] = value;
            }
            break;
          case 'checkbox':
            el.checked = value;
            debugs[storageName] = default_values[storageName];
            break;
          case 'text':
            value = value ? value : '';
            el.value = value;
            debugs[storageName] = value;
            break;
          case 'number':
            el.value = value ? value : 0;
            debugs[storageName] = value;
            break;
        }
      }
    }
  }

  return debugs;
}

function LoadValues(document, default_values, callback)
{
  if (getType(document) != 'object' ||
      getType(default_values) != 'object' ||
      getType(callback) != 'function' &&
      getType(callback) != 'undefined') {
    throw new Error('Invalid argument.');
  }

  // Get All Option Value.
  var debugList = []; // use Debug
  var keys = [];
  for (var key in default_values) {
    keys.push(key);
  }

  chrome.storage.local.get(keys, function(items) {
    for (var key in items) {
      var value = items[key];

      var elName = key.match(/(^[\w]*)_(text|radio|checkbox|number|textarea)$/);
      if (elName) {
        switch (elName[2]) {
          case 'number':
            var element = document.evaluate(
                '//input[@name="' + elName[1] + '"]', document, null, 7, null);
            if (element.snapshotLength != 1) {
              throw 'LoadValues() Get ' + elName[2] + ' error.';
            }
            element.snapshotItem(0).value = value;
            debugList.push(elName[1]);
            break;
          case 'radio':
            var element = document.evaluate(
                '//input[@name="' + elName[1] + '"][@value="' + value + '"]',
                document, null, 7, null);
            if (element.snapshotLength != 1) {
              throw 'LoadValues() Get ' + elName[2] + ' error.';
            }
            element.snapshotItem(0).checked = true;
            debugList.push(elName[1]);
            break;
          case 'checkbox':
            var element = document.evaluate(
                '//input[@name="' + elName[1] + '"]', document, null, 7, null);
            if (element.snapshotLength != 1) {
              throw 'LoadValues() Get ' + elName[2] + ' error.';
            }
            element.snapshotItem(0).checked = value;
            debugList.push(elName[1]);
            break;
          case 'text':
            var element = document.evaluate(
                '//input[@name="' + elName[1] + '"]', document, null, 7, null);
            if (element.snapshotLength != 1) {
              throw 'LoadValues() Get ' + elName[2] + ' error.';
            }
            element.snapshotItem(0).value = Trim(value);
            debugList.push(elName[1]);
            break;
          case 'textarea':
            var element = document.evaluate(
                '//textarea[@name="' + elName[1] + '"]',
                document, null, 7, null);
            if (element.snapshotLength != 1) {
              throw 'LoadValues() Get ' + elName[2] + ' error.';
            }
            element.snapshotItem(0).value = Trim(value);
            debugList.push(elName[1]);
            break;
        }
      }
    }
    callback(debugList);
  });
}

function SaveValues(document, saveTypes, callback)
{
  if (getType(document) != 'object' ||
      getType(saveTypes) != 'array' ||
      getType(callback) != 'function' &&
      getType(callback) != 'undefined') {
    throw new Error('Invalid argument.');
  }

  var save = new Object();

  // inputタグの保存するtype
  var types = '';
  for (var i = 0; i < saveTypes.length; i++) {
    types += '@type="' + saveTypes[i] + '"';
    if (i + 1 < saveTypes.length) {
      types += ' or ';
    }
  }

  var inputs = document.evaluate(
      '//input[' + types + ']', document, null, 7, null);
  for (var i = 0; i < inputs.snapshotLength; i++) {
    var storageName = inputs.snapshotItem(i).name +
                      '_' + inputs.snapshotItem(i).type;
    switch (inputs.snapshotItem(i).type) {
      case 'radio':
        if (inputs.snapshotItem(i).checked) {
          save[storageName] = inputs.snapshotItem(i).value;
        }
        break;
      case 'checkbox':
        save[storageName] = inputs.snapshotItem(i).checked;
        break;
      case 'text':
        save[storageName] = Trim(inputs.snapshotItem(i).value);
        break;
      case 'number':
        save[storageName] = inputs.snapshotItem(i).value;
        break;
    }
  }

  var textareas = document.evaluate('//textarea', document, null, 7, null);
  for (var i = 0; i < textareas.snapshotLength; i++) {
    var storageName = textareas.snapshotItem(i).name + '_' +
                      textareas.snapshotItem(i).tagName.toLowerCase();
    save[storageName] = Trim(textareas.snapshotItem(i).value);
  }

  // save options.
  chrome.storage.local.set(save, function() {
    // saved key catalog
    var debug = [];
    for (var key in save) {
      debug.push(key);
    }

    callback(debug);
  });
}


/**
* 「解放に使うぺージを指定」の項目の有効無効状態を確認・変更
*/
function ReleasePageChangeState()
{
  var selectElement = document.evaluate(
      '//input[@name="release_page" and @value="assignment"]',
      document, null, 7, null);
  if (selectElement.snapshotLength != 1) {
    throw new Error("onReleasePage function. can't get selectElement.");
  }

  var assi_options = document.evaluate(
      '//li[@id="assignment_options"]/input[@type="checkbox"]',
      document, null, 7, null);
  if (assi_options.snapshotLength != 2) {
    throw new Error("onReleasePage function. can't get assi_options.");
  }
  var state = selectElement.snapshotItem(0).checked;
  var release_url = document.querySelector("input[name='release_url']");
  release_url.enabled = state;
  release_url.disabled = !state;
  for (var j = 0; j < assi_options.snapshotLength; j++) {
    assi_options.snapshotItem(j).disabled = state;
  }
}


/**
* ロケール文字列の読み込み
*/
function InitTranslation()
{
  // テキストの設定
  for (var i = 0; i < locale_i18n.length; i++) {
    var el = document.getElementsByClassName(locale_i18n[i] + 'Text');
    var message = chrome.i18n.getMessage(locale_i18n[i]);
    for (var j = 0; j < el.length; j++) {
      var string = el[j].innerHTML;
      var index = string.lastIndexOf('</');
      el[j].innerHTML = string.substring(0, index) +
          message + string.substring(index);
    }
  }
}


/**
* 正規表現検証ツールの一致文字列を置き換える際に使用する関数
* @param {string} str マッチした部分文字列.
* @param {integer} offset マッチが現れた文字列内のオフセット.
* @param {string} s マッチが現れた文字列自体.
*/
function replacer(str, offset, s) {
  return '<span style=\"background: red;\">' + str + '</span>';
}


/**
* 正規表現検証ツールの入力をチェック
*/
function checkRegex()
{
  var elRegularExpression =
      document.querySelector('input[name="regular_expression"]');
  var elOptions = document.querySelector('input[name="options"]');
  var elCompareString = document.querySelector('#compare_string');
  var elResult = document.querySelector('#result');

  // 正規表現で比較・置き換え
  var re = new RegExp(elRegularExpression.value,
                      elOptions.value ? elOptions.value : '');
  var replacedString = '';
  var compareStringSplit = elCompareString.value.split('\n');
  for (var i = 0; i < compareStringSplit.length; i++) {
    replacedString += compareStringSplit[i].replace(re, replacer) + '<br>';
  }

  // 結果を表示する領域の高さ変更
  elResult.style.height = compareStringSplit.length * 1.5 + 'em';

  // 表示
  elResult.innerHTML = replacedString;
}


/**
* 正規表現クイックリファレンスの生成と表示
*/
function createRegexReference()
{
  var regex_items = [
    { '[abc]' : 'regex_single' },
    { '.' : 'regex_any_single' },
    { '(...)' : 'regex_capture' },
    { '[^abc]' : 'regex_any_except' },
    { '\\s' : 'regex_whitespace' },
    { '(a|b)' : 'regex_or' },
    { '[a-z]' : 'regex_range' },
    { '\\S' : 'regex_non_whitespace' },
    { 'a?' : 'regex_zero_one' },
    { '[a-zA-Z]' : 'regex_range_or' },
    { '\\d' : 'regex_digit' },
    { 'a*' : 'regex_zero_more' },
    { '^' : 'regex_start' },
    { '\\D' : 'regex_non_digit' },
    { 'a+' : 'regex_one_more' },
    { '$' : 'regex_end' },
    { '\\w' : 'regex_word' },
    { 'a{3}' : 'regex_exactly' },
    { '\\W' : 'regex_non_word' },
    { 'a{3,}' : 'regex_three_or_more' },
    { '\\b' : 'regex_word_boundary' },
    { 'a{3,6}' : 'regex_between' }
  ];
  var regex_options = [
    { 'i' : 'regex_confuse' }
  ];

  // リファレンス作成
  var outputRegex = '<table>';
  var count = 0;
  for (var i in regex_items) {
    if (count == 0) {
      outputRegex += '<tr>';
    }

    for (var j in regex_items[i]) {
      outputRegex += '<th>' + j + '</th>';
      outputRegex += '<td>' +
          chrome.i18n.getMessage(regex_items[i][j]) + '</td>';
    }

    if (count >= 2) {
      outputRegex += '</tr>';
      count = 0;
      continue;
    }
    count++;
  }
  if (count != 0) {
    outputRegex += '</tr>';
  }
  outputRegex += '</table>';

  // オプション部分作成
  var outputOption = '<table>';
  for (var i in regex_options) {
    if (count == 0) {
      outputOption += '<tr>';
    }

    for (var j in regex_options[i]) {
      outputOption += '<th>' + j + '</th>';
      outputOption += '<td>' +
          chrome.i18n.getMessage(regex_options[i][j]) + '</td>';
    }

    if (count >= 3) {
      outputOption += '</tr>';
      count = 0;
      continue;
    }
    count++;
  }
  if (count != 0) {
    outputOption += '</tr>';
  }
  outputOption += '</table>';

  // 出力
  document.querySelector('#regex_reference').innerHTML = outputRegex;
  document.querySelector('#regex_option_reference').innerHTML = outputOption;
}

document.addEventListener('DOMContentLoaded', function() {
  InitTranslation();
  InitValues(document, ['input', 'textarea'], default_values);
  LoadValues(document, default_values, function() {
    ReleasePageChangeState();
  });

  // 設定項目など
  var elements = document.querySelectorAll("input[name='release_page']");
  for (var i = 0; i < elements.length; i++) {
    elements[i].addEventListener('click', function() {
      ReleasePageChangeState();
    });
  }

  var status = document.getElementById('status');
  var timeoutTime = 1000;
  document.querySelector('#save').addEventListener('click', function(e) {
    SaveValues(document, ['checkbox', 'radio', 'text', 'number'], function() {
      chrome.runtime.sendMessage({ event: 'initialize' });

      status.innerHTML = 'Options Saved.';
      setTimeout(function() {
        status.innerHTML = '';
      }, timeoutTime);
    });
  }, false);
  document.querySelector('#load').addEventListener('click', function(e) {
    LoadValues(document, default_values, function() {
      status.innerHTML = 'Options Loaded.';
      setTimeout(function() {
        status.innerHTML = '';
      }, timeoutTime);
    });
  }, false);
  document.querySelector('#init').addEventListener('click', function(e) {
    InitValues(document, ['input', 'textarea'], default_values);

    status.innerHTML = 'Options Initialized.';
    setTimeout(function() {
      status.innerHTML = '';
    }, timeoutTime);
  }, false);

  /* 正規表現確認ツール関係 */
  // 正規表現確認ツールの表示・非表示アニメーション
  var move_pixelY = 460; // 表示サイズ
  var elTool = document.querySelector('#tool_box');
  elTool.style.webkitTransitionProperty = '-webkit-transform';
  elTool.style.webkitTransitionDelay = '0.0s';
  elTool.style.webkitTransitionDuration = '1.0s';
  elTool.style.webkitTransitionTimingFunction = 'ease';
  elTool.style.height = move_pixelY + 'px';

  // toggle
  var clicked = false;
  var elOpenTool = document.querySelectorAll('.open_tool');
  for (var i = 0; i < elOpenTool.length; i++) {
    elOpenTool[i].addEventListener('click', function(event) {
      if (clicked) {
        elTool.style.webkitTransform = 'translate(0px, ' + move_pixelY + 'px)';
        clicked = false;
      } else {
        elTool.style.webkitTransform = 'translate(0px, ' + -move_pixelY + 'px)';
        clicked = true;
      }
    });
  }

  document.querySelector('input[name="regular_expression"]').addEventListener(
      'keyup', checkRegex);
  document.querySelector('input[name="options"]').addEventListener(
      'keyup', checkRegex);
  document.querySelector('#compare_string').addEventListener(
      'keyup', checkRegex);

  // 正規表現クイックリファレンス
  createRegexReference();
});
