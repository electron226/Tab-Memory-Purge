# Tab Memory Purge
Google Chrome用のタブ拡張機能です。
設定した条件にそって、使用していないタブのメモリを解放します。

## 設定可能項目
- 非アクティブのタブをアンロードする時間
    - 前回アクティブになった時間から設定した時間が過ぎると、メモリを解放します。
- 除外するアドレス(正規表現対応)
    - 動作対象外のサイトを指定できます。
- 各操作のキーバインド
	- 除外するアドレス(正規表現対応)
    	- キーバインドの動作対象外のサイトを指定できます。
- その他
    - その他の細かい項目を設定できます。
    
## 簡単な仕様
- タブごとにsetIntervalを設定し、指定したアンロード時間ごとにアンロードするか否かを判断。
- 一定時間ごとに、解放されたタブの一覧(セッション)を保存・自動解放処理のチェックを行う。
- タブをアクティブにすると、時間はリセット。
- アンロードする場合、拡張機能内のほぼ空のページを読み込み、メモリを解放します。
- 現在のタブが除外リストに追加されているかどうかでツールバーのアイコンが変化します。
    - ![なにもなし](https://raw.githubusercontent.com/electron226/Tab-Memory-Purge/master/src/img/icons/icon_019.png) = どの除外リストにもマッチしませんでした。
    - ![キーバインド×](https://raw.githubusercontent.com/electron226/Tab-Memory-Purge/master/src/img/icons/icon_019_with_keybind.png) = キーバインドの除外リストにマッチ
    - ![赤×](https://raw.githubusercontent.com/electron226/Tab-Memory-Purge/master/src/img/icons/icon_019_use_exclude.png) = ユーザが指定した除外リストにマッチ
    - ![赤K×](https://raw.githubusercontent.com/electron226/Tab-Memory-Purge/master/src/img/icons/icon_019_use_exclude_with_keybind.png) = ユーザが指定した除外リストとキーバインドの除外リストにマッチ
    - ![黄×](https://raw.githubusercontent.com/electron226/Tab-Memory-Purge/master/src/img/icons/icon_019_extension_exclude.png) = 拡張機能内で固定された除外リストにマッチ
    - ![黄K×](https://raw.githubusercontent.com/electron226/Tab-Memory-Purge/master/src/img/icons/icon_019_extension_exclude_with_keybind.png) = 拡張機能内で固定された除外リストとキーバインドの除外リストにマッチ
    - ![緑×](https://raw.githubusercontent.com/electron226/Tab-Memory-Purge/master/src/img/icons/icon_019_temp_exclude.png) = 一時的な除外リストにマッチ
    - ![緑K×](https://raw.githubusercontent.com/electron226/Tab-Memory-Purge/master/src/img/icons/icon_019_temp_exclude_with_keybind.png) = 一時的な除外リストとキーバインドの除外リストにマッチ
- ブラウザアクションのアイコンに現在、解放しているタブの数を表示します。

## ライセンス
[GPL Version 3](https://github.com/electron226/Tab-Memory-Purge/blob/master/LICENSE.md)

Those icons made by Google from www.flaticon.com is licensed by [CC BY 3.0](https://github.com/electron226/Tab-Memory-Purge/blob/master/src/img/icons/material%20design/CC%20BY%203.0.md)
https://github.com/electron226/Tab-Memory-Purge/tree/master/src/img/icons/material%20design
