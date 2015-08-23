define([
    'jquery',
    'spotboard',

    'spotboard.util',
    'jquery.slimscroll',
    'handlebars'
],
function($, Spotboard) {

    var localStorage = window['localStorage'] || {};

    Spotboard.Dashboard = {};
    if(typeof localStorage['spotboard.dashboard'] === 'undefined')
        localStorage['spotboard.dashboard'] = Spotboard.config['show_events'];

    // 대쉬보드에 최대로 보여질 notification의 개수 (넘으면 짜름)
    Spotboard.Dashboard.maxNotifications = Spotboard.config['max_notifications'] || 100;

    Spotboard.Dashboard.isDisplayed = function() {
        return (localStorage['spotboard.dashboard'] == 'true');
    };

    Spotboard.Dashboard.display = function() {
        localStorage['spotboard.dashboard'] = true;
        $("#wrapper").addClass('dashboard');
    };
    Spotboard.Dashboard.hide = function() {
        localStorage['spotboard.dashboard'] = false;
        $("#wrapper").removeClass('dashboard');
    };
    Spotboard.Dashboard.toggle = function(elem) {
        if(this.isDisplayed()) this.hide();
        else this.display();
    };

    if(Spotboard.Dashboard.isDisplayed())
        Spotboard.Dashboard.display();
    else Spotboard.Dashboard.hide();

    // template
    Spotboard.JST['team-run-event'] = Handlebars.compile('\
                <li class="run {{status}}" data-runid="{{runId}}">\
                    <div class="balloon problem-{{problemId}}"></div>\
                    Team <span class="team">{{teamName}}</span>\
                    {{teamDisplayAction}}\
                    <span class="problem">{{problemName}}</span>!\
                    ({{minute}} min.)\
                </li>\
'.trim());

    Spotboard.Dashboard.createRunNotification = function(run) {
        if(!run) return null;

        // 일단 맞거나 틀리거나 낸거나 모두 다 표시해줌
        var contest = Spotboard.contest,
            team = run.getTeam();
        var teamName = run.getTeam().getName(),
            problemName = run.getProblem().getName();

        var status, judgeStatus, teamDisplayAction;
        if(run.isJudgedYes()) {
            status = 'accepted';
            teamDisplayAction = 'got <span class="status">YES</span> on';
        }
        else if(run.isPending()) {
            status = 'pending';
            teamDisplayAction = 'has submitted';
        }
        else {
            status = 'failed';
            teamDisplayAction = 'got <span class="status">NO</span> on';
        }

        var $dashboardUl = $('#dashboard ul.runs');
        var $prevNoty = $dashboardUl.find('> li[data-runid=' + run.getId() + ']');

        if($prevNoty.length) {
            // 이미 있음 : 에니메이션으로 삭제함
            setTimeout( function() {
                $prevNoty
                    .slideUp('fast', function() { $(this).remove(); })
                    .animate({'opacity' : 0}, {'queue' : false, 'duration' : 'fast'});
            }, 500);
        }

        var $noty = $(Spotboard.JST['team-run-event']({
            'status' : status,
            'teamDisplayAction' : new Handlebars.SafeString(teamDisplayAction),
            'runId' : run.getId(),
            'problemId' : run.getProblem().getId(),
            'problemName' : problemName,
            'teamName' : teamName,
            'minute' : run.getTime()
        }));
        return $noty;
    };

    Spotboard.Dashboard.drawAllRunNotification = function() {
        var contest = Spotboard.contest,
            runs = contest.getRuns();

        // 기존에 있던는 업데이트하고 없는거만 그리면 좋겠지만
        // 일단 무식하게 다 날리고[..] 현재 알려진 모든 run을 새로 그림.
        var $dashboardUl = $('#dashboard ul.runs');
        $dashboardUl.empty();

        // runId keys (in reverse order)
        var keys = [];
        for(var runId in runs) keys.unshift(runId);
        for(var i = 0; i < keys.length && i < Spotboard.Dashboard.maxNotifications; ++ i) {
            var runId = keys[i],
                run = runs[runId];

            var $noty = this.createRunNotification(run);
            $noty.appendTo($dashboardUl);
        }
    };

    Spotboard.Dashboard.showRunNotification = function(run) {
        var $noty = this.createRunNotification(run);
        if(!$noty) return false;

        // 애니메이션 : fade in & slide down
        $noty.hide().prependTo($('#dashboard ul.runs'))
            .css('opacity', 0)
            .slideDown().animate({'opacity' : 1}, {'queue': false, 'duration' : 'slow'});

        Spotboard.Dashboard.cutOffIfExcessive();
    };


    // notification이 특정 개수를 넘어가면 자른다.
    Spotboard.Dashboard.cutOffIfExcessive = function() {
        var $notyItems = $('#dashboard ul.runs > li');

        Spotboard.Dashboard.maxNotifications = parseInt(Spotboard.Dashboard.maxNotifications);
        if($notyItems.length > Spotboard.Dashboard.maxNotifications) {
            $notyItems.filter(':gt(' + Spotboard.Dashboard.maxNotifications + ')').remove();

            // 더보기 여기까지라는 느낌의 UI를 추가함
            $('#dashboard ul.runs').append($('<li class="run center">No More Information</li>'));
            return true;
        }

        return false;
    };


    $(Spotboard).bind('teamUpdated', function(e, run) {
        setTimeout(function() {
            Spotboard.Dashboard.showRunNotification(run);
        }, 10);
    });

    $("#dashboard #events-filter").click(function() {
        var $d = $("#dashboard");
        var filter = $d.attr('data-filter');
        if('yes' === filter) filter = '';
        else filter = 'yes';
        $d.attr('data-filter', filter);
    });

    $(document).ready(function() {
        $('#dashboard > ul.runs').slimScroll({
            'allowPageScroll' : false,
            'position' : 'left',
            'height' : '100%'
        });
    });

    return Spotboard.Dashboard;

});
