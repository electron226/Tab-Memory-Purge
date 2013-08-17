/* jshint globalstrict: true */
'use strict';

describe('purge.js', function() {
    it('call checkMatchUrlString function', function() {
        var yahoo = 'http://www.yahoo.co.jp/';
        var google = 'http://www.google.co.jp/';

        var exclude = 'www.google.co.jp\nnicovide.jp';

        checkMatchUrlString(
          google, { list: exclude, options: 'i' }, function(result) {
            expect(result).toBeTruthy();
        });

        checkMatchUrlString(
          yahoo, { list: exclude, options: 'i' }, function(result) {
            expect(result).toBeFalsy();
        });
    });
});
