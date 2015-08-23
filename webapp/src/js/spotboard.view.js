define([
    'jquery',
    'handlebars',
    'spotboard',

    'spotboard.util'
],
function($, Handlebars, Spotboard) {

    Spotboard.View = { };
    Spotboard.View.search_filter = '';
    Spotboard.View.page = 0;
    Spotboard.View.search_page = 0;

    /**
     * contest의 기본 정보들을 DOM에 표시해줌
     */
    Spotboard.View.displayContestInformation = function() {
        var contest = Spotboard.contest;
        $("head > title , #contest-title").text(
            contest.getContestTitle()
        );
        $("#system-information").text(
            contest.getSystemName() + " " + contest.getSystemVersion()
        );
    };

    /**
     * System Message notification
     */
    Spotboard.View.displaySystemMessage = function(msg, color) {
        if(!msg) return;
        if(!color) color = 'black';
        $("#loading-message").text(msg).css('color', color);
    };

    /**
     * color, balloon, counter 관련한 CSS를 동적으로 추가함
     */
    Spotboard.View.initStyles = function() {
        var contest = Spotboard.contest;

        var problems = contest.getProblems();
        var hsv_from = [-2/360, 0.96, 0.31];
        var hsv_to = [105/360, 0.96, 0.31];
        var $style= $('<style type="text/css" id="problem-balloon-style"></style>');
        for (var i = 0; i <= problems.length;i++)
        {
            var ratio = i / problems.length;
            var h = hsv_from[0] * (1 - ratio) + hsv_to[0] * ratio;
            var s = hsv_from[1] * (1 - ratio) + hsv_to[1] * ratio;
            var v = hsv_from[2] * (1 - ratio) + hsv_to[2] * ratio;
            if (i % 2 == 1) {
                s = Math.max(s - 0.15, 0);
                v = Math.min(v + 0.1, 1);
            }

            $style.append(
'.solved-' + i + ' .solved-count { background-color: ' + Spotboard.Util.hsv2rgb(h, s, v) + '; }\n'
            );
        }

        for (var i = 0; i < problems.length;i++)
        {
            var problem = problems[i];
            if(!problem) continue;
            var pid = problem.getId();
            var probColor = problem.getColor();
            $style.append(
'.problem-result.problem-' + pid + ':before { content: "' + problems[i].getName() + '"; }\n'
            );
            if(probColor) $style.append(
'.balloon.problem-' + pid + ' { background-image: url(assets/balloons/' + probColor + '.png); }\n'
            );

            // balloon 이미지를 prefetch (DOM 그린 후 요청하면 풍선이 너무 늦게 뜸)
            new Image().src = 'assets/balloons/' + probColor + '.png';
        }

        $('head').append($style);
    };


    // team list template (handlebars) from index.html
    Spotboard.JST['teamlist'] = (function() {
        var html = $('#team-handlebar-template').html().trim();
        if(!html) throw new Error('team-handlebar-template is missing');
        return Handlebars.compile(html);
    })();

    /**
     * Scoreboard 를 처음부터 그린다.
     */
    Spotboard.View.drawScoreboard = function() {
        var contest = Spotboard.contest,
            problems = contest.getProblems(),
            ranked_teamstats = contest.getRankedTeamStatusList();

        if(Spotboard.config['show_team_group'])
            $("#wrapper").addClass('show-group');
        if(Spotboard.config['animation'] == false)
            $("#wrapper").addClass('no-animation');
        if(Spotboard.config['pagination'])
            $("#wrapper").addClass('pagination');

        var $teamlist = $("#team-list").empty();
        var isTeamInfoHidden = Spotboard.config['award_mode'] && Spotboard.config['award_hide_name'];

        /**
         * Scoreboard를 그리기 위해 필요한 내부 메소드로,
         * 하나의 team을 나타내는 div element (jQuery Wrapper object)를 새로 만들어 반환한다.
         *
         * @see Spotboard.JST['teamlist'] handlebar 템플릿 (index.html)
         */
        var createTeamElement = function(team) {

            var $item = $(Spotboard.JST['teamlist']({
                id : team.getId(),
                solved : 0,
                rank : 1,
                suffix : "st",    // 어차피 나중에 update 할 것임. 그전까지만 1st
                name : isTeamInfoHidden ? "Team " + team.getId() : team.getName(),
                group : isTeamInfoHidden ? "Unknown" : team.getGroup(),
                penalty : 0,
                problems: problems
            }) );
            $item.data('team-id', team.getId());

            // TODO improve with css
            if(isTeamInfoHidden) $item.find('.team-name, .team-represents').addClass('award-hidden');

            return $item;
        };

        for(var idx in ranked_teamstats)
        {
            var team = ranked_teamstats[idx].getTeam();
            // 스코어보드에서 제외된 팀 처리
            // TODO 의존성의 방향이 좋지 못함 (Manager 참조하면 안됨). Refactoring
            if(Spotboard.Manager.isTeamExcluded(team))
                continue;
            $teamlist.append(createTeamElement(team));
        }

        // 해외팀 처리
        if(Spotboard.config['foreign_teams']) {
            $.each(Spotboard.config['foreign_teams'], function(idx, val) {
                $("#team-" + val).addClass('foreign');
            });
        }

        // team to follow
        if(Spotboard.config['team_to_follow']) {
            var teamId = Spotboard.config['team_to_follow'];
            var $team = $("#team-" + teamId);
            $team.addClass('followed');
        }

        // sticky 기능 : IE에서는 crash 버그가 있어 webkit만 지원
        if(! Spotboard.browser.webkit) {
            Spotboard.config['use_followed_team_sticky'] = false;
        }
        if(Spotboard.config['team_to_follow'] && Spotboard.config['use_followed_team_sticky']) {
            var teamId = Spotboard.config['team_to_follow'];
            var $team = $("#team-" + teamId);

            var height = $team.height();
            stickyOption = {
                top : $team.offset().top,
            };

            var scrollHandler = function() {
                var stickyClass = (function() {
                    var r = '';
                    var y = $(window).scrollTop();
                    if(y + 0.5 * height >= stickyOption.top) { r = 'sticky-top'; }
                    else if(y + window.innerHeight - height <= stickyOption.top) { r = 'sticky-bottom'; }
                    else { return ''; }

                    // 특수 처리: pagination을 넘어있는 경우에는 항상 고정
                    if($team.hasClass('beyond-page-prev')) { r = 'sticky-top'; }
                    else if($team.hasClass('beyond-page-next')) { r = 'sticky-bottom'; }

                    return r;
                });
                $team.removeClass('sticky-top sticky-bottom').addClass(stickyClass);
            };

            $(window).scroll(scrollHandler);
            $(Spotboard).one('drew', scrollHandler);

            var updateStickyOptionHandler = function() {
                if(! $team.hasClass('hidden')) {
                    // 이미 $team이 sticky 되어 있으면 position:fixed라서 offset()이 원하는 대로 안나온다.
                    // fixed 되지 않아야 올바른 offset이 얻어지므로 잠시 CSS로 바꾸는 트릭을 쓴다.
                    $team.css('position', 'relative');
                    stickyOption.top = $team.offset().top;
                    $team.css('position', '');
                }
                $(window).trigger('scroll');
            };

            $(Spotboard).bind('visibilityUpdated', updateStickyOptionHandler);
            $(Spotboard).bind('teamPositionUpdated', updateStickyOptionHandler);
        }

        Spotboard.View.refreshScoreboard();
        $(Spotboard).trigger('drew');
    };

    /**
     * Scoreboard 를 애니메이션 없이 전체 갱신한다.
     */
    Spotboard.View.refreshScoreboard = function() {
        var contest = Spotboard.contest,
            problems = contest.getProblems(),
            ranked_teamstats = contest.getRankedTeamStatusList();
        var $teamlist = $('#team-list');
        var teamsInOrder = [];

        for(var idx in ranked_teamstats)
        {
            var team = ranked_teamstats[idx].getTeam();
            var $team = $teamlist.find('#team-' + team.getId());
            if(!$team.length) continue;

            // 실제 rank 순서대로 DOM을 처리하기 위해 detach한 뒤 $teamlist에 append
            $team.detach();
            Spotboard.View.updateTeamStatus($team);
            teamsInOrder.push($team);
        }
        for(var i in teamsInOrder)
            $teamlist.append(teamsInOrder[i]);

        Spotboard.View.updateVisibility();
        $(Spotboard).trigger('teamPositionUpdated');
    };

    /**
     * 팀 표시 여부 업데이트 (검색/페이지네이션 조건 등에 따라
     * 현재 화면에 보여질 팀들을 show/hide 한다.)
     *
     * 덩달아 페이지네이션 정보도 같이 업데이트한다.
     * @event visibilityUpdated
     */
    Spotboard.View.updateVisibility = function() {
        var contest = Spotboard.contest;
        var is_searching = Spotboard.View.search_filter != '';

        var usePagination = Spotboard.config['pagination'] || false;
        // award 모드에서는 pagination 사용 안함.
        if(Spotboard.config['award_mode']) usePagination = false;
        var page_size = usePagination ? (Spotboard.config['pagination_size'] || 50) : 100000;

        var target_page = !is_searching ? Spotboard.View.page : Spotboard.View.search_page;
        var search_regex = is_searching ? new RegExp(Spotboard.View.search_filter, 'i') : null;

        // 0-indexed range for this page
        var begin = target_page * page_size;
        var end = (target_page + 1) * page_size;
        var effective_idx = 0;
        var $teams = $('#team-list > .team');

        var visibleTeams = [];
        $teams.removeClass('visible-first beyond-page-prev beyond-page-next');

        $teams.addClass('hidden').each(function(idx, team_dom) {
            var $team = $(team_dom),
                teamId = $team.data('team-id'),
                team = contest.getTeam(teamId);
            if (search_regex && !search_regex.test(team.getName()) && !search_regex.test(team.getGroup(true)))
            {
                return;
            }

            if (begin <= effective_idx && effective_idx < end) {
                // set visible.
                $team.removeClass('hidden');
                visibleTeams.push($team);
            }
            else if ($team.hasClass('followed')) {
                // followed 팀은 페이지가 넘어가도 항상 보인다.
                $team.removeClass('hidden');
                if(effective_idx < begin) $team.addClass('beyond-page-prev');
                if(effective_idx >= end)  $team.addClass('beyond-page-next');
            }
            effective_idx++;
        });

        if(visibleTeams.length > 0) {
            // mark first visible team except the followed
            $(visibleTeams[0]).addClass('visible-first');
        }

        // num of total Pages (>=1)
        var totalPages = parseInt(Math.max(1, (effective_idx - 1) / page_size + 1));

        // 페이지네이션 navigation을 업데이트
        $("#page-label span.current-page").text(target_page + 1);
        $("#page-label span.max-page").text(totalPages);

        var pagerLeftEnabled = (target_page > 0);
        var pagerRightEnabled = (target_page + 1 < totalPages);

        $("#page-left" ).removeClass('disabled').addClass(pagerLeftEnabled  ? '' : 'disabled');
        $("#page-right").removeClass('disabled').addClass(pagerRightEnabled ? '' : 'disabled');

        Spotboard.View.updateSolvedCountVisibility();
        $(Spotboard).trigger('visibilityUpdated');
    };

    /* 페이지네이션 */
    Spotboard.View.paginate = function(amt) {
        amt = parseInt(amt) || 0;
        if(!amt) return;
        // TODO : page underflow, overflow 방어처리 (page 모델 분리 이후)

        var is_searching = Spotboard.View.search_filter != '';
        if(!is_searching)
            Spotboard.View.page += amt;
        else
            Spotboard.View.search_page += amt;

        Spotboard.View.updateVisibility();
    };


    /**
     * 팀 등수 업데이트
     */
    Spotboard.View.updateTeamRank = function($team, rank) {
        $team.find(".team-rank")
            .text(rank)
            .removeClass( function(index, css) {
                return css.match(/suffix-.*/).join(' ');
            })
            .addClass( 'suffix-' + Spotboard.Util.ordinalSuffix(rank) );
        return $team;
    };

    /**
     * 하나의 team element에 대한 상태를 업데이트한다.
     */
    Spotboard.View.updateTeamStatus = function($team) {
        if($team == null || !$team.length) return;
        var contest = Spotboard.contest,
            problems = contest.getProblems(),
            teamId = $team.data('team-id'),
            teamStatus = contest.getTeamStatus(teamId);

        // 문제푼 갯수
        var solved = teamStatus.getTotalSolved();
        $team.removeClass( function(index, css) { return css.match(/solved-\d*/).join(' '); } )
            .addClass('solved-' + solved);        // TODO improve with css

        $team.find('.solved-count').text(solved);

        // 페널티
        var penalty = teamStatus.getPenalty();
        $team.find(".team-penalty").text( penalty );

        // 등수
        var rank = teamStatus.getRank();
        Spotboard.View.updateTeamRank($team, rank);

        // 각 문제별 상태 업데이트
        var problemsNewlySolved = [];
        $team.find(".problem-result").each( function(index) {
            // TODO index를 attr로 선택하도록
            var problemStat = teamStatus.getProblemStatus(problems[index]);

            $(this).removeClass('solved failed pending');
            if(problemStat.isAccepted()) {
                $(this).addClass('solved');
                if($team.find('.balloon.problem-' + index).length == 0)
                    problemsNewlySolved.push(problemStat);
            }
            else {
                if(problemStat.isPending())
                    $(this).addClass('pending');
                else if(problemStat.isFailed())
                    $(this).addClass('failed');
            }

            var sign = problemStat.isAccepted() ? "+" : "-";
            if(problemStat.getFailedAttempts() > 0) {
                $(this).text(sign + problemStat.getFailedAttempts());
            }
        });

        problemsNewlySolved.sort(function(p, q) {
            return p.getSolvedRun().getId() - q.getSolvedRun().getId();
        } );

        $.each(problemsNewlySolved, function(idx, problemStat) {
            Spotboard.View.addBalloon($team, problemStat);
        } );

    };

    Spotboard.View.addBalloon = function($team, problemStat) {
        var $balloonHolder = $team.find('.balloons');
        $('<span></span>')
            .addClass('balloon')
            .addClass('problem-' + problemStat.getProblem().getId())
            .appendTo($balloonHolder);
    };


    Spotboard.View.updateSolvedCountVisibility = function() {
        var contest = Spotboard.contest,
            problems = contest.getProblems();
        var $teamlist = $('#team-list');

        $('.solved-count').removeClass('first last');
        for(var i = 0; i <= problems.length; ++ i) {
            var group = $teamlist.find('.team:not(.hidden).solved-' + i);
            if(!group.length) continue;
            group.first().find('.solved-count').text('' + i).addClass('first');
            group.last().find('.solved-count').addClass('last');
        }
    };

    Spotboard.View.setSearchFilter = function(filter_text) {
        Spotboard.View.search_filter = filter_text;
        Spotboard.View.search_page = 0;
        Spotboard.View.updateVisibility();
    };

    return Spotboard.View;

});
