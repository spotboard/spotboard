define([
    'jquery',
    'spotboard',

    'handlebars'
],
function($, Spotboard) {

    Spotboard.Util = {};

    Spotboard.Util.hsv2rgb = function hsv2rgb(h, s, v) {
        h = (h % 1 + 1) % 1; // wrap hue

        var i = Math.floor(h * 6),
            f = h * 6 - i,
            p = v * (1 - s),
            q = v * (1 - s * f),
            t = v * (1 - s * (1 - f));

        var res = (function(){
            switch (i) {
                case 0: return [v, t, p];
                case 1: return [q, v, p];
                case 2: return [p, v, t];
                case 3: return [p, q, v];
                case 4: return [t, p, v];
                case 5: return [v, p, q];
                default: return [0, 0, 0];
            }
        })();

        var red = Math.floor(res[0] * 255).toString(16);
        if (red.length == 1) red = '0' + red;
        var green = Math.floor(res[1] * 255).toString(16);
        if (green.length == 1) green = '0' + green;
        var blue = Math.floor(res[2] * 255).toString(16);
        if (blue.length == 1) blue = '0' + blue;

        return '#' + red + green + blue;
    };

    Spotboard.Util.toTimeDisplayString = function (seconds) {

        function positivefill(num, len) {
            return (Array(len).join("0") + num).slice(-len);
        }
        function zerofill(num, len) {
            return (num < 0 ? '-' : '') + positivefill(Math.abs(num), len);
        }

        var contestTime = parseInt(seconds);
        if(isNaN(contestTime)) return 'xx:xx';

        var minutes = parseInt(seconds / 60);
        var hours = parseInt(minutes / 60);

        var hr = zerofill(hours, 2);
        var mt = zerofill(minutes % 60, 2);

        return (hr + ':' + mt);
    };

    /**
     * jQuery.deferred 를 리턴하는 함수 f에 대해
     * critical section mutex 락을 걸도록 decorate한 함수를 리턴한다.
     */
    Spotboard.Util.withDeferredLock = function(f) {
        var locked = false;
        var mutex = {
            tryLock : function() {
                if(locked) return false;
                locked = true;
                return true;
            },
            release: function() {
                locked = false;
            }
        };

        // try acquire lock
        return function decoratedLock() {
            if(!mutex.tryLock()) return 'locked';

            var $df = f.apply(this, arguments);
            if($df) $df.always(mutex.release);
            return $df;
        }
    };

    Spotboard.Util.ordinalSuffix = function ordinalSuffix(v)
    {
        if(11 <= v % 100 && v % 100 <= 13) return 'th';
        if(v % 10 == 1) return 'st';
        if(v % 10 == 2) return 'nd';
        if(v % 10 == 3) return 'rd';
        return 'th';
    };

    Handlebars.registerHelper('ordinalSuffix',
        Spotboard.Util.ordinalSuffix
    );

    return Spotboard.Util;

});
