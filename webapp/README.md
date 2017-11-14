Spotboard Webapp
================

Build Instruction
-----------------

First, install a modern verison of node.js (node 6.0+ and [nvm][nvm] is highly recommended).
After activating a node environment, we can install the dependencies.

```
npm install
```

Then, build the application:

```
npm run build
```

The directory `dist/` will contain the file tree of the built web application,
which can be served using *static* web servers.
For web servers, we recommend [`http-server -c-1`][http-server] (disable cache) or [nginx][nginx].

For development, try `npm start`.


[nvm]: https://github.com/creationix/nvm
[http-server]: https://www.npmjs.com/package/http-server
[nginx]: http://nginx.org/
