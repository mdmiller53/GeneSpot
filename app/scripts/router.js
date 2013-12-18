define(["jquery", "underscore", "backbone", "bootstrap",
    "views/topbar_view", "views/gs/atlas"
],
    function ($, _, Backbone, Bootstrap, TopNavBar, AtlasView) {

        return Backbone.Router.extend({
            targetEl: "#mainDiv",
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
                    var annotations = new WebApp.Models.Annotations({
                        "url": "svc/data/annotations/" + catalog_key + ".json",
                        "dataType": "json"
                    });

                    annotations.fetch({
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
                var parts = uri.split("/");
                var datamodel_root = parts[0];
                var domain_key = parts[1];
                var catalog_key = parts[2];
                var domain_item = WebApp.Datamodel.get(datamodel_root)[domain_key];
                var catalog_item = domain_item.catalog[catalog_key];

                var model = new catalog_item.Model(_.extend(options || {}, { "catalog_item": catalog_item }));
                _.defer(function () {
                    model.fetch({
                        "url": catalog_item["url"],
                        success: function () {
                            model.trigger("load");
                        }
                    });
                });

                var view_options = _.extend({"model": model}, (domain_item.view_options || {}), (options || {}));

                var ViewClass = WebApp.Views[view_name];
                var view = new ViewClass(view_options);
                this.$el.html(view.render().el);
                return view;
            },

            atlas: function () {
                var model = new Backbone.Model();

                var view = new AtlasView({ "model": model });
                this.$el.html(view.render().el);

                model.fetch({
                    "url": "configurations/atlas.json",
                    "success": function () {
                        model.trigger("load");
                    }
                });

                return view;
            }
        });
    });