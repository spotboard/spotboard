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


Usage (for PC^2)
----------------

*TL;DR)* Setup the `config.yaml`, then launch the spotboard server application.

```
$ vim config.yaml
$ java -jar spotboard-server.jar
```

Spotboard consists of two main modules: a static **web application**, and the **feedserver** (an API server) which provides contest information [in JSON][json_sample].

- The web application can be hosted using commonly-used web servers such as Nginx and Apache,
  or using the embedded web server provided. See the [detailed documentation](docs/webapp.md).
- The feedserver should provide the contest information and all the runs (submissions) during the contest.
  It is shipped with *off-the-shelf* bridges to other programming contest systems such as PC^2.
  See the [detailed documentation](docs/feedserver.md).

[json_sample]: https://github.com/spotboard/spotboard/tree/master/webapp/src/sample

Disclaimer: Some of internal APIs might be not backward-compatible.

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
