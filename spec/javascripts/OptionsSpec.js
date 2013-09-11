/*jshint globalstrict: true, unused: false*/
/*global loadFixtures, loadValues, saveValues*/
'use strict';

var chrome = null;
describe('Options Function', function() {
    beforeEach(function() {
      chrome = {
        storage: {
          local: {
            data: {
            'release_page_radio': 'author',
            'timer_number': 20,
            'exclude_url_textarea':
                '^chrome[:|-]\n' +
                '^view-source:\n' +
        '(10.\\d{0,3}|172.(1[6-9]|2[0-9]|3[0-1])|192.168).\\d{1,3}.\\d{1,3}\n' +
                'nicovideo.jp\n' +
                'youtube.com'
            },
            get: function(getValues, callback) {
              if (getValues !== null && toType(getValues) !== 'object') {
                throw new Error('chrome.storage.local.get mock error.');
              }
              if (toType(callback) !== 'function') {
                throw new Error('chrome.storage.local.get mock error.' +
                                ' callback is not function.');
              }

              if (getValues != null) {
                var returnData = {};
                for (var key in getValues) {
                  returnData[key] = this.data[key];
                }
                callback(returnData);
              } else {
                callback(this.data);
              }
            },
            set: function(setObject, callback) {
              for (var key in setObject) {
                this.data[key] = setObject[key];
              }

              callback();
            }
          }
        }
      };
    });

    it('Load Settings', function() {
        loadFixtures('../../options.html');

        expect(function() { loadValues(document, {}); }).not.toThrow();
        expect(function() { loadValues(function() {}); }).toThrow();
        expect(function() { loadValues(document, 1); }).toThrow();

        var values = {
            'release_page_radio': 'author',
            'timer_number': 20
        };
        loadValues(document, values, function(values) {
          expect(values).toEqual([ 'release_page', 'timer' ]);
        });
        loadValues(document, null, function(values) {
          expect(values).toEqual([ 'release_page', 'timer', 'exclude_url' ]);
        });
    });

    it('Save Settings', function() {
        loadFixtures('../../options.html');

        saveValues(
          document, ['checkbox', 'radio', 'text', 'number'], function(debug) {
          var length = 0;
          for (var i in default_values) {
            length++;
          }
          expect(debug.length).toEqual(length);
        });
    });
});
