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
            Router: new AppRouter(),
            Sessions: {
                All: new SessionsCollection([]),
                Active: null,
                Producers: {}
            },
            UserPreferences: new Backbone.Model()
        };

        WebApp.initialize = function () {
            // 1. Start and Monitor WebApp Initialization Tasks
            var startTasks = new Date().getTime();
            var webappTasks = ["display", "lookups", "datamodel", "router"];
            var webappReadyFn = _.after(webappTasks.length, function () {
                WebApp.Events.trigger("webapp:ready");
            });
            _.each(webappTasks, function (task) {
                WebApp.Events.on("webapp:ready:" + task, function () {
                    console.log("[SUCCESS] webapp:ready:" + task + " [" + (new Date().getTime() - startTasks) + "ms]");
                });
                WebApp.Events.on("webapp:ready:" + task, webappReadyFn);
            });

            // 1. Load display elements asynchronously
            WebApp.Display.fetch({
                url: "configurations/display.json",
                success: function () {
                    document.title = (WebApp.Display.get("title") || "Web App Base");
                    WebApp.Events.trigger("webapp:ready:display");
                }
            });

            // 2. Fetch and prep datamodel
            WebApp.Datamodel.fetch({ "url": "configurations/datamodel.json" });

            // 3. Fetch and prep lookups
            WebApp.Events.on("webapp:ready:datamodel", function () {
                WebApp.Lookups.fetch({ "url": "configurations/lookups.json" });
            });

            // 4. Start router
            WebApp.Events.on("webapp:ready:lookups", WebApp.Router.start);

            // 5. Start sessions
            WebApp.Sessions.All.fetch({
                "url": "svc/storage/sessions",
                "success": function (json) {
                    // Is this necessary?
                    WebApp.Sessions.All = new SessionsCollection(json.items);
                    WebApp.Events.trigger("webapp:ready:sessions");
                }
            });
        };

        _.bindAll(WebApp, "initialize");

        return WebApp;
    });