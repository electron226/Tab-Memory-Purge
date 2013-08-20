/*jshint globalstrict: true, unused: false*/
'use strict';

/**
* 正規表現検証ツールの一致文字列を置き換える際に使用する関数
* @param {string} str マッチした部分文字列.
*/
function replacer(str)
{
  return '<span style=\"background: red;\">' + str + '</span>';
}

/**
* 正規表現検証ツールの入力をチェック
*/
function checkRegex(document)
{
  var elRegularExpression =
      document.querySelector('input[name="regular_expression"]');
  var elOptions = document.querySelector('input[name="options"]');
  var elCompareString = document.querySelector('#compare_string');
  var elResult = document.querySelector('#result');

  // 正規表現で比較・置き換え
  var re = null;
  try {
    re = new RegExp(elRegularExpression.value,
                    elOptions.value ? elOptions.value : '');
  } catch (e) {
    console.log('checkRegex is error. and skipped.');
    return;
  }

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
 * Generate quick reference of regex.
 * @param {Array} regex_array Array contains regex object.
 */
function generateReference(regex_array)
{
  var table = document.createElement('table');
  table.style.backgroundColor = 'lightgray';
  table.style.color = 'black';
  table.style.fontSize = '12px';
  table.style.margin= '0px 5px 5px 5px';
  var count = 0;
  var tr = null;
  for (var i in regex_array) {
    if (count === 0) {
      tr = document.createElement('tr');
    }

    for (var key in regex_array[i]) {
      var th = document.createElement('th');
      th.style.paddingRight = '5px';
      th.style.textAlign = 'left';
      th.style.width = '6em';
      th.innerText = key;
      tr.appendChild(th);

      var td = document.createElement('td');
      td.style.width = '300px';
      td.innerText = chrome.i18n.getMessage(regex_array[i][key]);
      tr.appendChild(td);
    }

    if (count >= 2) {
      count = 0;
      table.appendChild(tr);
    } else {
      count++;
    }
  }
  if (count !== 0) {
    table.appendChild(tr);
  }

  return table;
}

/**
 * generate reference of regex.
 */
function generateRegexReference()
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

  return {
    regex_reference: generateReference(regex_items),
    regex_option_reference: generateReference(regex_options),
  };
}

function generateRegexTool(sizeY, switch_button_name, suffix)
{
  if (toType(sizeY) !== 'string' ||
      toType(switch_button_name) !== 'string' ||
      toType(suffix) !== 'string') {
    throw new Error('Invalid type of arguments.');
  }

  var coverElement = document.createElement('div');
  coverElement.style.webkitTransitionProperty = '-webkit-transform';
  coverElement.style.webkitTransitionDelay = '0.0s';
  coverElement.style.webkitTransitionDuration = '1.0s';
  coverElement.style.webkitTransitionTimingFunction = 'ease';
  coverElement.style.height = sizeY;

  coverElement.style.backgroundColor = 'rgba(75, 75, 75, 1.0)';
  coverElement.style.color = 'white';
  coverElement.style.fontSize = '14px';
  coverElement.style.position = 'fixed';
  coverElement.style.left = '0px';
  coverElement.style.top = '100%';
  coverElement.style.width = '100%';

  /* close button. */
  var closeButton = document.createElement('Button');
  closeButton.className = switch_button_name;
  closeButton.innerText = '×';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '5px';
  closeButton.style.right = '15px';
  closeButton.style.width = '25px';
  closeButton.style.height = '25px';
  var clicked = false;
  closeButton.addEventListener('click', function() {
    if (clicked) {
      coverElement.style.webkitTransform = 'translate(0px,' + sizeY + ')';
      clicked = false;
    } else {
      coverElement.style.webkitTransform = 'translate(0px,' + '-' + sizeY + ')';
      clicked = true;
    }
  });
  coverElement.appendChild(closeButton);

  /* regex input area. */
  var regexp = document.createElement('div');
  regexp.id = 'regexp';
  var regexText = document.createElement('div');
  regexText.className = 'regex' + suffix;
  regexp.appendChild(regexText);

  // input area.
  var regexInput = document.createElement('span');
  var slash = document.createElement('span');
  slash.innerText = '/';
  regexInput.appendChild(slash);

  var input = document.createElement('input');
  input.style.backgroundColor = 'lightgray';
  input.style.color = 'black';

  var regular_expression = input.cloneNode(true);
  regular_expression.type = 'text';
  regular_expression.name = 'regular_expression';
  regular_expression.style.width = '80%';
  regular_expression.style.marginLeft = '5px';
  regular_expression.style.marginRight = '5px';
  regular_expression.addEventListener('keyup', function() {
    checkRegex(coverElement);
  });
  regexInput.appendChild(regular_expression);
  regexInput.appendChild(slash);

  var options = input.cloneNode(true);
  options.type = 'text';
  options.name = 'options';
  options.size = '2';
  options.style.marginLeft = '5px';
  options.maxlength = '3';
  options.addEventListener('keyup', function() {
    checkRegex(coverElement);
  });

  regexInput.appendChild(options);
  regexp.appendChild(regexInput);
  coverElement.appendChild(regexp);

  /* target string. */
  var regex_compare_string = document.createElement('div');
  regex_compare_string.className = 'regex_compare_string' + suffix;
  coverElement.appendChild(regex_compare_string);

  // comparison string area.
  var compare_string = document.createElement('textarea');
  compare_string.id = 'compare_string';
  compare_string.name = 'compare_string';
  compare_string.addEventListener('keyup', function() {
    checkRegex(coverElement);
  });
  compare_string.style.backgroundColor = 'lightgray';
  compare_string.style.width = '45%';
  compare_string.style.height = '100px';
  compare_string.style.margin = '0px 5px 0px 5px';
  coverElement.appendChild(compare_string);

  // result area.
  var result = document.createElement('span');
  result.id = 'result';
  result.style.backgroundColor = 'lightgreen';
  result.style.color = 'black';
  result.style.fontSize = '12px';
  result.style.position = 'absolute';
  result.style.width = '45%';
  result.style.height = '100px';
  result.style.padding = '5px';
  coverElement.appendChild(result);

  /* reference */
  var reference = generateRegexReference();

  // regex reference.
  var reference_area = document.createElement('div');
  reference_area.id = 'reference_area';
  reference_area.style.float = 'left';
  reference_area.style.maxWidth = '70%';

  var referenceText = document.createElement('div');
  referenceText.className = 'regex_reference' + suffix;
  reference_area.appendChild(referenceText);

  var regex_reference = document.createElement('div');
  regex_reference.appendChild(reference.regex_reference);
  reference_area.appendChild(regex_reference);
  coverElement.appendChild(reference_area);

  // regex options reference.
  var reference_option_area = document.createElement('div');
  reference_option_area.style.float = 'left';
  reference_option_area.style.maxWidth = '30%';

  var refOptionText = document.createElement('div');
  refOptionText.className = 'regex_option_reference' + suffix;
  reference_option_area.appendChild(refOptionText);

  var regex_option_reference = document.createElement('div');
  regex_option_reference.appendChild(reference.regex_option_reference);
  reference_option_area.appendChild(regex_option_reference);

  var info = document.createElement('div');
  info.id = 'information_area';
  info.style.float = 'left';

  var regex_info = document.createElement('div');
  regex_info.className = 'regex_information' + suffix;
  info.appendChild(regex_info);

  var regex_ref = document.createElement('div');
  regex_ref.className = 'regex_refURL' + suffix;
  regex_ref.style.backgroundColor = 'lightgray';
  regex_ref.style.color = 'black';
  regex_ref.style.padding = '5px';
  regex_ref.style.fontSize = '12px';
  info.appendChild(regex_ref);

  reference_option_area.appendChild(info);

  coverElement.appendChild(reference_option_area);

  return coverElement;
}
