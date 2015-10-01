/** ページのスクロール量を取得するのに使用する */
function getScrollPosition()
{
  'use strict';

  var rObj = {};
  rObj.x = document.scrollingElement.scrollLeft ||
           document.documentElement.scrollLeft ||
           document.body.scrollLeft;
  rObj.y = document.scrollingElement.scrollLeft ||
           document.documentElement.scrollTop ||
           document.body.scrollTop;
  return rObj; // executeScriptのコールバック関数に返る値
}

getScrollPosition();
