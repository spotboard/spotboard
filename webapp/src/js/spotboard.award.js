define([
    'jquery',
    'spotboard',

    'spotboard.view',
    'spotboard.util',
    'spotboard.animation',
    'handlebars'
],
function($, Spotboard) {

    Spotboard.Award = {};

    /**
     * award focus 할 다음 팀을 고름.
     *
     * @return $team jQuery object. 이미 끝났으면 null
     */
    Spotboard.Award.getNextTeam = function() {
        // 가장 밑에 있는 국내팀 - 다음 해외팀
        // TODO 여기서 dom manipulation 안하게 못하나 ㅜㅜ)
        var $domestic_teams = $("div.team:not(.finalized):not(.foreign)");
        var $foreign_teams = $("div.team:not(.finalized).foreign");
        var $team;
        if ($domestic_teams.length != 0)
            $team = $domestic_teams.last();
        else
            $team = $foreign_teams.last();

        if($team.length == 0) {
            return null;
        }
        return $team;
    };

    /**
     * 현재 focus된 팀 $team에서 다음으로 공개할 문제를 고름.
     *
     * @return (pending 상태인) $problem-result jQuery object. 현재 팀에서 더 없으면 null.
     *
     */
    Spotboard.Award.getNextPendingToShow = function($team) {
        var $pending = $team.find(".problem-result.pending");
        if($pending.length == 0)
            return null;

        Spotboard.Award.revealPriority = Spotboard.Award.revealPriority || (function() {
            var contest = Spotboard.contest,
                problems = contest.getProblems();
            var order = Spotboard.config['award_reveal_order'] || [];
            var priority = new Array(contest.getProblems().length);

            // construct a dict from (problem title) -> id,
            // e.g. {'A' : 1, 'B' : 2, ...}
            var problemToId = {};
            for(var i = 0; i < problems.length; ++ i) {
                var problemName = problems[i].name, problemTitle = problems[i].title;
                problemToId[problemName] = problems[i].id;
                problemToId[problemTitle] = problems[i].id;
                // PC^2 default is 'Problem A' or something like this
                problemToId[problemTitle.replace(/^Problem /, '')] = problems[i].id;
            }
            // set up priority (larger is earlier)
            for(var i = 0; i < priority.length; ++ i) priority[i] = -i;
            for(var i = 0; i < order.length; ++ i) {
                var id = problemToId[order[i]] || parseInt(order[i]);
                priority[id] += (order.length - i) * 10000;
            }
            return priority;
        })();

        // 지정된 순서가 있다면 그 중 처음 것을, 아니면 가장 앞쪽 문제를 반환
        $pending.sort(function(x, y) {
            var xid = $(x).data('problem-id'),
                yid = $(y).data('problem-id');
            // priority가 큰 문제가 앞으로 오도록.
            return Spotboard.Award.revealPriority[yid] - Spotboard.Award.revealPriority[xid];
        });
        return $($pending[0]);
    };

    /**
     * 어워드 모드에서 한 번의 스텝을 proceed 하는 핸들러.
     * 한 팀, 한 문제의 런을 연속적으로 피딩하고 스코어보드에 반영하는 로직들.
     */
    Spotboard.Award.doProceedStep = function() {
        var contest = Spotboard.contest,
            runfeeder = Spotboard.runfeeder;

        var $df = new $.Deferred();

        // 실수방지 : 어워드 슬라이드가 떠 있을 때에는 동작 못함(esc로 꺼야함)
        if( Spotboard.Award.AwardSlide.isSlideDisplayed() )
            return $df.resolve('slide-on');

        // 슬라이드가 이미 열린 것이 있으면 off.
        Spotboard.Award.AwardSlide.hide();

        var $team = Spotboard.Award.getNextTeam();
        var teamId = $team.data('team-id');
        if(!$team) {
            // TODO event trigger
            return $df.resolve('end');    // THE END
        }

        if(Spotboard.Animation.Focus.has($team) == false) {
            Spotboard.Animation.Focus.on($team);

            // 어워드 모드에서 팀 이름을 숨기는 경우, 포커스 on과 동시에 reveal
            Spotboard.Award.revealTeamDisplayIfHidden($team, /*animation*/true);

            return $df.resolve('focus');
        }

        // 다음으로 깔 run/problem 을 선택한다.
        var $pending = Spotboard.Award.getNextPendingToShow($team);

        if(! $pending) {
            // 팀 finalize
            Spotboard.Animation.Focus.off($team);
            Spotboard.Award.finalizeTeam($team);

            // 해당 팀에 등록된 슬라이드가 있으면 슬라이드를 보여준다.
            Spotboard.Award.AwardSlide.showForTeam( contest.getTeam(teamId) );
            return $df.resolve('done');
        }

        var problemId = $pending.data('problem-id'),
            teamId = $team.data('team-id');    // TODO ㅜㅜ

        /* use blinking effect if possible */
        var use_blinking_effect = Spotboard.config['award_focus_blinking'];
        if(typeof use_blinking_effect === "function") {
            use_blinking_effect = !! use_blinking_effect(contest.getTeamStatus(teamId));
        }
        if(use_blinking_effect) {
          /* state: (none) -> (focused) -> (revealing) -> (done) */
            if(! $pending.hasClass('award-run-focus') &&
               ! $pending.hasClass('award-run-revealing')) {
                // a. (none) -> (focused)
                $pending.addClass('award-run-focus');
                return $df.resolve('run-focused')
            }
            else {
                // b. (focused) -> (revealing)
                $pending.removeClass('award-run-focus');
                $pending.addClass('award-run-revealing');

                $df.always(function() {
                  // after resolved, remove this marker class as well
                  // c. (revealing) -> (done)
                  $pending.removeClass('award-run-revealing');
                });
            }
        }

        // 등수에 따라 애니메이션 (flip/move team up) 속도를 다르게 함
        // solved 경계값을 기준으로 (푼 문제수) >= solved 인 최초의 것을 찾음
        var animInfo = $.grep(
                Spotboard.config['award_animation_speeds'] || [],
                function(elem, idx) {
                    return elem.solved <= contest.getTeamStatus(teamId).getTotalSolved();
                })[0];
        animInfo = animInfo || {};

        // TODO 함수로 처리
        Spotboard.Award.awardManagerTeamProblemSelector = {
            teamId : teamId,
            problemId : problemId
        };

        // 의존성의 방향이 영 좋지않다 ㅠㅠ TODO
        Spotboard.Manager.feedSingleRun(
            function updateAnimation(run, remainCount) {
                var animation = new Spotboard.Animation.UpdateRun(run, {
                    flipSpeed: animInfo.fastFlipSpeed || 300,
                });
                if(remainCount == 0 || run.isAccepted())
                    animation.setFlipSpeed(animInfo.slowFlipSpeed || 700);

                return animation;
            },
            function moveTeamUpAnimation(team, run) {
                var animation = new Spotboard.Animation.MoveTeamUp(team, animInfo.utuSpeedFunc);

                return animation;
            }
        )
        .pipe( function(run) {
            // run update 에니메이션이 끝난 이후 실행됨.
            // run : feedSingleRun 에서 깐 런 (deferred로 resolve된)

            // TODO : 현재 구현은 Animation.UpdateRun 에서 트랜지션이 끝나면 포커스를 꺼버리는 문제가 있다.
            // 일단 임시방편으로 포커스를 다시 잡는데 대략 구조가 좋지 않으므로 개선이 필요함;
            // 여기서 포커스 잡으면 scrollTo 도 해버리는 게 문제군 OTL
            $team.addClass('target'); // WTF FIXME

            // 후속 처리
            // 만약 맞아서 올라갔으면 포커스를 끔.
            // 여기서 보는 $pending 은 업데이트가 다 된 이후의 상태이다.
            if($pending.hasClass('solved'))    { // TODO DOM 말고 다른 방법은?
                Spotboard.Animation.Focus.off($team);
                $df.resolve('up');
            }
            else if($pending.hasClass('pending')) { // 더 깐다.
                $df.progress('pending');
                setTimeout( function() {
                    Spotboard.Award.doProceedStep()
                        .then(function() { $df.resolve('done') });
                }, 0);
            }
            else {
                $df.resolve('done');    // 더이상 깔게 없음. we are done.
            }
        });

        return $df;
    };

    Spotboard.Award.proceedOne = Spotboard.Util.withDeferredLock(
        Spotboard.Award.doProceedStep
    );


    Spotboard.Award.revealTeamDisplayIfHidden = function($team, use_animation) {
        if(! $team.find('.team-name').hasClass('award-hidden'))
            return false;

        var contest = Spotboard.contest,
            team = contest.getTeam( $team.data('team-id') );

        // TODO 여기 class 주는 부분 css와 함께 개선
        var $_target = $team.find('.team-name, .team-represents')
            .removeClass('award-hidden');

        if(use_animation) {
            $_target
                .addClass('award-revealing')
                .delay(1000, 'revealing-done').queue('revealing-done', function(next) {
                    $(this).removeClass('award-revealing');
                }).dequeue('revealing-done');
        }

        // animation !
        var $tname = $team.find('.team-name');
        var $trepr = $team.find('.team-represents');

        $trepr.text( team.getGroup() );
        $tname.text( team.getName() );
    };



    Spotboard.Award.initAwardMode = function() {
        var runfeeder = Spotboard.runfeeder;

        // award 모드일때에는 animation 사용을 강제한다.
        Spotboard.config['animation'] = true;

        /**
         * 어워드 모드에서 까야 하는 run들.
         * 현재 최초 feeding시 initial_runid(maximum run id) 이후의 모든 run들이다.
         */
        var awardFeedingRuns = [];

        // initial_runid 이후의 런들은 다 펜딩으로 피딩함
        var smallestPendingRunId = null;    // 펜딩처리된 최소의 run id
        runfeeder.strategy._popRun = runfeeder.strategy.popRun;
        runfeeder.strategy.popRun = function() {
            var runIntercepted = runfeeder.strategy._popRun.apply(this);
            if(runIntercepted) {
                // 어워드 모드에서 까기 위한 run들을 집어넣고
                awardFeedingRuns.push(runIntercepted.clone());

                // 아직 까지 않은 run들은 pending 상태로 만들어서 보여주도록 한다.
                // pending으로 표시한다.
                runIntercepted.result = '';
                if(smallestPendingRunId === null || smallestPendingRunId > runIntercepted.getId())
                    smallestPendingRunId = runIntercepted.getId();
            }
            return runIntercepted;
        };
        runfeeder.feed(1000000);    // 끝까지 다 feed

        $("#wrapper").addClass('award-mode');

        // feed 전략을 바꾸고, 모든 run을 다시 fetch한다.
        Spotboard.Award.awardManagerTeamProblemSelector = {
            // 이 오브젝트의 pid, tid에 따라 run을 깐다.
            problemId : null,
            teamId: null
        };
        runfeeder.setStrategy( new TeamProblemSeparatedQueuedRunFeedingStrategy(
            function() {    // returns {problemId, teamId}
                return Spotboard.Award.awardManagerTeamProblemSelector;
            }
        ));

        // award 모드에서 까면서 보여줄 run들을 runfeeder에 집어넣는다.
        runfeeder.fetchRunsFromArray(awardFeedingRuns);

        // TODO 이거 이렇게 의존성 있어도 되려나?_?
        // 나중에 Manager 쪽에서 설정하도록 고치자
        $(document).bind('keyup', function(e) {
            var KEY_CODES = {
                RIGHT: 39,
                ENTER: 13,
                SEMICOLON: 186,
                ESC: 27
            };
            if(e.keyCode == KEY_CODES.ENTER || e.keyCode == KEY_CODES.RIGHT || e.keyCode == KEY_CODES.SEMICOLON) {
                Spotboard.Award.proceedOne();
            }
            else if(e.keyCode == KEY_CODES.ESC) {
                Spotboard.Award.AwardSlide.hide();
            }
        });

        // 스코어보드가 다 그려진 이후에 실행될 기능들
        $(Spotboard).bind('drew', Spotboard.Award.forwardToRankBegin);
        $(Spotboard).bind('drew', Spotboard.Award.bindFinalizedTeamEventHandlers);

        // 런 & award slide 로드에 성공하면 스코어보드를 그리고 시작한다.
        $.when(Spotboard.Award.AwardSlide.fetch())
         .then(function() {
            $(Spotboard).trigger('ready');

            // award_slide.json에 있는 icon 파일 이름에 따라 css style을 추가한다.
            var added = {};
            var $style= $('<style type="text/css" id="award-medal-icon"></style>');
            $.each(Spotboard.Award.AwardSlide.data, function(idx, val) {
                var icon = val.icon;
                if (!icon || added[icon]) return;
                added[icon] = true;
                $style.append(
'.award-medalist.'+icon+' .team-name:after { background-image: url("../img/award/'+icon+'.png"); }\n'
                );
            });
            $('head').append($style);
         });
    };

    /**
     * 스코어보드가 그려진 이후에, 각 팀에 대한 event handler를 초기화 한다.
     * 예컨대 클릭 이벤트 등이 있을 수 있다.
     */
    Spotboard.Award.bindFinalizedTeamEventHandlers = function() {
        var $teamlist = $('#team-list');

        /*
         * finalized 된 '수상'팀에 한해 클릭 이벤트를 추가한다.
         * 혹시라도 finalize된 이후 슬라이드가 실수로 넘어간 경우, 이를 다시 보여줄 때 사용한다.
         */
        $teamlist.on('click', '.team.finalized.award-medalist .team-name', function(e) {
            e.preventDefault();
            var teamId = $(this).parents(".team").data('team-id');
            Spotboard.Award.AwardSlide.showForTeam(teamId);
        });
    };


    Spotboard.Award.finalizeTeam = function($team) {
        $team.addClass('finalized');

        // 수상팀인 경우 배지를 달아준다.
        var slide = Spotboard.Award.AwardSlide.getSlideData($team.data('team-id'));
        if(slide != null) {
            var icon = slide.icon;
            if(icon) {
                $team.addClass('award-medalist ' + icon);
            }
        }
    };


    /**
     * 어워드 모드에서, 시작 위치까지의 상태로 빨리감기한다.
     * @see Spotboard.Config['award_rank_begin']
     */
    Spotboard.Award.forwardToRankBegin = function() {
        var rankBegin = parseInt(Spotboard.config['award_rank_begin']);
        if(!rankBegin) return false;

        // 런을 까는 팀/순서에 따라 스코어보드의 상태가 다르기 때문에
        // 실제 award에서 하는 그대로 시뮬레이션하는 수밖에 없다.
        // (e.g. NMU 이후의 런이지만, rankBegin 밑에 있다가 맞아서 올라온 경우? TODO)
        //
        // DOM manipulation이 많아서 다소 느릴 수 있음..

        var forward_step = function() {
            var $team = Spotboard.Award.getNextTeam();
            if(! $team) return 'break';

            var teamCurrentRank = $team.index();
            if(teamCurrentRank < rankBegin)
                return 'break';

            // hidden된 팀 정보 공개.
            // 빨리감기 시뮬레이션에서는 계속 숨길 수 있다 (finalize될 때에만 공개).
//            Spotboard.Award.revealTeamDisplayIfHidden($team, /*animation*/false);

            var teamId = $team.data('team-id');
            var $pending = Spotboard.Award.getNextPendingToShow($team);
            if(!$pending) {
                Spotboard.Award.revealTeamDisplayIfHidden($team, /*animation*/false);
                Spotboard.Award.finalizeTeam($team);
                return [teamId, 'finalize']; // continue
            }

            if(console) {
                console.log('Forwarding... Rank: ' + teamCurrentRank +
                            ', Team ' + teamId + ' : Problem ' + $pending.data('problem-id'));
            }

            var problemId = $pending.data('problem-id');

            Spotboard.Award.awardManagerTeamProblemSelector = {
                teamId : teamId,
                problemId : problemId
            };

            // TODO refactor & decouple feeding and animation
            // Spotboard.Manager 로의 의존성도 제거해야 함.
            var run = null;
            var $fed_df = Spotboard.Manager.feedSingleRun(
                // TODO 중복
                function updateAnimation(run, remainCount) {
                    var animation = new Spotboard.Animation.UpdateRun(run);
                    animation.setFlipAnimationEnabled(false);
                    return animation;
                },
                function moveTeamUpAnimation(team, run) {
                    var animation = new Spotboard.Animation.MoveTeamUp(team);
                    animation.setAnimationEnabled(false);
                    return animation;
                }
                // TODO 중복 END
            );

            if($fed_df.state() == 'rejected') {
                // it means that there is no more run to feed.
                if(console) {
                    console.log("WARNING: There is no more run to feed -- something wrong?\n" +
                                "teamId = " + teamId + ", problemId = " + problemId);
                }
                return 'break';
            }
            return [teamId, problemId]; // continue
        };

        // equivalent to the following, but let DOM be rendered in-place.
        /* while(true) { if(forward_step() == 'break') break; } */
        var forward_step_fn = (function() {
            while (true) {
                var r = forward_step();
                if(r == 'break') break; /* DONE */
                if(r[1] == 'finalize') {
                    return setTimeout(forward_step_fn, 0); // doEvents()
                }
            }
        });
        forward_step_fn();
    };


    Handlebars.registerHelper('humanizeRank', function(rank) {
        if(typeof rank === 'number')
            return new Handlebars.SafeString('<span class="suffix-' + Spotboard.Util.ordinalSuffix(rank) + '">' + rank + '</span> Place');
        else
            return rank;
    });

    // 어워드 슬라이드 템플릿
    Spotboard.JST['awardslide'] = Handlebars.compile('\
<div class="award-slide">\
    <div class="award-rank">{{humanizeRank rank}}</div>\
    <div class="award-represents">{{group}}</div>\
    <div class="award-teamname">{{name}}</div>\
{{#if others}}\
    <div class="award-others">\
        <ul>\
            {{#each others}}\
            <li>\
                <span class="award-represents">{{group}}</span> &mdash;\
                <span class="award-teamname">{{name}}</span>\
                {{#if rank}}\
                    (<span class="award-rank suffix-{{ordinalSuffix rank}}">{{rank}}</span>)\
                {{/if}}\
            </li>\
            {{/each}}\
        </ul>\
    </div>\
{{/if}}\
</div>\
');

    Spotboard.Award.AwardSlide = {
        data : {},

        fetch : function(url) {
            url = url || Spotboard.config['path']['award_slide.json'];
            return $.ajax({
                url: url,
                dataType : 'json',
                timeout : Spotboard.config['fetch_timeout'] || 2000,
                success : function(data) {
                    for(var i = 0; i < data.length; ++ i) {
                        if(! data[i].id) continue;
                        Spotboard.Award.AwardSlide.data[data[i].id] = data[i];
                    }
                },
                error : function(xhr, stat, err) {
                    console.log('Unable to fetch ' + url + ' : ' + err);
                }
            });
        },

        show : function(slideData) {
            var $slide = $( Spotboard.JST['awardslide'](slideData) );

            // 기존에 존재하는 모든 slide는 제거함
            $(".award-slide").remove();
            $slide.fadeIn('slow').appendTo( $("body") );
        },

        getSlideData : function(team) {
            var teamId;
            if(typeof team === 'number' || typeof team === 'string')
                teamId = parseInt(team);
            else teamId = team.getId();

            return Spotboard.Award.AwardSlide.data[teamId] || null;
        },

        showForTeam : function(team) {
            var slideData = Spotboard.Award.AwardSlide.getSlideData(team);
            if(!slideData) return;
            Spotboard.Award.AwardSlide.show(slideData);
        },

        isSlideDisplayed : function() {
            return $(".award-slide").length > 0;
        },

        hide : function() {
            $(".award-slide").fadeOut( function() {
                $(this).remove();
            });
        }
    };

    return Spotboard.Award;
});
