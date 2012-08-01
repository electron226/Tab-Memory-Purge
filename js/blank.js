/** blank.htmlで行う処理のスクリプトファイル */
function GetQueryString()
{
    if( 1 < document.location.search.length )
    {
        // 最初の1文字(&)を除いた文字列を取得
        var query = document.location.search.substring(1);

        var parameters = query.split('&');

        var result = new Object();
        for(var i = 0; i < parameters.length; i++)
        {
            var element = parameters[i].split('=');

            var paramName = decodeURIComponent(element[0]);
            var paramValue = decodeURIComponent(element[1]);

            result[paramName] = decodeURIComponent(paramValue);
        }

        return result;
    }

    return null;
}

var head = document.getElementsByTagName('head');
function ChangeFavicon(favicon)
{
    var head_html = head[0].innerHTML;
    var insert_pos = head_html.lastIndexOf('</head>');
    var head_html = head_html +
        '<link rel="icon" href="' + favicon + '" type="image/' +
        favicon.substr(favicon.lastIndexOf('.') + 1) + '">';
    head[0].innerHTML = head_html;
}

function Run()
{
    var args = GetQueryString();

    if (args['title']) {
        document.title = decodeURIComponent(args['title']);

        var span = document.getElementById('title');
        span.innerHTML = document.title;
    }

    if (args['favicon']) {
        ChangeFavicon(decodeURIComponent(args['favicon']));
    }

    var span = document.getElementById('url');
    if (args['url']) {
        var url = decodeURIComponent(args['url']);
        span.innerHTML = '<a href="' + url + '">' + url + '</a>';
    } else {
        span.innerHTML = 'None';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    Run();
});
