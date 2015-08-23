require 'coffee-script'
assert = require 'assert'
jQuery = require 'jquery'

spotboard = {
    contest: require '../src/js/contest'
}

describe 'Runfeeder', ->
    # create instances from fixtures
    contest = spotboard.contest.Contest.createFromJson({
        problems: [ { id: 0, name: 'A', title: 'A' } ],
        teams : [
            { id : 1, name : 'Team 1' },
            { id : 2, name : 'Team 2' },
        ],
    })
    runfeeder = new spotboard.contest.RunFeeder(contest, new spotboard.contest.FIFORunFeedingStrategy())

    it 'should initialize well', ->
        assert.ok runfeeder.contest.problems, 'has problems'

    it 'feed initial runs', ->
        runfeeder.fetchRunsFromJson({
            time: { contestTime: 18000, noMoreUpdate: false, timestamp: 300 },
            runs: [
                { id: 1, problem: 0, result: '', team: 1, submissionTime: 10 },
                { id: 2, problem: 0, result: 'Yes', team: 2, submissionTime: 11 },
            ]
        })

        assert.equal runfeeder.getRunCount(), 2
        runfeeder.feed(10000)

        assert.equal contest.getTeamStatus(1).getTotalSolved(), 0
        assert.equal contest.getTeamStatus(2).getTotalSolved(), 1
        # TODO contest time, nomoreupadte ...

    it 'can extract the run difference', ->
        runfeeder.diffAndFeedRuns({
            time: { contestTime: 18000, noMoreUpdate: false, timestamp: 350 },
            runs: [
                { id: 1, problem: 0, result: 'Yes', team: 1, submissionTime: 10 },
                { id: 2, problem: 0, result: 'Yes', team: 2, submissionTime: 11 },
            ]
        })
        # Only runs that have changes should be fed into runfeeder
        # in this case, (Run id=1) are the only one.
        assert.equal runfeeder.getRunCount(), 1
        runfeeder.feed(10000)

        assert.equal contest.getTeamStatus(1).getTotalSolved(), 1 # Pending->Yes
        assert.equal contest.getTeamStatus(2).getTotalSolved(), 1
        # TODO contest time, nomoreupadte ...
