# Algospot SpotBoard
#
# contest.coffee
#
# @author Jongwook Choi <wookayin@gmail.com>
#

# a stopgap for node.js
$ = (this.$) || require 'jquery'
if typeof window == 'undefined'
    $.extend = require 'extend'

#####################
# Helper Functions
#####################

class AssertionError extends Error
    constructor : (@message, @cause) ->
        Error.captureStackTrace(@,@)

class IllegalArgumentError extends Error
    constructor : (@message, @cause) ->
        Error.captureStackTrace(@,@)

class NotImplementedError extends Error
    constructor : (@message, @cause) ->
        Error.captureStackTrace(@,@)

class DataLoadError extends Error
    constructor : (@message, @cause) ->
        Error.captureStackTrace(@,@)

assert = (expr, message = "Assertion Failed") ->
    throw new AssertionError(message) if (not expr)

assertNotNull = (expr, message = "Missing Argument") ->
    throw new IllegalArgumentError(message) if (not expr)
    return expr

getObjectClassName = (obj) ->
    return null if obj is null
    return null if (typeof obj) isnt "object"
    return /(\w+)\(/.exec(obj.constructor.toString())[1]

deepClone = (obj) -> $.extend(true, {}, {ref : obj}).ref
shallowClone = (obj) -> $.extend({}, {ref : obj}).ref

isNaN = (x) ->
    return (x isnt x)

stableSort = (arr, comparator) ->
    for idx, item of arr
        item.__stable__idx__ = idx
    arr.sort( (x, y) ->
        v = comparator(x, y)
        if v is 0
            return x.__stable__idx__ - y.__stable__idx__
        else return v)
    for item of arr
        delete item.__stable__idx__
    return arr


#####################
# Classes
#####################

class Problem
    constructor: (@contest, @id, @name, @title, @color) ->
        if not @name then @name = @title.charAt(0)

    # methods
    getContest : -> @contest
    getId : -> @id
    getName : -> @name
    getTitle : -> @title
    getColor : -> @color

    toString : ->
        s = "Problem #{@name}"
        if @title and @title != @name
            s += " : #{@title}"
        return s


class Team
    constructor : (@contest, @id, @name, @group = null) ->
        # try to get group from parsing..
        if not (group?)
            regx = /^([^(]+)\(([^)]*)\)$/.exec(@name)
            try
                [@name, @group] = [regx[1].trim(), regx[2].trim()] if regx
            catch ex
                @group = null


    # method
    getContest : -> @contest
    getId : -> @id
    getName : -> @name
    getGroup : (nullAsEmpty = false) ->
        return "" if nullAsEmpty and @group is null
        return     @group


class TeamStatus
    constructor : (@contest, @team) ->
        @solved = 0                    # cached field
        @penalty = 0                   # cached field
        @lastSolvedTime = 0            # cached field
        @rank = 1
        @problemStatuses = {}

        @cache = {}

    getContest : -> @contest
    getTeam : -> @team
    getRank : -> @rank

    getProblemStatus : (problem) ->
        problem = @contest.getProblem(problem)
        problemStatus = @problemStatuses[problem.getId()]
        if not problemStatus?
            problemStatus = @problemStatuses[problem.getId()] = new TeamProblemStatus(@contest, this, problem)
        return problemStatus

    getTotalAttempts : ->
        return @cache.totalAttempts ? @cache.totalAttempts = do =>
            s = 0
            s += ps.getAttempts() for pid, ps of @problemStatus
            return s

    getTotalSolved : ->
        return @cache.totalSolved ? @cache.totalSolved = do =>
            s = 0
            s++ for pid, ps of @problemStatuses when ps.isAccepted()
            return s

    getPenalty : ->
        return @cache.penalty ? @cache.penalty = do =>
            s = 0
            for pid, ps of @problemStatuses
                s += ps.getContributingPenalty()
            return s

    getLastSolvedTime : ->
        return @cache.lastSolvedTime ? @cache.lastSolvedTime = do =>
            s = 0
            for pid, ps of @problemStatuses
                t = ps.getSolvedTime()
                if t? and t > s then s = t
            return s

    hasSolved : (problem) ->
        problem = @contest.getProblem(problem)
        throw new NotImplementedError

    # updator
    update : (run) ->
        assert (run.getTeam() == this.getTeam()), 'invalid run update'

        # add fully new fresh run
        ps = this.getProblemStatus(run.getProblem())

        # update invalidate cache
        ps.update(run)
        @cache = {}


class TeamProblemStatus
    constructor : (@contest, @teamStatus, @problem) ->
        @runs = []        # must maintained sorted by run id
        @netruns = null    # ignore all runs after the first Yes

        @cache = {}

    getAllRuns : ->    @runs

    getContest : -> @contest
    getTeamStatus : -> @teamStatus
    getProblem : -> @problem

    # methods
    isAttempted : ->
        return @runs.length > 0

    getNetRuns : ->
        return @netruns ? @netruns = do =>
            netr = []
            # assume that @runs is sorted in an order of increasing id
            for run in @runs
                netr.push(run)
                if run.isJudgedYes() then break
            return netr

    getNetLastRun : ->
        netr = this.getNetRuns()
        return null if netr.length is 0
        return netr[netr.length - 1]

    getAttempts : ->    # net result (ignore runs after the first yes)
        return @cache.attempts ? @cache.attempts = do =>
            return this.getNetRuns().length

    getNotAcceptedAttempts : ->        # net result
        return @cache.notacceptedAttempts ? @cache.notacceptedAttempts = do =>
            attempts = this.getNetRuns().length
            if this.isAccepted() then attempts -= 1
            return attempts

    getFailedAttempts : ->
        return @cache.failedAttempts ? @cache.failedAttempts = do =>
            attempts = 0
            for run in this.getNetRuns()
                if run.isFailed() then attempts += 1
            return attempts


    isAccepted : ->        # net result
        return @cache.accepted ? @cache.accepted = do =>
            return this.getNetLastRun()?.isJudgedYes() ? false

    isFailed : ->        # net result
        return @cache.failed ? @cache.failed = do =>
            netr = this.getNetRuns()
            return this.getNetLastRun()?.isFailed() ? false

    isPending : ->         # net result; consider : pending, pending, pending => accepted, pending, pending
        return @cache.pending ? @cache.pending = do =>
            netr = this.getNetRuns()
            return this.getNetLastRun()?.isPending() ? false

    getContributingPenalty : ->
        return @cache.penalty ? @cache.penalty = do =>
            if this.isAccepted()
                return (this.getFailedAttempts()) * 20 + this.getSolvedTime()
            else return 0

    getPenaltyMemoString : ->
        return @cache.penaltyMemo ? @cache.penaltyMemo = do =>
            if this.isAccepted()
                if this.getFailedAttempts() == 0
                    return "#{this.getSolvedTime()}"
                else
                    return "#{this.getSolvedTime()} + 20 * #{this.getFailedAttempts()} = #{this.getContributingPenalty()}"
            else return ''

    getSolvedTime : ->
        return @cache.solvedTime ? @cache.solvedTime = do =>
            run = this.getNetLastRun()
            return if run? and run.isJudgedYes() then run.getTime() else null

    getSolvedRun : ->
        return @cache.solvedRun ? @cache.solvedRun = do =>
            run = this.getNetLastRun()
            return if run? and run.isJudgedYes() then run else null

    # updator
    update : (run) ->
        assert (run.getProblem() == this.getProblem())
        assert (run.getContest() == this.getContest())

        # add run or update run
        found = false
        for idx, oldrun of @runs
            if oldrun.getId() == run.getId()    # update
                @runs[idx] = run
                found = true
                break
        @runs.push(run) if not found

        @runs.sort( (r1, r2) -> r1.getId() - r2.getId() )

        # invalidate cache
        @netruns = null
        @cache = {}

class ProblemSummary
    constructor : (@contest, @problem) ->
        @runs = []
        @cache = {}

    getContest : -> @contest
    getProblem : -> @problem

    update : (run) ->
        assert (run.getProblem() == this.getProblem()), 'invalid run update'

        # push run
        # TODO : is run ignored ?????????
        @runs.push(run)

        # invalidate cache
        @cache = {}

    getAttempts : ->
        return @cache.attempts ? @cache.attempts = do =>
            return @runs.length

    getAccepted : ->
        return @cache.accepted ? @cache.accepted = do =>
            r = 0
            for rid, run of @runs
                r += 1 if run.isAccepted()
            return r

    getFailed : ->
        return @cache.failed ? @cache.failed = do =>
            r = 0
            for rid, run of @runs
                r += 1 if run.isFailed()
            return r

    getPending : ->
        return @cache.pending ? @cache.pending = do =>
            r = 0
            for rid, run of @runs
                r += 1 if run.isPending()
            return r

    getFirstSolvedTime : ->
        return @cache.firstSolvedTime ? @cache.firstSolvedTime = do =>
            first_time = 9999999
            for rid, run of @runs
                if run.isAccepted()
                    first_time = Math.min(first_time, run.getTime())
            return first_time

    isFirstSolved : (problemStatus) ->
        throw new Error('#isFirstSolved : should be TeamProblemStatus') unless (problemStatus instanceof TeamProblemStatus)
        return problemStatus.getSolvedTime() == @getFirstSolvedTime()


class Run
    # context : contest
    # if context == null, this Run is not yet reflected
    constructor : (@contest, @id, @problem, @team, @time, @result) ->
        assert @contest == @problem.getContest() if @contest?
        assert @contest == @team.getContest() if @contest?

    clone : ->
        return new Run(@contest, @id, @problem, @team, @time, @result)

    # methods
    getContest : -> @contest
    getId : -> @id
    getProblem : -> @problem
    getTeam : -> @team
    getTime : -> @time
    getStatus : -> @status
    getResult : -> @result

    isJudgedYes : ->
        @result.substr(0, 3) is "Yes"
    isAccepted : ->
        this.isJudgedYes()
    isPending : ->
        @result is "" or @result.substr(0, 7) is "Pending"
    isFailed : ->
        @result isnt "" and not this.isJudgedYes()

    # update methods
    setStatus : (newStatus) ->
        changed = (@status == newStatus)
        @status = newStatus



class Contest
    constructor : (@contestTitle, @systemName, @systemVersion, problems=[], teams=[]) ->
        throw Error("contestTitle must be a string")    unless typeof(@contestTitle) is 'string'
        throw Error("systemName must be a string")      unless typeof(@systemName) is 'string'
        throw Error("systemVersion must be a string")   unless typeof(@systemVersion) is 'string'

        @problems = []
        for p in problems
            pid = parseInt(p.id)
            continue if typeof pid == 'undefined'
            @problems.push( new Problem(this, pid, p.name, p.title, p.color) )
        @teams = []
        for t in teams
            tid = parseInt(t.id)
            @teams[tid] = new Team(this, tid, t.name, t.group)


    @createFromJson : (contest) ->
        contestTitle = contest['title'] || 'ACM-ICPC Contest'
        systemName = contest['systemName'] || ''
        systemVersion = contest['systemVersion'] || ''

        # build problems, teams : list of class instances
        problems = assertNotNull( contest['problems'] )
        teams = assertNotNull( contest['teams'] )

        theContest = new Contest(contestTitle, systemName, systemVersion, problems, teams)
        theContest.initialize()
        return theContest


    initialize: () ->
        # initialize teamStatus, problemStatus
        @teamStatuses = []
        for tid, team of @teams
            @teamStatuses[team.getId()] = new TeamStatus(this, team)

        @rankedTeamStatuses = null

        @problemSummarys = []
        for problem in @problems
            @problemSummarys[problem.getId()] = new ProblemSummary(this, problem)

        # some metadatas to boost up operations
        @runsIndexed = {}
        @underRunTransaction = false

        return this

    # methods
    getContestTitle : -> @contestTitle
    getSystemName : -> @systemName
    getSystemVersion : -> @systemVersion

    getProblems : -> @problems
    getTeams : -> @teams

    getProblem : (p) ->
        return p if (p instanceof Problem)
        if typeof p in ["number", "string"]
            pid = parseInt(p)
            for prob in @problems
                return prob if prob.id == pid
        throw new Error('#getProblem : illegal argument `p`')

    getTeam : (t) ->
        return t if (t instanceof Team)
        if typeof t in ["number", "string"]
            t = parseInt(t)
            return @teams[t] if not isNaN(t)
        else if typeof t.id in ["number", "string"]
            t = parseInt(t.id)
            return @teams[t] if not isNaN(t)
        throw new Error('#getTeam : illegal argument `t`')

    getTeamStatus : (team) ->
        team = this.getTeam(team)
        throw new Error('#getTeamStatus : illegal argument `team`') unless (team instanceof Team)
        return @teamStatuses[team.getId()]

    getRankedTeamStatusList : ->
        do @updateTeamStatusesAndRanks
        return @rankedTeamStatuses

    getProblemSummary: (problem) ->
        problem = this.getProblem(problem)
        throw new Error('#getProblemSummary : illegal argument `problem`') unless (problem instanceof Problem)
        return @problemSummarys[problem.getId()]

    getRuns : () ->
        return @runsIndexed


    # updators
    updateTeamStatusesAndRanks : ->
        rts = (ts for tid, ts of shallowClone(@teamStatuses))
        teamComparator = (t1, t2) ->
            return t2.getTotalSolved() - t1.getTotalSolved() if t1.getTotalSolved() != t2.getTotalSolved()
            return t1.getPenalty() - t2.getPenalty() if t1.getPenalty() != t2.getPenalty()
            return t1.getLastSolvedTime() - t2.getLastSolvedTime() if t1.getLastSolvedTime() != t2.getLastSolvedTime()
            return 0

        stableSort(rts, teamComparator)

        for r, teamStatus of rts
            teamStatus.rank = parseInt(r) + 1
        for r, teamStatus of rts
            if (r = parseInt(r)) > 0
                prevTeamStatus = rts[r-1]
                if teamComparator(prevTeamStatus, teamStatus) is 0
                    teamStatus.rank = prevTeamStatus.rank

        @rankedTeamStatuses = rts
        return rts

    # refelct the run into the contest context, and update TeamStatus, TeamProblemStatus, ProblemSummary, ...
    # new run : contest = null
    reflectRun : (run) ->
        assert (run instanceof Run), 'run is not an instance of Run'
        assert (run.getContest() == this), 'run is out of the contest context'

        rid = run.getId()
        team = run.getTeam()
        problem = run.getProblem()

        @runsIndexed[rid] = run
        teamStatus = @teamStatuses[team.getId()]
        teamStatus.update(run)

        problemSummary = @problemSummarys[problem.getId()]
        problemSummary.update(run)

        if not @underRunTransaction
            do @updateTeamStatusesAndRanks


    # not implemented
    beginRunTransaction : ->
        if @underRunTransaction
            throw new Error('already in a transaction')
        else @underRunTransaction = true

    commitRunTransaction : ->
        if not @underRunTransaction
            throw new Error('not in a transaction')
        else
            @underRunTransaction = false
            do @updateTeamStatusesAndRanks

    # we do not support rollback yet :(


# feed runs
class RunFeeder
    constructor : (@contest, @strategy) ->
        throw new Error("contest is undefined or null") unless (@contest? and @contest instanceof Contest)
        if @strategy is undefined
            @strategy = new FIFORunFeedingStrategy()

        @strategy.setContest(@contest)
        @runCount = 0

        @contestTime = 0
        @lastTimeStamp = 0
        @noMoreUpdate = false

    # change the strategy
    setStrategy : (strategy) ->
        @strategy = strategy
        @strategy.setContest(@contest)


    getRunCount : -> @runCount

    getContestTime : -> @contestTime
    getLastTimeStamp : -> @lastTimeStamp

    isNoMoreUpdate: -> @noMoreUpdate

    parseRunData : (data, filter) ->
        assertNotNull(data['runs'])
        runs = []
        for r in data['runs']
            rid = parseInt(r.id)
            pid = parseInt(r.problem)
            if isNaN(pid) then pid = parseInt(r.problem?.id)
            tid = parseInt(r.team)
            if isNaN(tid) then tid = parseInt(r.team?.id)

            run = new Run(@contest, rid, \
                @contest.getProblem(pid), @contest.getTeam(tid), \
                parseInt(r.submissionTime), r.result)
            continue if run == null
            continue if filter? and not filter(run)   # skip filtered runs
            runs.push(run)

        noMoreUpdate = contestTime = lastTimeStamp = null
        if data['time']
            noMoreUpdate = data['time'].noMoreUpdate ? true : false
            contestTime = parseInt( data['time'].contestTime )
            timestamp = parseInt( data['time'].timestamp )
        if timestamp >= 0
            lastTimeStamp = timestamp

        return [runs, noMoreUpdate, contestTime, lastTimeStamp]

    fetchRunsFromJson : (data, filter) ->
        # TODO: 이미 맞은 런 피딩 안하도록 처리 여기서 해야함 (see manager.js)
        [runs, noMoreUpdate, contestTime, lastTimeStamp] = @parseRunData(data, filter)
        if noMoreUpdate != null  then @noMoreUpdate = noMoreUpdate
        if contestTime != null   then @contestTime = contestTime
        if lastTimeStamp != null then @lastTimeStamp = lastTimeStamp
        return @fetchRunsFromArray(runs)

    diffAndFeedRuns : (data, filter) ->
        # data: same format as fetchRunsFromJson
        [runs, noMoreUpdate, contestTime, lastTimeStamp] = @parseRunData(data, filter)
        if noMoreUpdate != null  then @noMoreUpdate = noMoreUpdate
        if contestTime != null   then @contestTime = contestTime
        if lastTimeStamp != null then @lastTimeStamp = lastTimeStamp

        # apply diff and feed only changed runs
        runs = (run for run in runs when @_isReflectable(run))
        return @fetchRunsFromArray(runs)

    # add pre-instantiated runs into the runfeeder
    fetchRunsFromArray : (runs) ->
        fetched_runs = 0
        for run in runs
            @strategy.pushRun(run)
            @runCount += 1
            fetched_runs += 1
        return fetched_runs

    _isReflectable : (run) ->
        assert (run instanceof Run), 'run is not an instance of Run'
        assert (run.getContest() == @contest), 'run is out of the contest context'

        # oldRun 찾는 기준: contest에 반영된 것 또는 feeder queue에 대기하고 있는 것
        oldRun = null
        @runDoEach (qrun) ->
            if qrun.getId() == run.getId()
                oldRun = qrun

        if not oldRun
            # feeder queue에 없음 => contest에 반영된것이 최신
            oldRun = @contest.runsIndexed[run.getId()]

        if not oldRun
            # previously not existing run, just go ahead
            return true

        # 이미 맞은 문제는 피딩하지 않음
        if oldRun.isAccepted() then return false

        # the key attributes are [time, result]
        # we assume that team and problem are unchanged
        if oldRun.getTime() isnt run.getTime() then return true
        if oldRun.getResult() isnt run.getResult() then return true

        # no changes.
        return false


    discard : (count=1) ->
        discarded = 0
        return 0 if count <= 0
        for i in [1..count]
            run = @strategy.popRun()
            @runCount -= 1
            break unless run?
            discarded += 1
        return discarded

    feed : (count=1, callback=null) ->
        processed = 0
        return 0 if count <= 0
        for i in [1..count]
            run = @strategy.popRun()
            break unless run?
            @contest.reflectRun(run)
            @runCount -= 1
            processed += 1

            # delegate raising callback to strategy.
            @strategy.doCallback(callback, run) if callback?

        return processed

    feedWhile : (fnCriteria) ->
        processed = 0
        while(true)
            run = @strategy.front()
            break unless run?

            if fnCriteria(run)
                @strategy.popRun()
                @contest.reflectRun(run)
                @runCount -= 1
                processed += 1
            else
                # do unpeek
                break
        return processed

    runDoEach : (fn) ->
        @strategy.runDoEach(fn)
        return this



class AbstractRunFeedingStrategy    # abstract class!
    selectRun: -> throw new NotImplementedError()
    popRun: -> throw new NotImplementedError()
    front: -> throw new NotImplementedError()
    setContest: (contest) ->
        @contest = contest
    runDoEach: (fn) -> throw new NotImplementedError()
    doCallback: (callback, run) ->
        callback(run)

class FIFORunFeedingStrategy extends AbstractRunFeedingStrategy
    constructor: ->
        @runPools = []

    popRun: ->
        run = @runPools.shift()
        return run

    front: (run) ->
        return @runPools[0]

    pushRun: (run) ->
        @runPools.push(run)

    runDoEach: (fn) ->
        for run in @runPools
            fn(run)
        return this



# implement callback function to select a run
class TeamProblemSeparatedQueuedRunFeedingStrategy extends AbstractRunFeedingStrategy
    constructor: (@callbackFn) ->
        @runPools = {}    # map of (team * problem)

    getFrontRunPool: ->
        callbackRetObj = @callbackFn()
        return null if callbackRetObj is null
        pid = callbackRetObj.problemId
        tid = callbackRetObj.teamId
        return null if pid is null and tid is null

        assert @contest? and @contest instanceof Contest, "contest is not configured properly"
        throw new Error "invalid property teamId of the return value of the callback function" unless tid?
        throw new Error "invalid property problemId of the return value of the callback function" unless pid?

        # validate pid and tid
        problem = @contest.getProblem(pid)
        team = @contest.getTeam(tid)
        throw new Error "problem is invalidly chosen" unless problem?
        throw new Error "team is invalidly chosen" unless team?

        # choose the run
        runPool = @runPools[tid][pid]
        return runPool

    front: ->
        runPool = @getFrontRunPool()
        return runPool[0]

    popRun: ->
        runPool = @getFrontRunPool()
        run = runPool.shift()        # TODO : is it possible runPool have runs NOT in a sorted order?
        return run

    doCallback: (callback, run) ->
        # extra metadata : the number of remaining runs
        rp = @runPools[run.getTeam().getId()][run.getProblem().getId()]

        callback(run, rp.length)

    setContest: (contest) ->
        super contest
        assert contest.getTeams()?, "team is not configured"
        assert contest.getProblems()?, "problem is not configured"
        for tid, team of contest.getTeams()
            @runPools[ team.getId() ] = {}
            for pid, problem of contest.getProblems()
                @runPools[ team.getId() ][ problem.getId() ] = []
        return this

    pushRun: (run) ->
        assert @contest?, "contest must be set properly"
        pid = run.getProblem().getId()
        tid = run.getTeam().getId()

        @runPools[tid][pid].push( run )

    runDoEach: (fn) ->
        for tid, team of contest.getTeams()
            for pid, problem of contest.getProblems()
                rps = @runPools[ team.getId() ][ problem.getId() ]        # we have a bug here
                for run in rps
                    fn(run)
        return this



# specify variables/classes to export to the root namespace
M = {
    Problem: Problem,
    Team: Team,
    Run: Run,
    Contest: Contest,
    TeamStatus: TeamStatus,
    TeamProblemStatus: TeamProblemStatus,
    ProblemSummary: ProblemSummary,
    RunFeeder: RunFeeder,

    FIFORunFeedingStrategy: FIFORunFeedingStrategy,
    TeamProblemSeparatedQueuedRunFeedingStrategy: TeamProblemSeparatedQueuedRunFeedingStrategy,
}
$.extend(exports ? this, M)
return M
