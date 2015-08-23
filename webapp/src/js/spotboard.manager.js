define([
    'spotboard',

    'jquery',
    'contest',

    'jquery.badger',
    'spotboard.util',
    'spotboard.view',
    'spotboard.animation',
    'spotboard.notify',
    'spotboard.dashboard',
    'spotboard.award'
],
function(Spotboard, $)  {
    // TODO modularize all exports from 'contest.js'

    Spotboard.Manager = {};

    Spotboard.Manager.displayedContestTime = null;

    String.prototype.endsWith = function(suffix) {
        return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };
    var joinPath = function(base, path) {
        if(base.endsWith('/') && path.charAt(0) == '/')
            return base + path.substr(1);
        else return base + path;
    };

    /**
     * contest를 비동기로 로드한다.
     *
     * @returns $df deferred object
     * Spotboard.contest 를 새로운 contest context로 set한다.
     */
    Spotboard.Manager.loadContest = function() {
        var $df = new $.Deferred();

        var path = joinPath(Spotboard.config['apiBase'], '/contest.json');

        var onError = function(err) {
            if(console) console.log('Unable to fetch ' + path + ' : ' + err);
            Spotboard.View.displaySystemMessage('Failed : ' + err, 'red');
            $df.reject('error');
        };

        $.ajax({
            url : path,
            dataType : 'json',
            success : function(json) {
                try {
                    var contest = Contest.createFromJson(json);
                    Spotboard.contest = contest;
                    return $df.resolve('success');
                }
                catch(e) {
                    if(console) console.log(e.stack);
                    return onError(e.toString());
                }
            },
            error: function(xhr, stat, err) {
                return onError(err);
            },
            timeout : Spotboard.config['fetch_timeout'] || 2000,
        });

        return $df.promise();
    };

    /**
     * run 들을 비동기로 로드한다.
     *
     * @returns $df defered object
     * Spotboard.runfeeder 를 셋한다.
     */
    Spotboard.Manager.loadRuns = function() {
        var $df = new $.Deferred();

        var path = joinPath(Spotboard.config['apiBase'],  '/runs.json');
        $.ajax({
            url : path,
            dataType : 'json',
            success : function(e) {
                Spotboard.$runs = e;
                $df.resolve('success');
            },
            error : function(xhr, stat, err) {
                if(console) console.log('Unable to fetch ' + path + ' : ' + err);
                $df.reject('error');
            }
        });

        return $df.promise();
    };


    /**
     * 하나의 run을 feed해서 진행시키고 (FIFO 런이 될수도 있고, 어워드 모드에서 진행되는 런일수도 있음)
     * 스코어보드를 업데이트하도록 View를 호출한다.
     *
     * @param updateAnimationFactory 팀 업데이트 애니메이션을 생성하는 factory function.
     *  [signature] Run run, Integer remainCount -> Animation
     *
     * @param utuAnimationFactory 런이 맞은 경우 동작할 애니메이션을 생성하는 factory function.
     *  [signature] Team team, Run run -> Animation
     *
     * @return $.Deferred
     */
    Spotboard.Manager.feedSingleRun = function(updateAnimationFactory, utuAnimationFactory) {
        var contest = Spotboard.contest,
            runfeeder = Spotboard.runfeeder;

        var $df = new $.Deferred();

        var fed = runfeeder.feed(1, function(run, remainCount) {
            Spotboard.Manager.displayedContestTime = Spotboard.runfeeder.getContestTime(); // TODO 중복
            $(Spotboard.runfeeder).trigger('change');

            if(updateAnimationFactory === undefined) {
                // default animation : updateRun
                updateAnimationFactory = function(run, remainCount) {
                    return new Spotboard.Animation.UpdateRun(run, {});
                };
            }
            if(utuAnimationFactory === undefined) {
                // default animation: utu
                utuAnimationFactory = function(team, run) {
                    return new Spotboard.Animation.MoveTeamUp(team);
                };
            }

            // 애니메이션을 생성한다.
            var animation = updateAnimationFactory(run, remainCount);

            // 애니메이션에서 팀이 flip
            var fnUpdateTeamRank = function() {
                $("#team-list > .team").each( function() {
                    // TODO 여기 DOM manipulation 안하도록 고쳐야 함
                    var oldRank = $(this).find('.team-rank').text();
                    var newRank = contest.getTeamStatus( $(this).data('team-id') ).getRank();
                    if(oldRank != newRank) {
                        Spotboard.View.updateTeamRank( $(this), newRank);
                    }
                });

                if(!Spotboard.config['award_mode']) { // TODO 조건이 좀 구림..
                    // notify, dashboard 등 updated 이벤트.
                    $(Spotboard).trigger('teamUpdated', [run]);
                }
            };

            animation.addTeamFlippingProgress(fnUpdateTeamRank);

            animation.run()
                .pipe( function(runEvent) {
                    if(runEvent === 'solved') {
                        // 풀었으면 team move up;
                        var upAnimation = utuAnimationFactory(run.getTeam(), run);
                        return upAnimation.run();
                    }
                })
                .pipe( function() {
                    // 애니메이션 끝난 후 동작:
                    Spotboard.View.updateVisibility();
                    return $df.resolve(run);
                });

        });

        if(!fed) $df.resolve('nofeed');    // no more run
        return $df;
    };


    /**
     * 관전자 모드에서의 런 업데이트을 한 step 진행한다.
     */
    Spotboard.Manager.proceedOne = Spotboard.Util.withDeferredLock(
        Spotboard.Manager.feedSingleRun
    );

    /**
     * 현재 DOM에 그려진 스코어보드를 기준으로,
     * 각 팀의 이벤트 (:solved) 핸들러들을 초기화한다.
     */
    Spotboard.Manager.initTeamEventHandlers = function() {
        var contest = Spotboard.contest;

        // TODO
    };

    Spotboard.Manager.feedAll = function() {
        Spotboard.contest.beginRunTransaction();
        Spotboard.runfeeder.feed(10000000);    // feed all run
        Spotboard.contest.commitRunTransaction();

        Spotboard.Manager.displayedContestTime = Spotboard.runfeeder.getContestTime(); // TODO 중복
        $(Spotboard.runfeeder).trigger('change');
        Spotboard.View.refreshScoreboard();    // draw scoreboard from scratch
        Spotboard.Dashboard.drawAllRunNotification(); // draw all run notifications
    };



    Spotboard.Manager.isTeamExcluded = function(team) {
        Spotboard.Manager._isExcluded = Spotboard.Manager._isExcluded || (function() {
            var excludeTeams = Spotboard.config['exclude_teams'] || {};
            if(typeof excludeTeams === 'function')
                return excludeTeams;

            var ret = {};
            for(var i = 0; i < excludeTeams.length; ++ i) {
                ret[excludeTeams[i]] = true;
            }
            return (function(team) {
                var teamid = (typeof team === 'number') ? team : team.getId();
                return ret[teamid];
            });
        })();

        return Spotboard.Manager._isExcluded(team);
    };

    /**
     * 각종 버튼의 이벤트 핸들러들을 바인딩 시킨다.
     */
    Spotboard.Manager.initButtonEventHandlers = function() {

        $("#feed-one-icon").click( function() { Spotboard.Manager.proceedOne(); } );
        $("#feed-all-icon").click( function() { Spotboard.Manager.feedAll(); } );

        $("#notify-icon").click( function() {
            var currentState = Spotboard.Notify.toggleNotification(this);
            if(currentState) $(this).addClass('enabled');
            else $(this).removeClass('enabled');
        });

        $("#events-icon").click( function() {
            Spotboard.Dashboard.toggle(this);
        });

        $("#feed-auto-icon").click( function() {
            var $auto = $(this);
            if ($auto.hasClass('paused')) {
                $auto.removeClass('paused').addClass('playing');
            }
            else {
                $auto.removeClass('playing').addClass('paused');
            }
        });
        if(! Spotboard.config['auto_play'])
            $("#feed-auto-icon").removeClass('playing').addClass('paused');

        $(Spotboard.runfeeder).bind('change', function() {
            var runCount = parseInt( Spotboard.runfeeder.getRunCount() );
            $("#update-icon").badger(runCount || '');

            var contestTime = Spotboard.Manager.displayedContestTime;
            $("#time-elapsed").text(
                Spotboard.Util.toTimeDisplayString(contestTime)
            );

            // NMU
            if(Spotboard.runfeeder.isNoMoreUpdate()) {
                $("#contest-title").addClass('no-more-update');
            } else {
                $("#contest-title").removeClass('no-more-update');
            }
        });

        $("#update-icon").click( function() {
            var $icon = $(this);
            if( $icon.hasClass('updating') ) return;
            $icon.addClass('updating');

            var runfeeder = Spotboard.runfeeder,
                contest = Spotboard.contest;
            var is_autodiff = Spotboard.config['auto_rundiff'];
            var path = joinPath(Spotboard.config['apiBase'],
                         is_autodiff ?  '/runs.json' : '/changed_runs.json'
                        );
            $.ajax({
                url : path + '?from=' + runfeeder.getLastTimeStamp(),
                dataType : 'json',
                success : function(data) {
                    var fn = runfeeder.fetchRunsFromJson;
                    if(is_autodiff) fn = runfeeder.diffAndFeedRuns;

                    fn.call(runfeeder, data, function filter(r) {
                        // 이미 맞은 문제는 run 피드하지 않음
                        if(contest.getTeamStatus(r.getTeam()).getProblemStatus(r.getProblem()).isAccepted())
                            return false;
                        // 제외되는 팀의 런은 피드하지 않음
                        if(Spotboard.Manager.isTeamExcluded(r.getTeam()))
                            return false;
                        return true;
                    });

                    // update timer
//                    Spotboard.Manager.displayedContestTime = runfeeder.getContestTime();
                    $(runfeeder).trigger('change');
                },
                timeout : Spotboard.config['fetch_timeout'] || 2000,
                error : function(xhr, stat, err) {
                    if(console) console.log('Unable to fetch ' + path + ' : ' + err);
                },
                complete : function() {
                    setTimeout( function() { $icon.removeClass('updating'); }, 100 );
                }
            });
        });

        // pagination
        $("#page-nav #page-left").click(function() {
            if($(this).hasClass('disabled')) return;
            Spotboard.View.paginate(-1);
        });
        $("#page-nav #page-right").click(function() {
            if($(this).hasClass('disabled')) return;
            Spotboard.View.paginate(+1);
        });
    };

    /**
     * 검색 필드에 대한 이벤트 핸들러를 바인딩한다.
     */
    Spotboard.Manager.initSearchEventHandlers = function() {
        $('#search-input').on('input', function() {
            clearTimeout($(this).data('timeout'));
            $(this).data('timeout', setTimeout(function() {
                // 검색 필터 설정 (100ms 반응 딜레이)
                var query = $(this).val();
                console.log(query);
                Spotboard.View.setSearchFilter(query);
            }.bind(this), 100));
        });

        // 초기 쿼리
        if(config['search_query']) {
            $('#search-input')
                .val(config['search_query'])
                .trigger('input');
        }
    };

    Spotboard.Manager.initWebsocketEventListener = function() {
        if(typeof WebSocket === 'undefined') return;

        // websocket을 이용하여 feedServer의 이벤트 발생 여부를 감지함
        try {
            var wsPath = Spotboard.config['path']['events_ws']
                .replace('http://', 'ws://')
                .replace('https://', 'wss://');
            var ws = Spotboard.Manager._ws = new WebSocket(wsPath);
            ws.onopen = function() {
                console.log('websocket connected');
            };
            ws.onclose = function() {
                console.log('websocket closed');
            }
            ws.onmessage = function() {
                setTimeout( function() {
                    // TODO 이거 고상한 이벤트 핸들러로 좀 고쳐야 할듯.
                    $("#update-icon").trigger('click');
                }, 0);
            }
        }
        catch(e) {
            console.log('websocket connect error : ' + e.toString());
        }
    }

    Spotboard.Manager.initUpdateTimer = function() {

        // ajax 호출할 간격 (기본 10초)
        var $icon = $("#update-icon");

        function renew_timer() {
            var old_timer = $icon.data('timer');
            if(old_timer) window.clearInterval(old_timer);

            var refreshInterval = parseInt(Spotboard.config['auto_refresh_interval']) || 10000;
            var new_timer = window.setInterval( function() {
                $icon.trigger('click', ['auto']);
            }, refreshInterval);
            $icon.data('timer', new_timer);
        }

        // 하나의 클릭 이벤트 핸들러를 더 추가하여
        // timer 호출 간격을 10초 뒤로 밀어낸다.
        $icon.click(function(e, auto) {
            if(auto === 'auto') return;

            // 손으로 누를때만 실행되도록(?)
            renew_timer();
        });

        renew_timer();
    };

    // 자동 재생 (하나씩 런을 까는..)
    Spotboard.Manager.initAutoPlayTimer = function() {
        var interval = Spotboard.config['auto_play_delay'] || 1000;
        window.setInterval( function() {
            if( $("#feed-auto-icon").hasClass('playing') )
                Spotboard.Manager.proceedOne();
        }, interval);
    };


    /**
     * 최초 런 피딩
     */
    Spotboard.Manager.feedInitialRuns = function() {
        var runfeeder = new RunFeeder(Spotboard.contest, new FIFORunFeedingStrategy());
        Spotboard.runfeeder = runfeeder;

        if(!Spotboard.$runs) throw new Error('run is not loaded');
        runfeeder.fetchRunsFromJson(Spotboard.$runs, function runfilter(r) {
            // 제외되는 팀의 런은 피드하지 않음
            if(Spotboard.Manager.isTeamExcluded(r.getTeam()))
                return false;
            return true;
        });

        Spotboard.Manager.displayedContestTime = Spotboard.runfeeder.getContestTime(); // TODO 중복

        // 최초 개수만큼 피딩
        var fed = 0;
        var initial_runid = config['initial_runid'];
        var initial_time = config['initial_time'];

        var crit = function() { return true; } // feed all
        if(initial_runid !== undefined) {
            // maximum run Id
            crit = function(run) { return run.getId() <= initial_runid; };
        }
        else if(initial_time !== undefined) {
            // contest time (in minutes)
            initial_time = parseInt(initial_time) || 0;
            crit = function(run) { return run.getTime() <= initial_time };

            // override timer (see 'change' bind function)
            Spotboard.Manager.displayedContestTime = initial_time * 60;
        }

        Spotboard.contest.beginRunTransaction();
        runfeeder.feedWhile(crit);
        Spotboard.contest.commitRunTransaction();
    };

    /**
     * contest, runs가 set된 이후, 기본적인 초기화 작업들을 수행한다.
     */
    Spotboard.Manager.initContest = function() {
        if(!Spotboard.contest) return;

        var onError = function(err) {
            Spotboard.View.displaySystemMessage('Failed : ' + err, 'red');
            return false;
        };

        try {
            // 최초 런 feeding
            Spotboard.Manager.feedInitialRuns();

            // 기본 세팅
            Spotboard.View.displayContestInformation();
            Spotboard.View.initStyles();
        }
        catch(e) {
            if(console) console.log(e.stack);
            return onError(e);
        }

        $(Spotboard).bind('ready', function() {
            Spotboard.View.drawScoreboard();
            Spotboard.Dashboard.drawAllRunNotification(); // draw all run notifications
            $(Spotboard.runfeeder).trigger('change');
        });

        // 어워드 모드
        if(Spotboard.config['award_mode'] == true) {
            Spotboard.Award.initAwardMode();
        }
        // 대회 중 관전자 모드
        else {
            // 자동 업데이트 및 자동 플레이를 활성화시킴.
            Spotboard.Manager.initUpdateTimer();
            Spotboard.Manager.initAutoPlayTimer();
            Spotboard.Manager.initTeamEventHandlers();
            Spotboard.Manager.initButtonEventHandlers();
            Spotboard.Manager.initSearchEventHandlers();
            Spotboard.Manager.initWebsocketEventListener();

            // ready contest.
            $(Spotboard).trigger('ready');
        }
    };

    return Spotboard.Manager;

});
