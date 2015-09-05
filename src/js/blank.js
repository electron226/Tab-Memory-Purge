/** blank.htmlで行う処理のスクリプトファイル */
(function(window, document) {
  "use strict";

  var db = null;

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {//{{{
      switch (message.event) {
        case 'location_replace':
          var url = document.getElementById('url');
          if (url.textContent.length === 0) {
            sendResponse(true);
          } else {
            window.location.replace(url.textContent);
            sendResponse(false);
          }
          break;
      }
    }
  );//}}}

  function navigateToPageBeforePurged()//{{{
  {
    var args = getQueryString(document);
    if (args.url) {
      window.location.replace(args.url);
    }
  }//}}}

  var F5Key = generateKeyString({
    ctrl    : false,
    alt     : false,
    shift   : false,
    meta    : false,
    keyCode : 116,
  });

  document.addEventListener('click', navigateToPageBeforePurged, true);

  document.addEventListener('keydown', function(e) {//{{{
    if (F5Key === generateKeyString(keyCheck(e))) {
      navigateToPageBeforePurged();
    }
  }, true);//}}}

  document.addEventListener('DOMContentLoaded', () => {//{{{
    (() => {
      db = new Database(dbName, dbVersion);
      return db.open(dbCreateStores);
    })()
    .then(() => {
      return new Promise((resolve, reject) => {
        var args = getQueryString(document);

        var span = document.querySelector('#url');
        if (args.url) {
          var url     = args.url;
          var a       = document.createElement('a');
          a.href      = url;
          a.innerText = url;
          span.appendChild(a);
        } else {
          span.innerHTML = 'None';
          reject();
          return;
        }

        db.get({
          name : dbPageInfoName,
          key  : args.url,
        })
        .then(resolve)
        .catch(reject);
      });
    })
    .then(pageInfo => {
      return new Promise((resolve, reject) => {
        if (pageInfo === void 0 || pageInfo === null) {
          document.title = document.querySelector('#url').textContent;
          document.querySelector('#titlePlace')
            .setAttribute('style', 'display: none');
          reject();
          return;
        } else {
          document.title = pageInfo.title;
          document.querySelector('#title').textContent = pageInfo.title;
        }

        return db.get({
          name : dbDataURIName,
          key  : pageInfo.host,
        })
        .then(resolve)
        .catch(reject);
      });
    })
    .then(dataURIInfo => {
      return new Promise(resolve => {
        if (dataURIInfo === void 0 || dataURIInfo === null) {
          var head = document.querySelector('head');
          var link = document.createElement('link');
          link.rel  = 'icon';
          link.href = decodeURIComponent(dataURIInfo.dataURI);
          head.appendChild(link);
        }

        resolve();
      });
    })
    .catch( e => console.error(e) );
  });//}}}
})(this, this.document);
