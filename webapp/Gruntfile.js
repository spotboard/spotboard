/* vim: set expandtab:
 * vim: set ts=4 sts=4 sw=4: */

module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        banner : (
            '/*! Spotboard <%= pkg.version %> | https://github.com/spotboard */'
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


    // register tasks
    grunt.registerTask('default', [ 'coffee', 'requirejs', 'copy', 'usebanner' ]);
    grunt.registerTask('server', [ 'default', 'connect:prod' ]);
    grunt.registerTask('dev', [ 'coffee', 'configureProxies:dev', 'connect:dev', 'watch' ]);
};
