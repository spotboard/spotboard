Spotboard
=========

*Spotboard* is an awesome, fancy, and modern web-based scoreboard application for programming contests, especially ACM-ICPC.

Demo
----

* Official Scoreboard:
    ACM-ICPC Daejeon Regional
    [[2015]](http://icpckorea.org/2015/REGIONAL/scoreboard.html)
    [[2016]](http://icpckorea.org/2016/REGIONAL/scoreboard.html)
* Award Ceremony Video:
    [[2013]](https://youtu.be/ZXYwvFinZEk?t=1215)
    [[2014]](https://youtu.be/UVAnGe35PY4)
    [[2015]](https://youtu.be/kF5RR2TXgkk?t=287)
    [[2016]](https://www.facebook.com/icpckorea/videos/1249185941806137/)

Usage
-----

Spotboard consists of two main modules: a static **web application** (frontend),
and the **feedserver** (backend: API server) that provides the contest information.

### Frontend: [Web Application][src-webapp]

Download [a webapp package](https://github.com/spotboard/spotboard/releases), and serve it using any HTTP server.
We recommend `http-server -c-1` (disable cache) or `nginx`.
A path to the API server and many other preferences can be configured in [config.js][config_sample].

### Backend: FeedServer

The feedserver should provide the contest information and all the runs (submissions) during the contest,
[in JSON][json_sample].
For common contest systems such as [PC^2] or [Domjudge], please see below.

Disclaimer: Some of internal API specifications might be not backward-compatible.

Backend: Domjudge
-----------------

You may find [spotboard/domjudge-converter] useful.

[spotboard/domjudge-converter]: https://github.com/spotboard/domjudge-converter


Backend: PC^2
-------------

Disclaimer: This part is not yet open-sourced, sorry :)

*TL;DR)* Setup the `config.yaml`, then launch the spotboard server application.

```
$ vim config.yaml
$ java -jar spotboard-server.jar
```

<!--
- The web application can be hosted using commonly-used web servers such as Nginx and Apache,
  or using the embedded web server provided. See the [detailed documentation](docs/webapp.md).
- The feedserver should provide the contest information and all the runs (submissions) during the contest.
  It is shipped with *off-the-shelf* bridges to other programming contest systems such as PC^2.
  See the [detailed documentation](docs/feedserver.md).
-->

[PC^2]: https://pc2.ecs.csus.edu/
[Domjudge]: https://www.domjudge.org/

[src-webapp]: https://github.com/spotboard/spotboard/tree/master/webapp
[config_sample]: https://github.com/spotboard/spotboard/blob/master/webapp/src/config.js
[json_sample]: https://github.com/spotboard/spotboard/tree/master/webapp/src/sample


Documentation
-------------

> TODO

Authors
-------

- Jongwook Choi ([@wookayin][gh-wookayin])
- Wonha Ryu ([@beingryu][gh-beingryu])

If you want to contribute to the project, please raise an issue or a pull request.

[gh-wookayin]: https://github.com/wookayin
[gh-beingryu]: https://github.com/beingryu


License
-------

MIT LICENSE.
