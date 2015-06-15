/** blank.htmlで行う処理のスクリプトファイル */
(function(window, document) {
  "use strict";

  var db = null;

  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    switch (message.event) {
      case 'location_replace':
        let url = document.getElementById('url');
        if (url.textContent.length === 0) {
          sendResponse(true);
        } else {
          window.location.replace(url.textContent);
        }
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
      let query = decodeURIComponent(document.location.search.substring(1));

      // 引数ごとに分割
      let parameters = query.split('&');
      let result = {};
      for (let i of parameters) {
        let element = i.split('=');
        if (element[0] === '' ||
            element[1] === undefined || element[1] === null) {
          continue;
        }

        let paramName = element[0];
        let paramValue = decodeURIComponent(element[1]);
        result[paramName] = paramValue;
      }

      return result;
    }

    return null;
  }

  function navigateToPageBeforePurged()
  {
    let args = getQueryString();
    if (args.url) {
      window.location.replace(args.url);
    }
  }

  document.addEventListener('click', navigateToPageBeforePurged, true);

  var F5Key = generateKeyString({
    ctrl    : false,
    alt     : false,
    shift   : false,
    meta    : false,
    keyCode : 116,
  });

  document.addEventListener('keydown', function(e) {
    if (F5Key === generateKeyString(keyCheck(e))) {
      navigateToPageBeforePurged();
    }
  }, true);

  document.addEventListener('DOMContentLoaded', function() {
    (function() {
      db = new Database(dbName, dbVersion);
      return db.open(dbCreateStores);
    })()
    .then(function() {
      let args = getQueryString();

      let span = document.querySelector('#url');
      if (args.url) {
        let url     = args.url;
        let a       = document.createElement('a');
        a.href      = url;
        a.innerText = url;
        span.appendChild(a);
      } else {
        span.innerHTML = 'None';
      }

      return db.get({
        name : dbPageInfoName,
        key  : args.url,
      });
    })
    .then(function(pageInfo) {
      document.title = pageInfo.title;
      document.querySelector('#title').textContent = pageInfo.title;

      return db.get({
        name : dbDataURIName,
        key  : pageInfo.host,
      });
    })
    .then(function(dataURIInfo) {
      return new Promise(function(resolve) {
        let head = document.querySelector('head');
        let link = document.createElement('link');
        link.rel  = 'icon';
        link.href = decodeURIComponent(dataURIInfo.dataURI);
        head.appendChild(link);

        resolve();
      });
    });
  });
})(window, document);
