/** ページのスクロール量を取得するのに使用する */
var obj = {};
obj.x = document.documentElement.scrollLeft || document.body.scrollLeft;
obj.y = document.documentElement.scrollTop || document.body.scrollTop;
// jshint ignore:start
obj; // executeScriptのコールバック関数に返る値
// jshint ignore:end
