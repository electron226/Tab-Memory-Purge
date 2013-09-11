/*jshint globalstrict: true, unused: false*/
"use strict";

/**
 * 受け取った引数を分解し、連想配列(ハッシュ)として返す。
 * @return {Object} 引数を表す連想配列。キーは受け取った引数名。
 *                  引数がない場合はnullが返る。
 */
function getQueryString()
{
  if (1 < document.location.search.length) {
    // 最初の1文字(&)を除いた文字列を取得
    var query = decodeURIComponent(document.location.search.substring(1));

    var parameters = query.split('&');

    var result = {};
    for (var i = 0; i < parameters.length; i++) {
      var element = parameters[i].split('=');

      var paramName = element[0];
      var paramValue = decodeURIComponent(element[1]);

      result[paramName] = paramValue;
    }

    return result;
  }

  return null;
}

/**
 * ファビコン変更
 * @param {String} favicon 変更するファビコンを表すURL
 */
function changeFavicon(favicon)
{
  var head = document.querySelector('head');
  var head_html = head.innerHTML;
  head_html = head_html +
              '<link rel="icon" href="' + favicon + '" type="image/' +
              favicon.substr(favicon.lastIndexOf('.') + 1) + '">';
  head.innerHTML = head_html;
}

/**
 * onFocusイベント時に実行する関数。
 * タブのフォーカス時に元ページにジャンプする際には以下のコードを手動で使用。
 * example:
 *   window.addEventListener('focus', onFocus, true);
 */
var lock = 0;
function onFocus() {
  console.log('OnFocus');
  if (lock === 0) {
    lock++;

    var args = getQueryString();
    if (args.url) {
      location.replace(args.url);
    }

    lock--;
  }
}

document.addEventListener('DOMContentLoaded', function() {
  var args = getQueryString();

  // recommend element.
  if (args.title) {
    document.title = args.title;
    document.querySelector('#title').textContent = document.title;
  }

  // recommend element.
  if (args.favicon) {
    changeFavicon(args.favicon);
  }

  // Indispensable element.
  var span = document.querySelector('#url');
  if (args.url) {
    var url = args.url;
    span.innerHTML = '<a href="' + url + '">' + url + '</a>';
  } else {
    span.innerHTML = 'None';
  }
});
