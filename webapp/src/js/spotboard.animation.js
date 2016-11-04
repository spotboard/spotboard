define([
    'jquery',
    'spotboard',

    'spotboard.util',
    'spotboard.view'
],
function($, Spotboard) {

    Spotboard.Animation = {};

    // returns whether use animation or not. (true / false)
    var isUsingAnimation = function() {
        return (Spotboard.config['animation'] == true);
    };

    Spotboard.Animation.Focus = {
        on: function($team, options) {
            var $df = new $.Deferred();
            options = options || {};

            var useAnimation;
            if(options['useAnimation'] !== undefined) useAnimation = options['useAnimation'];
            else useAnimation = isUsingAnimation();

            if(Spotboard.Animation.Focus.has($team)) {
                // 이미 포커스가 있을 때 처리
                return $df.resolve('focused');
            }

            var fnComplete = function() {
                setTimeout(function(){ $df.resolve(); }, options.delay || 0);
            };

            // sticky 되어 있으면 푼다.
            $team.removeClass('sticky-top sticky-bottom');

            if(useAnimation && $team.is(':visible')) {
                $('html, body').animate({
                    scrollTop : $team.offset().top - window.innerHeight * 0.5
                }, {
                    duration: 300,
                    complete : fnComplete
                });
                $team.addClass('target');
            } else {
                //fnComplete();
                $df.resolve();
            }
            return $df.promise();
        },
        off: function($team) {
            if(!$team) $('.team.target').removeClass('target');
            else $team.removeClass('target');
        },
        has: function($team) {
            return $team.hasClass('target');
        }
    };

    /* 하나의 런을 변경하는 애니메이션 클래스 */
    Spotboard.Animation.UpdateRun = (function() {

        function RunUpdateAnimation(run, options) {
            this.targetRun = run;
            this.problemId = run.getProblem().getId();
            this.teamId = run.getTeam().getId();
            this.teamStat = Spotboard.contest.getTeamStatus(this.teamId);
            this.problemStat = this.teamStat.getProblemStatus(this.problemId);

            this.$team = $("#team-" + run.getTeam().getId());
            this.$box = this.$team.find(".problem-result.problem-" + this.problemId);

            this.flipAnimationEnabled = isUsingAnimation();

            options = options || {};
            this.setFlipSpeed(options.flipSpeed);
            this.setFocusDelay(options.focusDelay);
            this.setFlipAnimationEnabled(options.flipAnimationEnabled);

            this.teamFlippingProgressCallback = [];
        }
        $.extend(RunUpdateAnimation.prototype, {

            // flipping delay. TODO 일반적인 값을 지원하도록 바꿔야함
            setFlipSpeed : function(flipSpeed) {
                this.flipSpeed = flipSpeed || 700;
            },

            // 포커스 잡고 딜레이 몇 ms?
            setFocusDelay : function(focusDelay) {
                this.focusDelay = focusDelay || 200;
            },

            setFlipAnimationEnabled : function(flipAnimationEnabled) {
                if(flipAnimationEnabled === undefined)
                    flipAnimationEnabled = isUsingAnimation();
                this.flipAnimationEnabled = flipAnimationEnabled;
            },

            flip : function($el) {
                var $df = new $.Deferred();
                var flipSpeed = this.flipSpeed;
                if($el === undefined) $el = this.$box;

                var state = 1;
                var animationEventHandler = function(e) {
                    if(e) e.stopPropagation();

                    // step 1. (before)
                    if(state == 1) {
                        ++state;
                        $el
                            .addClass('flip-before');
                    }
                    // step 2. (med)
                    else if(state == 2) {
                        ++state;
                        $df.notify('flipped');
                        $el
                            .removeClass('flip-before').addClass('flip-after');
                    }
                    // step 3. (done)
                    else if(state == 3) {
                        ++state;
                        $el
                            .removeClass('flip-after')
                            .css('-webkit-animation-duration', '')
                            .unbind('webkitAnimationEnd');
                        $df.resolve('done');
                    }
                    else throw 'illegal state';
                };

                // 애니메이션이 비활성화된 상태(옵션 혹은 어워드 빨리감기)이거나,
                // 페이지나 검색조건 등으로 인해서 안 보이는 상태이면,
                // 애니메이션을 발생시키지 않고 바로 resolve 한다.
                // TODO 애내메이션이 실행되고 있는데 안보이게 되면 $df가 절대 끝나지 않음
                if(!this.flipAnimationEnabled || !$el.is(':visible')) {
                    // 주의 : 이 때 step phase 2를 생략하므로 $df.notify가 발생 안할 수 있다.
                    // .progress()로 notify 받으면 실행하는 '업데이트' 연산이 있을 수 있는데
                    // 이거 실행 안되면 스코어보드가 전체적으로 꼬이므로 주의해줘야 한다.
                    //
                    // 일단은 시작 전이니까 바로 resolve 할거므로 flipped 도 처리
                    return $df.notify('flipped').resolve('skip-animation');
                }

                $el
                    .bind('webkitAnimationEnd', animationEventHandler)    // much faster than setTimeout
                    .css('-webkit-animation-duration', flipSpeed + 'ms')
                    ;
                animationEventHandler.call($el);

                // 웹킷 계열이 아닌 브라우저에서는 애니메이션이 동작하지 않아
                // $df 가 끝나지 않으므로, workaround로 setTimeout을 걸어 이벤트를 트리거
                var isWebkit = 'webkitRequestAnimationFrame' in window;
                if(! isWebkit) {
                    setTimeout( function() { $el.trigger('webkitAnimationEnd'); }, flipSpeed );
                    setTimeout( function() { $el.trigger('webkitAnimationEnd'); }, flipSpeed * 2);
                }

                // HACK : 페이지 이동이나 검색조건 변화 등으로 DOM이 사라지면,
                // webkit animation end 이벤트가 발생하지 않아 $df가 끝나지 않는다 (멈춤).
                /*
                setTimeout( function() {
                    if($df.state() === 'pending') {
                        console.log(['Timeout (reject) : ', $df]);
                        $df.resolve('timeout');
                    }
                }, flipSpeed * 2.5);
                */

                return $df.promise();
            },

            addTeamFlippingProgress : function(fn) {
                this.teamFlippingProgressCallback.push(fn);
                return this;
            },

            /** @returns deffered */
            transformResult : function() {

                if(this.problemStat.isAccepted())        this.runEvent = 'solved';
                else if(this.problemStat.isPending())    this.runEvent = 'pending';
                else if(this.problemStat.isFailed())    this.runEvent = 'failed';

                // flip 하면서 색깔 클래스 바꾸고 내용 업데이트함
                return this.flip()
                    .progress( function() {

                        // update text and color
                        if(this.problemStat.getFailedAttempts() > 0) {
                            this.$box.find('.problem-result-text')
                                .text("-" + this.problemStat.getFailedAttempts());
                        }
                        this.$box.removeClass('solved pending failed').addClass(this.runEvent);
                    }.bind(this));
            },

            run: function() {
                var $df = Spotboard.Animation.Focus.on(this.$team, {'focusDelay' : this.focusDelay, 'useAnimation' : this.flipAnimationEnabled})
                    .pipe( function() {
                        // 포커스가 끝나면 문제 상태 변화를 시작한다.
                        return this.transformResult();
                    }.bind(this))
                    .pipe( function() {
                        // 문제 상태 변화를 끝내고 나서, 팀 상태 업데이트
                        var $team = this.$team;

                        var task = function() {
                            Spotboard.View.updateTeamStatus($team);
                            $.each(this.teamFlippingProgressCallback, function(idx, fn) {
                                fn.apply(this);
                            });
                        }.bind(this);


                        if(this.runEvent === 'solved') {
                            // 맞았으면, 팀을 다시 flip 하고 업데이트 함
                            this.setFlipSpeed(700);
                            return this.flip($team).progress(task);
                        }
                        else {
                            // 틀렸으면 flip하지 않고 그냥 업데이트만 함
                            task();
                            return null;
                        }

                    }.bind(this))
                    .pipe( function() {
                        Spotboard.Animation.Focus.off(this.$team);
                        return new $.Deferred().resolve(this.runEvent);
                    }.bind(this));

                return $df;
            }
        });

        return RunUpdateAnimation;
    })();


    /* 팀을 UTU 하는 에니메이션 */
    Spotboard.Animation.MoveTeamUp = (function() {

        var teamHeight = 2; // TODO from scoreboard:css div.team[height]

        function TeamMoveUpdateAnimation(team, speedFunc, usingAnimation) {
            this.team = team;
            this.teamStatus = Spotboard.contest.getTeamStatus( team.getId() );
            this.usingAnimation = usingAnimation !== undefined ? usingAnimation : isUsingAnimation();
            this.speedFunc = speedFunc || function(cnt) {
                return Math.min(300 + (cnt - 1) * 50, 5000);
            };

            this.animationEnabled = isUsingAnimation();
        }

        $.extend(TeamMoveUpdateAnimation.prototype, {

            setAnimationEnabled : function(enabled) {
                if(enabled === undefined) enabled = true;
                this.animationEnabled = enabled;
            },

            run : function() {
                var $teams = $('#team-list > .team');
                var $team = $('#team-' + this.team.getId());
                Spotboard.Animation.Focus.on($team, {'useAnimation' : this.animationEnabled});

                var $df = new $.Deferred();
                $df.always(function() {
                    Spotboard.View.updateSolvedCountVisibility();
                    Spotboard.Animation.Focus.off($team);
                });

                var old_index = $teams.index( $team );
                var new_index = this.teamStatus.getRank() - 1;

                // climb_count : DOM 상으로 올라가야 하는 개수
                var climb_count = old_index - new_index;
                // visible_climb_count : '보여지는' 팀 DOM 기준으로 올라가야 하는 개수 (애니메이션용)
                var visible_climb_count = (function() {
                    // dependent on $teams, old_index, new_index
                    // 페이지/필터 등으로 인해 일부 팀들이 is(':visible') = false 일 수 있음을 감안한다.
                    // 밀리는 팀들 : { team $t | new_index <= $t.idx < old_index }
                    var c = 0;
                    $teams.each(function(idx, t) {
                        if(new_index <= idx && idx < old_index) {
//                            if($(t).is(':visible')) c++;
                            // .hidden 클래스가 없으면서도 display: none 일 수 있는데..
                            // :visible 셀렉터가 너무 느려서 이런 게 없다고 가정(약속)하고 ㄱㄱ
                            if(! $(t).hasClass('hidden')) c++;
                        }
                    }); // TODO 음 이 루프 약간 비효율적인것 같은데..
                    return c;

                })();
                var global_index = $team.index();

                // 에니메이션으로 위로 끌어올림
                var last_idx = -1;
                var swap_against = null;
                var animation_canceled = false;

                var onComplete = function() {
                    setTimeout( function() {
                        $df.resolve('done');
                    }, 200);
                };
                if(old_index == new_index)  {
                    // 올라갈 곳이 없으면 마무리 짓고 리턴
                    onComplete();
                    return $df;
                }

                var adjustTeamDomPosition = function() {
                    $team.detach();
                    $teams.css('top', '');
                    $teams.eq(global_index - climb_count).before($team);
                    $(Spotboard).trigger('teamPositionUpdated');
                };

                // no animation - 그냥 DOM 위치만 바꿈
                if(!this.animationEnabled || !$team.is(':visible')) {
                    adjustTeamDomPosition();
                    return $df.resolve('no-animation');
                }


                // 애니메이션이 실행될 시간 (climb_count에 따라 다름)
                var duration = this.speedFunc(visible_climb_count);
                $team.delay(200).animate( { top : '-' + (teamHeight * visible_climb_count) + 'em' }, {
                    duration: duration,
                    step : function(now, fx) {
                        var idx = global_index - 1 - Math.floor(-now / teamHeight);
                        if (last_idx != idx) {
                            for (var i = last_idx; i > idx; -- i) {
                                $teams.eq(i).css('top', teamHeight + 'em');
                            }
                            last_idx = idx;
                            swap_against = $teams.eq(idx);
                        }
                        var mod = (-now) % teamHeight;
                        if(swap_against) swap_against.css('top', mod + 'em');

                        // 팀이 화면 밖으로 넘어가면, 스탑
                        if(!animation_canceled && ($team.position().top + $team.height()) < window.scrollY) {
                            animation_canceled = true;
                            setTimeout( function() {
                                $team.stop(false, true);
                            }, 0);
                        }
                    },
                    complete : function() {
                        // DOM 위치를 껴넣음
                        adjustTeamDomPosition();

                        // 약 0.2초의 딜레이를 주고 마무리
                        onComplete();
                    }

                });

                return $df.promise();
            }
        });

        return TeamMoveUpdateAnimation;

    })();

    return Spotboard.Animation;
});
