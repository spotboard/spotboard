define([
    'spotboard',
    'jquery',
    'spotboard.manager'
],
function(Spotboard, $) {

    // 비동기로 데이터를 로드한 후 시작
    $.when(
        Spotboard.Manager.loadContest(),
        Spotboard.Manager.loadRuns()
    )
    .then(Spotboard.Manager.initContest);

});
