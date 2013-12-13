"use strict";

var LIVERELOAD_PORT = 35729;
var CONNECT_HOSTNAME = "0.0.0.0";  // "0.0.0.0" allows access to server from other computers
var CONNECT_PORT = 9010;

var mountFolder = function (connect, dir) {
    return connect.static(require("path").resolve(dir));
};

var proxySnippet = require("grunt-connect-proxy/lib/utils").proxyRequest;

// # Globbing
// for performance reasons we"re only matching one level down:  "test/spec/{,*/}*.js"
// use this if you want to recursively match all subfolders:  "test/spec/**/*.js"

module.exports = function (grunt) {
    // load all grunt tasks
    require("matchdep").filterDev("grunt-*").forEach(grunt.loadNpmTasks);

    var configuredProxies = grunt.file.readJSON("proxy.json");

    grunt.initConfig({
        proxyConfig: configuredProxies,
        watch: {
            options: {
                nospawn: true
            },
            livereload: {
                options: {
                    livereload: LIVERELOAD_PORT
                },
                files: [
                    "app/*.html",
                    "app/configurations/*.json",
                    "{.tmp,app}/css/{,*/}*.css",
                    "{.tmp,app}/scripts/**/*.js",
                    "{.tmp,app}/scripts/**/*.hbs",
                    "app/img/{,*/}*.{ico,png,jpg,jpeg,gif,webp,svg}"
                ]
            }
        },
        connect: {
            options: {
                port: CONNECT_PORT,
                hostname: CONNECT_HOSTNAME
            },
            livereload: {
                options: {
                    middleware: function (connect) {
                        return [
                            proxySnippet,
                            require("connect-livereload")({
                                port: LIVERELOAD_PORT
                            }),
                            mountFolder(connect, ".tmp"),
                            mountFolder(connect, "app")
                        ];
                    }
                }
            },
            test: {
                options: {
                    middleware: function (connect) {
                        return [
                            mountFolder(connect, ".tmp"),
                            mountFolder(connect, "test")
                        ];
                    }
                }
            },
            dist: {
                options: {
                    middleware: function (connect) {
                        return [
                            mountFolder(connect, "dist")
                        ];
                    }
                }
            },
            proxies : configuredProxies["proxies"]
        },
        open: {
            server: {
                path: "http://localhost:" + CONNECT_PORT
            }
        },
        clean: {
            dist: {
                files: [
                    {
                        dot: true,
                        src: [
                            ".tmp",
                            "dist/*",
                            "!dist/.git*"
                        ]
                    }
                ]
            },
            server: ".tmp"
        },
        jshint: {
            options: {
                jshintrc: ".jshintrc"
            },
            all: [
                "Gruntfile.js",
                "app/scripts/{,*/}*.js",
                "!app/scripts/vendor/*",
                "test/spec/{,*/}*.js"
            ]
        },
        mocha: {
            all: {
                options: {
                    run: true,
                    urls: ["http://localhost:" + CONNECT_PORT + "/index.html"]
                }
            }
        },
        requirejs: {
            dist: {
                options: {
                    baseUrl: "app/scripts",
                    optimize: "none",
                    preserveLicenseComments: false,
                    useStrict: true,
                    wrap: true
                }
            }
        },
        rev: {
            dist: {
                files: {
                    src: [
                        "dist/scripts/{,*/}*.js",
                        "dist/css/{,*/}*.css",
                        "dist/css/fonts/*"
                    ]
                }
            }
        },
        useminPrepare: {
            options: {
                dest: "dist"
            },
            html: "app/index.html"
        },
        usemin: {
            options: {
                dirs: ["dist"]
            },
            html: ["dist/{,*/}*.html"],
            css: ["dist/css/{,*/}*.css"]
        },
        imagemin: {
            dist: {
                files: [
                    {
                        expand: true,
                        cwd: "app/img",
                        src: "{,*/}*.{ico,png,jpg,jpeg}",
                        dest: "dist/img"
                    }
                ]
            }
        },
        svgmin: {
            dist: {
                files: [
                    {
                        expand: true,
                        cwd: "app/img",
                        src: "{,*/}*.svg",
                        dest: "dist/img"
                    }
                ]
            }
        },
        cssmin: {
            dist: {
                files: {
                    "dist/css/main.css": [
                        ".tmp/css/{,*/}*.css",
                        "app/css/{,*/}*.css"
                    ]
                }
            }
        },
        htmlmin: {
            dist: {
                options: {},
                files: [
                    {
                        expand: true,
                        cwd: "app",
                        src: "*.html",
                        dest: "dist"
                    }
                ]
            }
        },
        copy: {
            dist: {
                files: [
                    {
                        expand: true,
                        dot: true,
                        cwd: "app",
                        dest: "dist",
                        src: [
                            "*.{ico,png,txt}",
                            "img/{,*/}*.{png,webp,gif,ico}",
                            "css/fonts/*"
                        ]
                    },
                    {
                        expand: true,
                        dot: true,
                        cwd: "app",
                        dest: "dist",
                        src: [
                            "configurations/*.json",
                        ]
                    },
                    {
                        expand: true,
                        cwd: ".tmp/img",
                        dest: "dist/img",
                        src: [
                            "generated/*"
                        ]
                    }
                ]
            },
            builddebug: {
                files: [
                    {
                        expand: true,
                        cwd: "app",
                        dest: "dist",
                        src: "bower_components/requirejs/require.js"
                    }
                ]
            }
        },
        concurrent: {
            server: [],
            test: [],
            dist: ["svgmin", "htmlmin"]
        },
        bower: {
            options: {
                exclude: ["modernizr"]
            },
            all: {
                rjsConfig: "app/scripts/config.js"
            }
        }
    });

    grunt.registerTask("server", function (target) {
        if (target === "dist") {
            return grunt.task.run(["build", "open", "connect:dist:keepalive"]);
        }

        grunt.task.run([
            "clean:server",
            "concurrent:server",
            "configureProxies",
            "connect:livereload",
            "open",
            "watch"
        ]);
    });

    grunt.registerTask("test", [
        "clean:server",
        "concurrent:test",
        "connect:test",
        "mocha"
    ]);

    grunt.registerTask("build", function(target) {
        if (target === undefined) {
            return grunt.task.run([
                "clean:dist",
                "useminPrepare",
                "concurrent:dist",
                "requirejs",
                "concat",
                "cssmin",
                "uglify",
                "copy:dist",
                "rev",
                "usemin"
            ]);
        }
        else if (target == "debug") {
            return grunt.task.run([
                "clean:dist",
                "useminPrepare",
                "concurrent:dist",
                "requirejs",
                "concat",
                "copy:dist",
                "rev",
                "usemin",
                "copy:builddebug"
            ]);
        }
        else {
            return grunt.log.warn("Unknown build target \"" + target + "\", quitting.");
        }
    });

    grunt.registerTask("default", [
        "jshint",
        "test",
        "build"
    ]);
};
