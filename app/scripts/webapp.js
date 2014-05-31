define(["jquery", "underscore", "backbone",
    "router",
    "models/sessions", "models/datamodel", "models/lookups",
    "views/items_grid_view", "views/pivot_data_view", "views/search_control",
    "models/gs/item_set"],
    function ($, _, Backbone, AppRouter, SessionsCollection, Datamodel, LookupsModel, ItemGridView, PivotDataView, SearchControl,
        GeneSpotItemSet
    ) {
        WebApp = {
            Events: _.extend(Backbone.Events),

            Annotations: {},
            Views: {
                "grid": ItemGridView,
                "items_grid": ItemGridView,
                "pivot_data_view": PivotDataView
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
            LocalSession: new Backbone.Model(), // TODO : Add Sync
            UserPreferences: new Backbone.Model(),
            Search: new SearchControl(),
            ItemSets: new GeneSpotItemSet()
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
                    console.log("webapp:ready:" + task + "[SUCCESS:" + (new Date().getTime() - startTasks) + "ms]");
                });
                WebApp.Events.on("webapp:ready:" + task, webappReadyFn);
            });

            // 2. Load display elements asynchronously
            WebApp.Display.fetch({
                url: "configurations/display.json",
                success: function () {
                    document.title = (WebApp.Display.get("title") || "Web App Base");
                    WebApp.Events.trigger("webapp:ready:display");
                }
            });

            // 3. Fetch and prep datamodel
            WebApp.Datamodel.fetch({ "url": "configurations/datamodel.json" });

            // 4. Fetch and prep lookups
            WebApp.Events.on("webapp:ready:datamodel", function () {
                WebApp.Lookups.fetch({ "url": "configurations/lookups.json" });
            });

            // 5. Start router
            WebApp.Events.on("webapp:ready:lookups", WebApp.Router.start);

            // 6. Start sessions
            WebApp.Sessions.All.fetch({
                "url": "svc/storage/sessions",
                "success": function (json) {
                    // Is this necessary?
                    WebApp.Sessions.All = new SessionsCollection(json.items);
                    WebApp.Events.trigger("webapp:ready:sessions");
                }
            });

            WebApp.LocalSession.fetch({ "url": "svc/collections/local_session" });

            WebApp.ItemSets.fetch();
        };

        WebApp.alert = function(alertEl, timeout) {
            $(alertEl).show();
            _.delay(function() {
                $(alertEl).hide({ "effect": "fade" });
            }, timeout || 2000);
        };

        WebApp.getItemSets = function() {
            return this.ItemSets;
        };

        _.bindAll(WebApp, "initialize", "getItemSets");

        return WebApp;
    });