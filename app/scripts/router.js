define(["jquery", "underscore", "backbone", "bootstrap", "views/topbar_view",
    "views/gs/atlas", "models/gs/atlas_map_factory"],
    function ($, _, Backbone, Bootstrap, TopNavBar, AtlasView, AtlasMapFactory) {

        return Backbone.Router.extend({
            targetEl: "#main-container",
            navigationEl: "#navigation-container",
            routes: {
                "": "atlas",
                "v/*uri/:view_name": "viewsByUri",
                "s/*sessionId": "loadSessionById"
            },
            views: {},

            initialize: function (options) {
                if (options) _.extend(this, options);
                _.bindAll(this, "start", "loadSessionById");
                this.$el = $(this.targetEl);
                this.$nav = $(this.navigationEl);
            },

            start: function () {
                this.$nav.append(new TopNavBar().render().el);

                Backbone.history.start();

                WebApp.Events.trigger("webapp:ready:router");
            },


            loadSessionById: function (sessionId) {
                if (!_.isEmpty(sessionId)) {
                    var selectedSession = _.find(WebApp.Sessions.All.models, function (m) {
                        return _.isEqual(m.get("id"), sessionId);
                    });
                    if (selectedSession) {
                        WebApp.Sessions.Active = selectedSession;
                        var route = selectedSession.get("route");
                        if (!_.isEmpty(route)) {
                            this.navigate(route, {trigger: true});
                        }
                    }
                }
            },

            home_view: function () {
                // TODO
            },

            fetchAnnotations: function (catalog_key) {
                if (_.isEmpty(WebApp.Annotations[catalog_key])) {
                    var annotations = new WebApp.Annotations({});
                    annotations.fetch({
                        "url": "svc/datastores/annotations/" + catalog_key,
                        "async": false,
                        "dataType": "json",
                        "success": function () {
                            WebApp.Annotations[catalog_key] = annotations.get("itemsById");
                        }
                    });
                }
                return WebApp.Annotations[catalog_key];
            },

            viewsByUri: function (uri, view_name, options) {
                // 1. Lookup model specification(s) for datamodel(s)
                var modelspecs = WebApp.Datamodel.find_modelspecs(uri);
                if (_.isUndefined(modelspecs) || !_.has(modelspecs, "single")) {
                    console.log("webapp:router:uri_not_found:" + uri);
                    return;
                }

                var modelspec = modelspecs["single"];
                var _this = this;
                var createViewFn = function (Model) {
                    // NOTE: May seem out of order, but is called after modelspec is turned to model
                    // 3. Create view
                    var model = new Model(modelspec);

                    var ViewClass = WebApp.Views[view_name];
                    var view = new ViewClass(_.extend({ "model": model }, options));
                    _this.$el.html(view.render().el);

                    // 4. Fetch data and load model
                    _.defer(function () {
                        model.fetch({
                            "url": model.get("url") + (model.get("url_prefix") || ""),
                            "data": options,
                            "traditional": true,
                            "success": function () {
                                model.trigger("load");
                            }
                        });
                    });
                };

                // 2. Create model(s) from model specifications
                if (modelspec["model"]) {
                    require([modelspec["model"]], createViewFn);
                } else {
                    createViewFn(Backbone.Model);
                }
            },

            atlas: function () {
                var model = new AtlasMapFactory();
                var view = new AtlasView({ "model": model });

                var _this = this;
                this.$el.fadeOut({
                    "always": function() {
                        model.fetch({
                            "url": "configurations/atlas.json",
                            "success": function () {
                                _this.$el.html(view.render().el);
                                model.trigger("load");

                                _this.$el.fadeIn();
                            }
                        });
                    }
                });

                return view;
            }
        });
    });
