/* global Database */
(function(window, document) {
  "use strict";

  // variables.//{{{
  let db = null;

  const max_recorsive_count = 3;

  const icon_on_html  = document.querySelector('#favicon');
  const title_on_html = document.querySelector('#title');
  const url_on_html   = document.querySelector('#url');

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

    let err_msg = checkFunctionArguments(arguments, [
      function(pValue) { return typeof pValue !== 'object'; }
    ]);
    if (err_msg) {
      throw new Error(err_msg);
    }

    let xpath_icon = document.evaluate(
      '//link[@rel="shortcut icon" or @rel="icon"]', pElement, null, 7, null);
    return (xpath_icon.snapshotLength > 0) ? xpath_icon.snapshotItem(0) : null;
  }//}}}

  function navigateToPageBeforePurged()//{{{
  {
    console.info('navigateToPageBeforePurged');

    let args_in_url = getQueryString(document);
    let url         = '';

    if (args_in_url.hasOwnProperty('url')){
      url = args_in_url.url;
    } else if (url_on_html !== void 0 &&
               url_on_html !== null &&
               url_on_html.textContent.length > 0) {
      url = url_on_html.textContent;
    } else {
      throw new Error("Doesn't find the url for redirect at the previous url.");
    }

    location.replace(url);
  }//}}}

  function getDataOfBeforeToPurge(pRecorsiveCount)//{{{
  {
    console.info('getDataOfBeforeToPurge',
      Array.prototype.slice.call(arguments));

    let err_msg = checkFunctionArguments(arguments, [
      [ 'number' ],
    ]);
    if (err_msg) {
      throw new Error(err_msg);
    }

    let url = url_on_html.textContent;
    return ajax({ url: url, responseType: 'document' })
    .then(pResult => {
      if (pResult.status === 200) {
        let new_title = pResult.response.title;
        if (new_title) {
          let host = getSplitURI(url).hostname;

          db.add({
            name: gStrDbPageInfoName,
            data: {
              url:   url,
              title: new_title || 'Unknown',
              host:  host,
            },
          });

          let favicon = getFaviconOfCurrentPage(pResult.response);
          let favicon_url = favicon ? favicon.href :
                                      window.location.origin + '/favicon.ico';

          getDataURI(favicon_url)
          .then(pIconDataURI => {
            db.add({
              name: gStrDbDataURIName,
              data: {
                host:    host,
                dataURI: pIconDataURI,
              }
            });
          });
        }

        return loadPurgedTabInfo(pRecorsiveCount);
      }
    });
  }//}}}

  function loadPurgedTabInfo(pRecorsiveCount)
  {
    console.info('loadPurgedTabInfo', Array.prototype.slice.call(arguments));

    let args = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      let err_msg = checkFunctionArguments(args, [
        [ 'number', 'null', 'undefined' ],
      ], true);
      if (err_msg) {
        reject(new Error(err_msg));
        return;
      }

      if (pRecorsiveCount === void 0 || pRecorsiveCount === null) {
        pRecorsiveCount = max_recorsive_count;
      } else if (pRecorsiveCount < 0) {
        reject(new Error("Doesn't get a title of a purged tab."));
        return;
      }

      let args_in_url = getQueryString(document);
      if (!args_in_url.hasOwnProperty('url') || args_in_url.url.length === 0) {
        reject(new Error("Doesn't get a url of arguments on web page."));
        return;
      }

      (() => {
        return new Promise(resolve => {
          chrome.runtime.sendMessage(
            { event: 'check_purged_tab', url: args_in_url.url }, resolve);
        });
      })()
      .then(() => {
        let span = url_on_html;
        while (span.firstChild) {
          span.removeChild(span.firstChild);
        }

        if (args_in_url.url) {
          let url         = args_in_url.url;
          let a_tag       = document.createElement('a');
          a_tag.href      = url;
          a_tag.innerText = url;
          span.appendChild(a_tag);
        } else {
          span.innerHTML = 'None';
          reject(new Error("Doesn't get a purged url."));
          return;
        }

        return db.get({
          name : gStrDbPageInfoName,
          key  : args_in_url.url,
        });
      })
      .then(pageInfo => {
        return (() => {
          return new Promise(resolve2 => {
            let name = 'get_title_when_does_not_title';
            chrome.storage.local.get(name, items => {
              let get_title = items.hasOwnProperty(name) ?
                              items[name] : gMapDefaultValues.get(name);
              resolve2(get_title === true ? true : false);
            });
          });
        })()
        .then(option => {
          if (pageInfo === void 0 ||
              pageInfo === null ||
              !pageInfo.hasOwnProperty('title') ||
              pageInfo.title === 'Unknown') {
            if (option === true) {
              document.title = url_on_html.textContent;
              title_on_html.setAttribute('style', 'display: none');

              console.log('RecorsiveCount is ', pRecorsiveCount);

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
              .then(getDataOfBeforeToPurge(--pRecorsiveCount))
              .then(resolve)
              .catch(reject);
            } else {
              reject(new Error("Doesn't get a title of a purged tab."));
              return;
            }
          } else {
            document.title            = pageInfo.title;
            title_on_html.textContent = pageInfo.title;
            title_on_html.removeAttribute('style');

            return db.get({
              name : gStrDbDataURIName,
              key  : pageInfo.host,
            });
          }
        });
      })
      .then(dataURIInfo => {
        if (dataURIInfo !== void 0 && dataURIInfo !== null) {
          let favicon_url  = dataURIInfo.dataURI;

          let head      = document.querySelector('head');
          let link      = document.createElement('link');
          link.rel  = 'shortcut icon';
          link.href = decodeURIComponent(favicon_url);

          let favicon   = getFaviconOfCurrentPage(document);
          if (favicon) {
            head.removeChild(favicon);
          }
          head.appendChild(link);

          icon_on_html.src = favicon_url;
          removeStringFromAttributeOfElement(
            icon_on_html, 'class', 'doNotShow');
        }
      })
      .then(resolve)
      .catch(reject);
    });
  }

  document.addEventListener('click', navigateToPageBeforePurged, true);

  document.addEventListener('keydown', pEvent => {//{{{
    console.info('keydown', pEvent);

    if (gObjF5Key === generateKeyString( keyCheck(pEvent) )) {
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
        try {
          navigateToPageBeforePurged();
        } catch (e) {
          console.error(e);
          sendResponse(false);
          break;
        }
        sendResponse(true);
        break;
    }
  });//}}}
})(this, this.document);
