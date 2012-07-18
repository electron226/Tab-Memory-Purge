# Tab Memory Purge
Google Chrome用のタブ拡張機能です。  

## 機能
設定した条件にそって、使用していないタブのメモリを解放します。  
なお、HTTPSプロトコルを使用しているサイト以外で動作します。  
また、ツールバーのアイコンをクリックすることで、現在開いているページの解放も可能です。  
空ページを読み込み、メモリ解放を行っているため、[Stock Tabs](https://github.com/electron226/Stock-Tabs "Stock Tabs")に比べ、多少メモリ使用量の減りが少ないです。  
そのため、多くのメモリ減少が必要な場合、[Stock Tabs](https://github.com/electron226/Stock-Tabs "Stock Tabs")の使用をおすすめします。

## 設定可能項目
- 非アクティブのタブをアンロードする時間
    - 前回アクティブになった時間から設定した時間が過ぎると、メモリを解放します。
- 除外するアドレス(正規表現対応)
    - メモリを解放されては困るサイト(動画サイト)などを指定することができます。
    
## 簡単な仕様
- タブごとにsetIntervalを設定し、指定したアンロード時間ごとにアンロードするか否かを判断。
- タブをアクティブにすると、時間はリセット。
- アンロードする場合、空ページを読み込み、メモリを解放します。
- この時に使用する空ページは拡張機能のパッケージ内部に含まれています。

## 類似拡張
[TabMemFree](https://chrome.google.com/webstore/detail/pdanbocphccpmidkhloklnlfplehiikb "TabMemFree")
