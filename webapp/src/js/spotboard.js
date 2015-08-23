define([
    'jquery'
],
function(jQuery) {

    // 공통 네임스페이스
    var Spotboard = {};
    window['Spotboard'] = Spotboard;

    /* config 로드
    *
    * config.initial_run
    * config.award_mode
    */
    Spotboard.config = window.config;
    (function(config) {
        var wls = window.location.search.substr(1);
        var rm;

        rm = /r=(\d+)/.exec(wls);
        if(rm) config['initial_runid'] = parseInt(rm[1]);

        rm = /time=(\d+)/.exec(wls);
        if(rm) config['initial_time'] = parseInt(rm[1]);
        if(rm) {
            // time= 파라메터가 있으면 자동재생 안함
            config['auto_play'] = false;
        }

        rm = /award=(true|false)/.exec(wls);
        if(rm) config['award_mode'] = (rm[1] == 'true');

        rm = /award_rank_begin=(\d+)/.exec(wls);
        if(rm) config['award_rank_begin'] = parseInt(rm[1]);

        rm = /animation=(true|false)/.exec(wls);
        if(rm) config['animation'] = (rm[1] == 'true');

        rm = /q=([-*+% \w]+)/.exec(wls);
        if(rm) config['search_query'] = '^' + decodeURIComponent(rm[1]) + '$';

        rm = /t=(\d+)/.exec(wls);
        if(rm) config['team_to_follow'] = parseInt(rm[1]);

    })(Spotboard.config);

    /* 템플릿 지원 */
    Spotboard.JST = window['JST'] = window['JST'] || {};

    /* browser detection and feature detection */
    Spotboard.browser = {};
    Spotboard.browser.webkit = /webkit/.test(navigator.userAgent.toLowerCase());

    return Spotboard;
});
