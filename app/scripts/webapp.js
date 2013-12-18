define(["jquery", "underscore", "backbone",
    "router",
    "models/sessions", "models/catalog", "models/annotations", "models/mappings", "models/feature_matrix", "models/datamodel", "models/lookups",
    "views/items_grid_view"],
    function ($, _, Backbone, AppRouter, SessionsCollection, CatalogModel, AnnotationsModel, MappingsModel, FeatureMatrixModel, Datamodel, LookupsModel, ItemGridView) {

        WebApp = {
            Events: _.extend(Backbone.Events),

            Annotations: {},
            Models: {
                "Catalogs": CatalogModel,
                "Annotations": AnnotationsModel,
                "Mappings": MappingsModel,
                "FeatureMatrix": FeatureMatrixModel
            },
            ViewMappings: {
                "Annotations": [
                    { "id": "items_grid", label: "Grid" }
                ],
                "FeatureMatrix": [
                    { "id": "items_grid", label: "Grid" }
                ]
            },
            Views: {
                "grid": ItemGridView,
                "items_grid": ItemGridView
            },
            Lookups: new LookupsModel(),
            Display: new Backbone.Model(),
            Datamodel: new Datamodel(),
            Sessions: {
                All: new SessionsCollection([]),
                Active: null,
                Producers: {}
            }
        };

        WebApp.startRouter = function () {
            this.Router = new AppRouter();
            this.Router.initTopNavBar();

            Backbone.history.start();
            this.Events.trigger("ready");
        };

        WebApp.initialize = function () {
            this.Display.fetch({
                url: "configurations/display.json",
                success: function () {
                    document.title = (WebApp.Display.get("title") || "Web App Base");
                }
            });

            this.Datamodel.fetch({ "url": "configurations/datamodel.json" });

            WebApp.Events.on("datamodel-ready", function() {
                WebApp.Lookups.fetch({ "url": "configurations/lookups.json" });
            });
            WebApp.Events.on("lookups-ready", this.startRouter, this);

            $.ajax({
                "url": "svc/storage/sessions",
                "method": "GET",
                "async": true,
                success: function (json) {
                    WebApp.Sessions.All = new SessionsCollection(json.items);
                }
            });
        };

        _.bindAll(WebApp, "startRouter", "initialize");

        return WebApp;
    });