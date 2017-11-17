/* vim: set expandtab:
 * vim: set ts=4 sts=4 sw=4: */

var package = require('./package.json');
console.log("Spotboard " + package.version + "\n");

module.exports = function (grunt) {
    grunt.initConfig({
        pkg: package,
        banner : (
            '/*! Spotboard <%= pkg.version %> | https://github.com/spotboard/ */'
        ),
        usebanner: {
            dist: {
                options: {
                    position: 'top',
                    banner: '<%= banner %>',
                },
                files: {
                    src: [ 'dist/js/spotboard-all.min.js' ]
                }
            }
        },
        "file-creator": {
            metadata: {
                // generate metadata.js
                'src/js/metadata.js': function(fs, fd, done) {
                    var exec = require('child_process').exec;
                    fs.writeSync(fd, `
                        /* Spotboard metadata (AUTO-GENERATED) */
                        var __meta__ = {};
                        __meta__.__version__ = "${package.version}";
                    `);
                    done();
                }
            }
        },
        coffee: {
            compile: {
                files: {
                    'src/js/contest.js': 'src/js/contest.coffee'
                }
            },
        },
        requirejs: {
            compile: {
                options: {
                    name: "app",
                    baseUrl: "src/js",
                    mainConfigFile: "src/js/require-config.js",
                    out: "dist/js/spotboard-all.min.js",
                }
            }
        },

        watch: {
            coffee: {
                files: ['src/js/contest.coffee'],
                tasks: 'coffee'
            }
        },

        copy: {
            main: {
                files: [ {
                    expand: true,
                    cwd: 'src/',
                    src: [
                        'img/**',
                        'css/**',
                        'assets/**',
                        'sample/**',

                        'js/lib/**',
                        'js/app.js',
                        'js/require-config.js',

                        'robots.txt',
                        'index.html'
                    ],
                    dest: 'dist/'
                } ]
            },
            config: {
                src: 'src/config.js',
                dest: 'dist/config.js',
                options: {
                    process: function(content, srcpath) {
                        return content + '\n\n' +
                            'config.environment = "production";\n';
                    }
                }
            }
        },

        connect: {
            prod: {
                options: {
                    port: 8000,
                    base: 'dist',
                    keepalive: true,
                    hostname: '*'
                }
            },
            dev: {
                options : {
                    port: 3000,
                    base: 'src',
//                    keepalive: true,
                    hostname: '*',

                    middleware: function (connect, options) {
                        var base = (typeof options.base === 'string') ? [options.base] : options.base;

                        // Setup the proxy
                        var middlewares = [require('grunt-connect-proxy/lib/utils').proxyRequest];
                        base.forEach(function(path) { middlewares.push(connect.static(path)); });
                        return middlewares;
                    }
                },
                proxies : [ {
                    context: ['/api'],
                    host: '127.0.0.1',
                    port: 8080
                } ]
            }
        }
    });

    // load plugins
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-coffee');
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-connect-proxy');
    grunt.loadNpmTasks('grunt-banner');
    grunt.loadNpmTasks('grunt-file-creator');


    // register tasks
    grunt.registerTask('default', [ 'file-creator', 'coffee', 'requirejs', 'copy', 'usebanner' ]);
    grunt.registerTask('server', [ 'default', 'connect:prod' ]);
    grunt.registerTask('dev', [ 'file-creator', 'coffee', 'configureProxies:dev', 'connect:dev', 'watch' ]);
};
