require.config({
    baseUrl: "scripts",

    paths: {
        "jquery": "../bower_components/jquery/jquery",
        "jQuery-ui": "../bower_components/jquery-ui/ui/jquery-ui",
        "jquery-event-drag" : "../bower_components/jquery-event-drag/index",
        "jquery-event-drop" : "../bower_components/jquery-event-drop/index",
        "backbone": "../bower_components/backbone/backbone",
        "bootstrap": "../bower_components/bootstrap/js/bootstrap",
        "d3": "../bower_components/d3/d3",
        "modernizr": "../bower_components/modernizr",
        "underscore": "../bower_components/underscore/underscore",
        "hbs": "../bower_components/require-handlebars-plugin/hbs",
        "handlebars" : "../bower_components/require-handlebars-plugin/Handlebars",
        "json2" : "../bower_components/require-handlebars-plugin/hbs/json2",
        "i18nprecompile" : "../bower_components/require-handlebars-plugin/hbs/i18nprecompile",
        "vq" : "../bower_components/visquick/vq",
        "jsPlumb" : "../bower_components/jsPlumb/dist/js/jquery.jsPlumb-1.5.4-min",
        "colorbrewer": "../bower_components/colorbrewer/colorbrewer",
        "stacksvis" : "../bower_components/stacksvis/js/stacksvis",
        "carve" : "../bower_components/carve/carve"
    },
    "shim": {
        "underscore" : {
            "exports" : "_"
        },
        "jQuery-ui" : {
            "deps": ["jquery"],
            "exports" : "$"
        },
        "jquery-event-drag" : {
            "deps": ["jquery"],
            "exports" : "$"
        },
        "jquery-event-drop" : {
            "deps": ["jquery"],
            "exports" : "$"
        },
        "backbone" : {
            "deps": ["underscore", "jquery"],
            exports: "Backbone"
        },
        bootstrap : {
            deps : ["jquery","jQuery-ui"],
            exports : "bootstrap"
        }
    },
    hbs : {
        "templateExtension" : "hbs",
        "disableI18n" : true,
        "helperPathCallback" :
            function (name) {
                return "templates/helpers/" + name;
            }
    }
});

require(["webapp"], function (WebApp) {
    WebApp.initialize();
});

require(
    [
        "models/annotations",
        "models/feature_matrix",
        "models/gs/by_tumor_type",
        "models/gs/mutations_interpro",
        "models/gs/mutations_map",
        "models/gs/sample_types"
    ],
    function () {
        console.log("making modules available for dynamic loading");
    }
);
