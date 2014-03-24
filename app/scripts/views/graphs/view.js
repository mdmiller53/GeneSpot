define(["jquery", "underscore", "backbone", "hbs!templates/graphs/container", "cytoscape"],
    function ($, _, Backbone, Tpl) {
        return Backbone.View.extend({
            events: {
                "click a.layouts-null": function (e) {
                    this.__cy_layout(e, { name: "null" });
                },
                "click a.layouts-random": function (e) {
                    this.__cy_layout(e, { name: "random", fit: true });
                },
                "click a.layouts-circle": function (e) {
                    this.__cy_layout(e, {
                        name: "circle",
                        fit: true,
                        rStepSize: 10,
                        padding: 30,
                        startAngle: 3 / 2 * Math.PI,
                        counterclockwise: false
                    })
                },
                "click a.layouts-grid": function (e) {
                    this.__cy_layout(e, { name: "grid", fit: true, padding: 30 })
                },
                "click a.layouts-concentric": function (e) {
                    this.__cy_layout(e, {
                        name: "concentric",
                        fit: true,
                        padding: 30,
                        startAngle: 3 / 2 * Math.PI,
                        counterclockwise: false,
                        minNodeSpacing: 10,
                        concentric: function () {
                            return this.degree();
                        },
                        levelWidth: function (nodes) {
                            return nodes.maxDegree() / 4;
                        }
                    });
                },
                "click a.layouts-breadthfirst": function (e) {
                    this.__cy_layout(e, {
                        name: "breadthfirst",
                        fit: true,
                        directed: false,
                        padding: 30,
                        circle: false,
                        maximalAdjustments: 0
                    });
                },
                "click a.layouts-cose": function (e) {
                    this.__cy_layout(e, {
                        name: "cose",
                        refresh: 0,
                        fit: true,
                        padding: 30,
                        randomize: true,
                        debug: false,
                        nodeRepulsion: 10000,
                        nodeOverlap: 10,
                        idealEdgeLength: 10,
                        edgeElasticity: 100,
                        nestingFactor: 5,
                        gravity: 250,
                        numIter: 100,
                        initialTemp: 200,
                        coolingFactor: 0.95,
                        minTemp: 1
                    });
                }
            },

            initialize: function () {
                console.debug("views/graphs.initialize");
                this.model = this.options.models["graph_db"];
                this.model.on("load", this.__load, this);
            },

            render: function () {
                console.debug("views/graphs.render");
                this.$el.html(Tpl({ "linkouts": _.map(this.options["linkouts"], this.__make_url, this) }));
                return this;
            },

            __load: function () {
                console.debug("views/graphs.__load");
                var nodes = this.model.get("nodes");
                var edges = this.model.get("edges");
                var _this = this;
                this.$(".cytoscape-container").cytoscape({
                    "showOverlay": false,
                    "style": cytoscape.stylesheet()
                        .selector("node")
                        .css({
                            "content": "data(name)",
                            "font-family": "helvetica",
                            "font-size": 14,
                            "text-outline-width": 3,
                            "text-outline-color": "#888",
                            "text-valign": "center",
                            "color": "#fff",
                            "border-color": "#fff"
                        })
                        .selector(":selected")
                        .css({
                            "background-color": "#000",
                            "line-color": "#000",
                            "target-arrow-color": "#000",
                            "text-outline-color": "#000"
                        })
                        .selector("edge")
                        .css({
                            "width": 2,
                            "target-arrow-shape": "triangle"
                        }),
                    "layout": { name: "random" },
                    "zoom": 1,
                    "minZoom": 1e-50,
                    "maxZoom": 1e50,
                    "zoomingEnabled": true,
                    "userZoomingEnabled": true,
                    "pan": { x: 0, y: 0 },
                    "panningEnabled": true,
                    "hideEdgesOnViewport": false,
                    "elements": {
                        "nodes": nodes,
                        "edges": edges
                    },
                    "ready": function () {
                        _this.cy = this;
                    }
                });
            },

            __cy_layout: function (e, options) {
                this.$(".layouts-all").find(".active").removeClass("active");
                var $loading = this.$(".cytoscape-loading");
                $loading.show();

                var finito = function () {
                    $loading.hide();
                    $(e.target).parent("li").addClass("active");
                };

                this.cy.layout(_.extend({ "ready": finito, "stop": finito }, options));
            },

            __make_url: function(linkout) {
                var query = [];
                _.each(this.options.genes, function(g) {
                    query.push("gene=" + g);
                });
                _.each(this.options.tumor_types, function(t) {
                    query.push("tumor_type=" + t);
                });
                return _.extend(linkout, { "url": linkout["url"]  + "?" + query.join("&") });
            }
        });
    });
