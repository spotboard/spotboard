Spotboard Webapp
================

Build Instruction
-----------------

First, install a modern verison (4.2+) of node.js (nvm is highly recommended).
After activating a node environment, we can install the dependencies.

```
npm install
npm install -g grunt-cli
```

And then, build the application:

```
grunt
```

The directory `dist/` will contain the file tree of the built web application, which is able to being served using static web servers. For web servers, we recommend `http-server -c-1` (disable cache) or nginx.

For development, try `grunt dev`.
