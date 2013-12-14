define(["jquery", "underscore", "backbone", "bootstrap",
    "views/topbar_view",
    "views/data_menu_modal",
    "views/data_menu_sections",
    "views/sessions_view",
    "views/gs/atlas"
],
    function ($, _, Backbone, Bootstrap, TopNavBar, DataMenuModal, DataMenuSections, SessionsView, AtlasView) {

        return Backbone.Router.extend({
            targetEl: "#mainDiv",
            routes: {
                "": "atlas",
                "v/*uri/:view_name": "viewsByUri",
                "s/*sessionId": "loadSessionById"
            },

            initialize: function (options) {
                if (options) _.extend(this, options);

                this.$el = $(this.targetEl);
            },

            views: {

            },

            initTopNavBar: function () {
                var topnavbar = new TopNavBar();
                $("#navigation-container").append(topnavbar.render().el);

                var dataMenuSectionsView = new DataMenuSections({
                    sections: _.map(_.keys(WebApp.Datamodel.attributes), function (section_id) {
                        return {
                            data: WebApp.Datamodel.get(section_id),
                            id: section_id
                        };
                    })
                });

                dataMenuSectionsView.on("select-data-item", function (selected) {
                    new DataMenuModal(_.extend({ el: $("#modal-container") }, selected));
                });

                $(".data-dropdown").append(dataMenuSectionsView.render().el);

                var sessionsView = new SessionsView();
                this.$el.find(".sessions-container").html(sessionsView.render().el);
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