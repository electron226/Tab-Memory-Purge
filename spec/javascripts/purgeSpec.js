describe('purge.js', function() {
    it('call CheckMatchUrlString function', function() {
        var yahoo = 'http://www.yahoo.co.jp/';
        var google = 'http://www.google.co.jp/'

        var exclude = 'www.google.co.jp\nnicovide.jp';

        CheckMatchUrlString(
          google, { list: exclude, options: 'i' }, function(result) {
            expect(result).toBeTruthy();
        });

        CheckMatchUrlString(
          yahoo, { list: exclude, options: 'i' }, function(result) {
            expect(result).toBeFalsy();
        });
    });
});
