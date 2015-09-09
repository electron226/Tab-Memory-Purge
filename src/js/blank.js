/** blank.htmlで行う処理のスクリプトファイル */
(function(window, document) {
  "use strict";

  // variables.//{{{
  var db = null;

  var maxRecorsiveCount = 3;

  const selectorUrl        = '#url';
  const selectorTitlePlace = '#titlePlace';
  const selectorTitle      = '#title';

  const F5Key = generateKeyString({
    ctrl    : false,
    alt     : false,
    shift   : false,
    meta    : false,
    keyCode : 116,
  });
  //}}}

  function navigateToPageBeforePurged()//{{{
  {
    var args = getQueryString(document);
    if (args.url) {
      window.location.replace(args.url);
    }
  }//}}}

  function getDataOfBeforeToPurge()//{{{
  {
    var url = document.querySelector(selectorUrl).textContent;
    return ajax({ url: url, responseType: 'document' }).then(ret => {
      if (ret.status === 200) {
        var newTitle = ret.response.title;
        if (newTitle) {
          document.title = newTitle;
          document.querySelector(selectorTitle).textContent = newTitle;
          document.querySelector(selectorTitlePlace).removeAttribute('style');

          var favicon = ret.response.querySelector('link[rel="shortcut icon"]');
          var host = getHostName(url);

          db.add({
            name: dbPageInfoName,
            data: {
              url: url,
              title: newTitle || 'Unknown',
              host: host,
            },
          });

          if (favicon) {
            getDataURI(favicon.href)
            .then(iconDataURI => {
              db.add({
                name: dbDataURIName,
                data: {
                  host: host,
                  dataURI: iconDataURI,
                }
              });
            });
          }
        }
        loadPurgedTabInfo();
      }
    });
  }//}}}

  function loadPurgedTabInfo()
  {
    return new Promise((resolve, reject) => {
      (() => {
        var args = getQueryString(document);

        var span = document.querySelector(selectorUrl);
        if (args.url) {
          var url     = args.url;
          var a       = document.createElement('a');
          a.href      = url;
          a.innerText = url;
          span.appendChild(a);
        } else {
          span.innerHTML = 'None';
          reject(new Error("Doesn't get a purged url."));
          return;
        }

        return db.get({
          name : dbPageInfoName,
          key  : args.url,
        });
      })()
      .then(pageInfo => {
        if (pageInfo === void 0 || pageInfo === null) {
          document.title = document.querySelector(selectorUrl).textContent;
          document.querySelector(selectorTitlePlace)
            .setAttribute('style', 'display: none');
          (() => {
            var name = 'get_title_when_does_not_title';
            chrome.storage.local.get(name, items => {
              if (items.hasOwnProperty(name) &&
                  items[name] === true &&
                  maxRecorsiveCount >= 0) {
                console.log('MaxRecorsiveCount is ', maxRecorsiveCount);
                --maxRecorsiveCount;
                getDataOfBeforeToPurge();
              } else {
                reject(new Error("Doesn't get a title of a purged tab."));
              }
            });
          })();
        } else {
          document.title = pageInfo.title;
          document.querySelector(selectorTitle).textContent = pageInfo.title;
        }

        return db.get({
          name : dbDataURIName,
          key  : pageInfo.host,
        });
      })
      .then(dataURIInfo => {
        if (dataURIInfo !== void 0 && dataURIInfo !== null) {
          var head = document.querySelector('head');
          var link = document.createElement('link');
          link.rel  = 'shortcut icon';
          link.href = decodeURIComponent(dataURIInfo.dataURI);
          head.appendChild(link);
        }
      })
      .then(resolve)
      .catch(reject);
    });
  }

  document.addEventListener('click', navigateToPageBeforePurged, true);

  document.addEventListener('keydown', e => {//{{{
    if (F5Key === generateKeyString(keyCheck(e))) {
      navigateToPageBeforePurged();
    }
  }, true);//}}}

  document.addEventListener('DOMContentLoaded', () => {//{{{
    (() => {
      db = new Database(dbName, dbVersion);
      return db.open(dbCreateStores);
    })()
    .then(loadPurgedTabInfo);
  });//}}}

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
})(this, this.document);
