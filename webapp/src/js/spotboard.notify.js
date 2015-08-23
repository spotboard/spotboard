define([
    'spotboard',

    'jquery',
    'contest',
],
function(Spotboard, $) {

    Spotboard.Notify = {};

    Spotboard.Notify.enabled = false;
    Spotboard.Notify.autoclose_delay = 7000;

    Spotboard.Notify.toggleNotification = function(elem) {
        if(! window.webkitNotifications) {
            // not supported
            return false;
        }

        if(window.webkitNotifications.checkPermission() != 0) {
            window.webkitNotifications.requestPermission();
            return Spotboard.Notify.enabled;
        }

        Spotboard.Notify.enabled = !(Spotboard.Notify.enabled);
        return Spotboard.Notify.enabled;
    };

    Spotboard.Notify.showRunNotification = function(run) {
        if(!run || !Spotboard.Notify.enabled) return false;

        // 맞은 런만 노티해줌
        if(run.isAccepted() == false)
            return false;

        var contest = Spotboard.contest,
            team = run.getTeam();
        var teamName = run.getTeam().getName(),
            problemName = run.getProblem().getTitle();

        var attempts = contest.getTeamStatus(team).getProblemStatus(run.getProblem()).getAttempts();
        var title = teamName + ' has solved ' + problemName + ' !';
        var body = 'Run ' + run.getId() + ' in ' + run.getTime() + ' min(s) with ' + attempts + ' attempts, \n'
            + 'New Rank : ' + contest.getTeamStatus(team).getRank();
        var balloonIcon = 'assets/balloons/' + run.getProblem().getColor() + '.png';

        var note = window.webkitNotifications.createNotification(
            balloonIcon, title, body
        );
        note.ondisplay = function(e) {
            // 잠시 후 사라지게 함
            setTimeout( function() {
                e.currentTarget.cancel();
            }, Spotboard.Notify.autoclose_delay);
        };
        note.onclick = function(e) {
            window.focus();
            this.cancel();
        };
        note.show();
        return note;
    };

    $(Spotboard).bind('teamUpdated', function(e, run) {
        setTimeout(function() {
            Spotboard.Notify.showRunNotification(run);
        }, 10);
    });

    return Spotboard.Notify;

});
