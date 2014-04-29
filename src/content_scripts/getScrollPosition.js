/** ページのスクロール量を取得するのに使用する */
var obj = new Object();
obj.x = document.documentElement.scrollLeft || document.body.scrollLeft;
obj.y = document.documentElement.scrollTop || document.body.scrollTop;
obj; // executeScriptのコールバック関数に返る値
