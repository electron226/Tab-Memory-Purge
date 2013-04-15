var chrome = null;
describe('Options Function', function() {
    var default_values = null;
    beforeEach(function() {
        chrome = {
            storage: {
                local: {
                    data: new Object();
                    get: function(keys, callback) {
                        var storage = new Object();
                        if (typeof keys == 'string') {
                            storage[keys] = 1;
                        } else if (keys instanceof Array) {
                            for (var i = 0; i < keys.length; i++) {
                                storage[keys[i]] = i;
                            }
                        } else if (keys != undefined &&
                                   keys != null &&
                                   keys instanceof Object) {
                            storage = keys;
                        } else {
                            throw new Error('chrome.storage.local.get error.' +
                                            'Invalid first argument.');
                        }

                        var ret = new Object();
                        var (key in storage) {
                            if (data[key] != undefined) {
                                ret[key] = data[key];
                            }
                        }

                        if (obj instanceof Function) {
                            callback(ret);
                        }
                    },
                    set: function(items, callback) {
                        if (keys != undefined && keys != null &&
                            !(keys instanceof Object)) {
                            throw new Error('chrome.storage.local.set error.' +
                                            'Invalid first argument.');
                        }

                        for (var key in items) {
                            data[key] = items[key];
                        }

                        if (obj instanceof Function) {
                            callback();
                        }
                    }
                }
            }
        };
        default_values = {
            'release_page_radio': 'author',
            'timer_number': 20,
            'exclude_url_textarea':
                '^chrome[:|-]\n' +
                '^view-source:\n' +
        '(10.\\d{0,3}|172.(1[6-9]|2[0-9]|3[0-1])|192.168).\\d{1,3}.\\d{1,3}\n' +
                'nicovideo.jp\n' +
                'youtube.com'
        };

        var save = new Object();
        for (var key in default_values) {
            save[key] = default_values[key];
        }
        chrome.storage.local.set(save);
    });

    it('Initalize Settings', function() {
        loadFixtures('../../options.html');

        expect(function() { InitValues({}, [], {}); }).not.toThrow();
        expect(function() { InitValues([], [], {}); }).toThrow();
        expect(function() { InitValues({}, {}, {}); }).toThrow();
        expect(function() { InitValues({}, [], []); }).toThrow();

        var change_options = InitValues(
            document, ['input', 'textarea'], default_values);

        expect(change_options['release_page_radio']).toEqual('author');
        expect(change_options['timer_number']).toEqual(20);
        expect(change_options['exclude_url_textarea']).toEqual(
                '^chrome[:|-]\n' +
                '^view-source:\n' +
        '(10.\\d{0,3}|172.(1[6-9]|2[0-9]|3[0-1])|192.168).\\d{1,3}.\\d{1,3}\n' +
                'nicovideo.jp\n' +
                'youtube.com'
        );
    });

    it('Load Settings', function() {
        loadFixtures('../../options.html');

        expect(function() { LoadValues(document, {}); }).not.toThrow();
        expect(function() { LoadValues(function() {}); }).toThrow();
        expect(function() { LoadValues(document, 1); }).toThrow();

        LoadValues(document, default_values, function(values) {
          expect(values).toEqual([ 'release_page', 'timer', 'exclude_url' ]);
        });
    });

    it('Save Settings', function() {
        loadFixtures('../../options.html');

        SaveValues(
          document, ['checkbox', 'radio', 'text', 'number'], function(debug) {
          // 最初の要素は空白の要素。evaluteを使った時になぜか入る。
          // loadFixturesが原因？
          expect(debug.length).toEqual(13);
        });
    });
});
