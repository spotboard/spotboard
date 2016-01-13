Spotboard
=========

*Spotboard* is an awesome, fancy, and modern web-based scoreboard application for programming contests, especially ACM-ICPC.

Demo
----

* Official Scoreboard: [[2015 Daejeon Regional]](http://icpckorea.org/2015/REGIONAL/scoreboard.html)
* Award Ceremony Video: [[2013]](https://youtu.be/ZXYwvFinZEk?t=1215) [[2014]](https://youtu.be/UVAnGe35PY4) [[2015]](https://youtu.be/kF5RR2TXgkk?t=287)


Usage
-----

*TL;DR)* Setup the `config.yaml`, then launch the spotboard server application.

```
$ vim config.yaml
$ java -jar spotboard-server.jar
```

Spotboard consists of two main modules: a static **web application**, and the **feedserver** (an API server) which provides contest information.

- The web application can be hosted using commonly-used web servers such as Nginx and Apache,
  or using the embedded web server provided. See the [detailed documentation](docs/webapp.md).
- The feedserver should provide the contest information and all the runs (submissions) during the contest.
  It is shipped with *off-the-shelf* bridges to other programming contest systems such as PC^2.
  See the [detailed documentation](docs/feedserver.md).


Disclaimer: Some of internal APIs might be not backward-compatible.

Documentation
-------------

> TODO

Authors
-------

- Jongwook Choi (@wookayin)
- Wonha Ryu (@beingryu)

If you want to contribute to the project, please raise an issue or a pull request.


License
-------

MIT LICENSE.
