/** blank.htmlで行う処理のスクリプトファイル */
(function(window, document) {
  "use strict";

  chrome.runtime.onMessage.addListener(function(message) {
    switch (message.event) {
      case 'location_replace':
        window.location.replace(message.url);
        break;
    }
  });

  /**
   * 受け取った引数を分解し、連想配列(ハッシュ)として返す。
   * @return {Object} 引数を表す連想配列。キーは受け取った引数名。
   *                  引数がない場合はnullが返る。
   */
  function getQueryString()
  {
    if (1 < document.location.search.length) {
      // 最初の1文字(?)を除いた文字列を取得
      var query = decodeURIComponent(document.location.search.substring(1));

      // 引数ごとに分割
      var parameters = query.split('&');
      var result = {};
      for (var i = 0; i < parameters.length; i++) {
        var element = parameters[i].split('=');
        if (element[0] === '' ||
          element[1] === undefined || element[1] === null) {
          continue;
        }

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
    var link = document.createElement('link');
    link.rel = 'icon';
    link.href = decodeURIComponent(favicon);
    head.appendChild(link);
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
        window.location.replace(args.url);
      }

      lock--;
    }
  }

  document.addEventListener('click', onFocus, true);

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
      var a = document.createElement('a');
      a.href = url;
      a.innerText = url;
      span.appendChild(a);
    } else {
      span.innerHTML = 'None';
    }

    // reload tab when you focus tab.
    if (args.focus === 'true') {
      addEventListener('focus', onFocus, true);
    }
  });
})(window, document);
