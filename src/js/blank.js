/** blank.htmlで行う処理のスクリプトファイル */
(function(window, document) {
  "use strict";

  // variables.//{{{
  var db = null;

  const sNumMaxRecorsiveCount = 3;

  const sElementIcon  = document.querySelector('#favicon');
  const sElementTitle = document.querySelector('#title');
  const sElementUrl   = document.querySelector('#url');

  const gObjF5Key = generateKeyString({
    ctrl    : false,
    alt     : false,
    shift   : false,
    meta    : false,
    keyCode : 116,
  });
  //}}}

  function getFaviconOfCurrentPage(pElement)//{{{
  {
    console.info('getFaviconOfCurrentPage',
      Array.prototype.slice.call(arguments));

    var lStrErrMsg = checkFunctionArguments(arguments, [
      function(pValue) { return typeof pValue !== 'object'; }
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    var lXPathIcon = document.evaluate(
      '//link[@rel="shortcut icon" or @rel="icon"]', pElement, null, 7, null);
    return (lXPathIcon.snapshotLength > 0) ? lXPathIcon.snapshotItem(0) : null;
  }//}}}

  function navigateToPageBeforePurged()//{{{
  {
    console.info('navigateToPageBeforePurged');

    var lObjArgs = getQueryString(document);
    if (lObjArgs.url) {
      window.location.replace(lObjArgs.url);
    }
  }//}}}

  function getDataOfBeforeToPurge(pNumRecorsiveCount)//{{{
  {
    console.info('getDataOfBeforeToPurge',
      Array.prototype.slice.call(arguments));

    var lStrErrMsg = checkFunctionArguments(arguments, [
      [ 'number' ],
    ]);
    if (lStrErrMsg) {
      throw new Error(lStrErrMsg);
    }

    var lStrUrl        = "";
    var lStrNewTitle   = "";
    var lStrFaviconUrl = "";
    var lElFavicon     = document.createDocumentFragment();
    var lStrHost       = "";

    lStrUrl = sElementUrl.textContent;
    return ajax({ url: lStrUrl, responseType: 'document' })
    .then(pObjResult => {
      if (pObjResult.status === 200) {
        lStrNewTitle = pObjResult.response.title;
        if (lStrNewTitle) {
          lStrHost   = getHostName(lStrUrl);

          db.add({
            name: gStrDbPageInfoName,
            data: {
              url:   lStrUrl,
              title: lStrNewTitle || 'Unknown',
              host:  lStrHost,
            },
          });

          lElFavicon = getFaviconOfCurrentPage(pObjResult.response);
          lStrFaviconUrl = lElFavicon ? lElFavicon.href :
                                        window.location.origin + '/favicon.ico';
          getDataURI(lStrFaviconUrl)
          .then(pStrIconDataURI => {
            db.add({
              name: gStrDbDataURIName,
              data: {
                host:    lStrHost,
                dataURI: pStrIconDataURI,
              }
            });
          });
        }
        return loadPurgedTabInfo(pNumRecorsiveCount);
      }
    });
  }//}}}

  function loadPurgedTabInfo(pNumRecorsiveCount)
  {
    console.info('loadPurgedTabInfo', Array.prototype.slice.call(arguments));

    var lElSpan    = document.createDocumentFragment();
    var lElA       = document.createDocumentFragment();
    var lElHead    = document.createDocumentFragment();
    var lElLink    = document.createDocumentFragment();
    var lElFavicon = document.createDocumentFragment();

    var lObjArgs      = {};
    var lStrUrl       = '';
    var lStrName      = '';
    var lStrFavicon   = '';
    var lStrErrMsg    = '';
    var lBoolGetTitle = false;
    var lArrayArgs    = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      lStrErrMsg = checkFunctionArguments(lArrayArgs, [
        [ 'number', 'null', 'undefined' ],
      ], true);
      if (lStrErrMsg) {
        reject(new Error(lStrErrMsg));
        return;
      }

      if (pNumRecorsiveCount === void 0 || pNumRecorsiveCount === null) {
        pNumRecorsiveCount = sNumMaxRecorsiveCount;
      } else if (pNumRecorsiveCount < 0) {
        reject(new Error("Doesn't get a title of a purged tab."));
        return;
      }

      lObjArgs = getQueryString(document);
      if (!lObjArgs.hasOwnProperty('url') || lObjArgs.url.length === 0) {
        reject(new Error("Doesn't get a url of arguments on web page."));
        return;
      }

      (() => {
        return new Promise(resolve => {
          chrome.runtime.sendMessage(
            { event: 'check_purged_tab', url: lObjArgs.url }, resolve);
        });
      })()
      .then(() => {
        lElSpan = sElementUrl;
        while (lElSpan.firstChild) {
          lElSpan.removeChild(lElSpan.firstChild);
        }

        if (lObjArgs.url) {
          lStrUrl        = lObjArgs.url;
          lElA           = document.createElement('a');
          lElA.href      = lStrUrl;
          lElA.innerText = lStrUrl;
          lElSpan.appendChild(lElA);
        } else {
          lElSpan.innerHTML = 'None';
          reject(new Error("Doesn't get a purged url."));
          return;
        }

        return db.get({
          name : gStrDbPageInfoName,
          key  : lObjArgs.url,
        });
      })
      .then(pageInfo => {
        return (() => {
          return new Promise(resolve2 => {
            lStrName = 'get_title_when_does_not_title';
            chrome.storage.local.get(lStrName, items => {
              lBoolGetTitle = items.hasOwnProperty(lStrName) ?
                              items[lStrName] :
                              gMapDefaultValues.get(lStrName);
              resolve2(lBoolGetTitle === true ? true : false);
            });
          });
        })()
        .then(option => {
          if (pageInfo === void 0 ||
              pageInfo === null ||
              !pageInfo.hasOwnProperty('title') ||
              pageInfo.title === 'Unknown') {
            if (option === true) {
              document.title = sElementUrl.textContent;
              sElementTitle.setAttribute('style', 'display: none');

              console.log('RecorsiveCount is ', pNumRecorsiveCount);

              (() => {
                return new Promise((resolve2, reject2) => {
                  if (pageInfo !== void 0 &&
                      pageInfo !== null &&
                      pageInfo.hasOwnProperty('url') &&
                      pageInfo.url.length > 0) {
                    db.delete({ name: gStrDbPageInfoName, keys: pageInfo.url })
                    .then(resolve2)
                    .catch(reject2);
                  } else {
                    resolve();
                  }
                });
              })()
              .then(getDataOfBeforeToPurge(--pNumRecorsiveCount))
              .then(resolve)
              .catch(reject);
            } else {
              reject(new Error("Doesn't get a title of a purged tab."));
              return;
            }
          } else {
            document.title            = pageInfo.title;
            sElementTitle.textContent = pageInfo.title;
            sElementTitle.removeAttribute('style');

            return db.get({
              name : gStrDbDataURIName,
              key  : pageInfo.host,
            });
          }
        });
      })
      .then(dataURIInfo => {
        if (dataURIInfo !== void 0 && dataURIInfo !== null) {
          lStrFavicon  = dataURIInfo.dataURI;

          lElHead      = document.querySelector('head');
          lElLink      = document.createElement('link');
          lElLink.rel  = 'shortcut icon';
          lElLink.href = decodeURIComponent(lStrFavicon);

          lElFavicon   = getFaviconOfCurrentPage(document);
          if (lElFavicon) {
            lElHead.removeChild(lElFavicon);
          }
          lElHead.appendChild(lElLink);

          sElementIcon.src = lStrFavicon;
          removeStringFromAttributeOfElement(
            sElementIcon, 'class', 'doNotShow');
        }
      })
      .then(resolve)
      .catch(reject);
    });
  }

  document.addEventListener('click', navigateToPageBeforePurged, true);

  document.addEventListener('keydown', pEvent => {//{{{
    console.info('keydown', pEvent);

    if (gObjF5Key === generateKeyString(keyCheck(pEvent))) {
      navigateToPageBeforePurged();
    }
  }, true);//}}}

  document.addEventListener('DOMContentLoaded', () => {//{{{
    console.info('DOMContentLoaded');

    (() => {
      db = new Database(gStrDbName, gNumDbVersion);
      return db.open(gObjDbCreateStores);
    })()
    .then(loadPurgedTabInfo());
  });//}}}

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {//{{{
    console.info('runtime.onMessage', Array.prototype.slice.call(arguments));

    switch (message.event) {
      case 'location_replace':
        var lStrUrl = document.getElementById('url');
        if (lStrUrl.textContent.length === 0) {
          sendResponse(true);
        } else {
          window.location.replace(lStrUrl.textContent);
          sendResponse(false);
        }
        break;
    }
  });//}}}
})(this, this.document);
