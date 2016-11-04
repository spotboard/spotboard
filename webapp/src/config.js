/**
 * Contest Configuration
 */

feed_server_path = './sample/';

config =
{
    // environment: 'production' or 'develop'
    environment : 'develop',

    /**
     * The paths ${apiBase}/runs.json, ${apiBase}/contest.json, etc. should be accessible.
     */
    apiBase : feed_server_path,

    /**
     * Specify additional paths to WebSocket event notifier or award information.
     */
    path : {
        'events_ws' : (feed_server_path + 'events')
            .replace('http://', 'ws://')
            .replace('https://', 'wss://'),
        'award_slide.json' :'./sample/award_slide.json'
    },

    /**
     * Specify whether to use automatically diff and feed updated runs.
     *
     * If set to false, updated runs are fetched from ${apiBase}/changed_runs.json;
     * If set to true,  fetch all runs from ${apiBase}/runs.json instead and
     *  only the updated runs would be inserted into the feed queue.
     */
    auto_rundiff       : true,

    /**
     * Specify timeout (in milliseconds) for ajax request.
     */
    fetch_timeout      : 5000,

    /**
     * Specify whether to show team group (affiliation) just below team name.
     */
    show_team_group    : true,

    /**
     * Specify whether to automatically start the scoreboard update.
     * If false, update will be paused.
     */
    auto_play          : true,

    /** Specify whether to show the event dashboard in the right-side. */
    show_events        : false,

    /** Specify the maximum number of recent events displayed in the dashboard. */
    max_notifications  : 100,

    /**
     * Specify whether to use (flip) animation on updating team's run.
     * If animation is disabled, scoreboard will be updated with silence.
     *
     * This option is ignored (always set true) in the award mode.
     */
    animation          : false,

    /** The delay time (in milliseconds) to between two consecutive run feeding. */
    auto_play_delay    : 100,

    /**
     * The interval time (in milliseconds) of fetching run updates
     * (where instant-feeding with WebSocket is not used)
     */
    auto_refresh_interval : 10000,


    /** Specify whether to use pagination, or the number of teams per page. */
    pagination      : false,
    pagination_size : 50,

    /** If true, the followed team will be sticked before it goes out of the screen. */
    use_followed_team_sticky : true,

    /**
     * Specify the teams to exclude from the scoreboard, as a function or a list of team id.
     *
     * e.g. function() { ... }
     * e.g. [1000, 1001, 1002]
     */
    exclude_teams : function(team) {
        if( [1000, 1001, 1002].indexOf(team.getId()) >= 0 )
            return true;
        return false;
    },

    /**
     * Specify whether to launch award mode at startup.
     * NOTE: While this option is off, one can enter to award mode by adding '?award=true' into URL.
     */
    award_mode         : false,

    /** Specify whether to hide the name and affilation for unrevealed team in award mode. */
    award_hide_name    : true,

    /**
     * For the purpose of simulating award ceremony with ease,
     * one can start the award mode from the rank number specified to begin with.
     * If unspecified (null or undefined), the award mode will start from the bottommost team.
     *
     * NOTE: This setting can be also configured by adding '?award_rank_begin=1' into URL.
     */
    award_rank_begin   : null,

    /**
     * Override the speed of flip and elevation animations in the award mode,
     * according to the number of problems solved.
     */
    award_animation_speeds: [
      { solved: 7, fastFlipSpeed: 600, slowFlipSpeed: 1400, utuSpeedFunc: function(up_cnt) { return Math.min(500 + up_cnt * 100, 2000); } },
      { solved: 3, fastFlipSpeed: 350, slowFlipSpeed: 650,  utuSpeedFunc: function(up_cnt) { return Math.min(250 + up_cnt * 50, 3000); } },
      { solved: 0, fastFlipSpeed: 250, slowFlipSpeed: 450,  utuSpeedFunc: function(up_cnt) { return Math.min(150 + up_cnt * 30, 1000); } }
    ],

    /**
     * Specify the order of problems revealed in the award mode.
     * Each element in the list should be the problem title (e.g. 'A', 'B') or problem id (e.g. 0, 1).
     *
     * The problems not specified in the list will follow the specified ones,
     * in the alphabetical order.
     *
     * e.g. ['C', 'A', 'F']  : Reveals in order 'C', 'A', 'F', 'B', 'D', 'E', 'G', ...
     */
    award_reveal_order : [],

    /**
     * Specify whether to use blinking effect before revealing a focused pending run.
     * This value can be a boolean (True or False),
     * or a function to specify trigger conditions dynamically.
     * In this case, function takes a single argument 'teamStatus', of type TeamStatus.
     */
    award_focus_blinking : function(teamStatus) {
      // use blinking effect only if # of problems solved is more than 7.
      var solved = teamStatus.getTotalSolved();
      return solved >= 7;
    },

    /**
     * Specify additional foreign or extra teams, as a list of team id.
     *
     * In award ceremony, revealing of foreign teams will be postponed until
     * all the other domestic teams are revealed.
     */
    foreign_teams : [ 2000, 2001 ]
};
