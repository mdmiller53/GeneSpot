define(["jquery", "underscore", "backbone", "router",
    "models/sessions",
    "models/catalog",
    "models/annotations",
    "models/mappings",
    "models/feature_matrix",

    "views/items_grid_view"],
    function ($, _, Backbone, AppRouter, SessionsCollection, CatalogModel, AnnotationsModel, MappingsModel, FeatureMatrixModel, ItemGridView) {

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
            Lookups: {
                Chromosomes: new AnnotationsModel({ url: "svc/data/lookups/chromosomes" }),
                Labels: {},
                TumorTypes: new Backbone.Model()
            },
            Display: new Backbone.Model(),
            Datamodel: new Backbone.Model(),
            Sessions: {
                All: new SessionsCollection([]),
                Active: null,
                Producers: {}
            }
        };

        WebApp.startRouter = function () {
            _.defer(this.datamodelFacade, this);

            this.Router = new AppRouter();
            this.Router.initTopNavBar();

            Backbone.history.start();
            this.Events.trigger("ready");
        };

        WebApp.startupUI = function () {
            var that = this;

            _.defer(this.startRouter, this);

            $.ajax({
                "url": "svc/storage/sessions",
                "method": "GET",
                "async": true,
                success: function (json) {
                    WebApp.Sessions.All = new SessionsCollection(json.items);
                }
            });
        };

        WebApp.datamodelFacade = function() {
            console.log("Dynamic Data Model Directory [datamodel.json]");
            _.each(WebApp.Datamodel.attributes, function (item, key) {
                _.each(item, function (domain_item, domain_key) {
                    _.each(domain_item.catalog, function(catalog_item, catalog_key) {
                        catalog_item.Model = WebApp.Models[catalog_item.model] || Backbone.Model;
                        catalog_item.url = "svc/" + catalog_item.service || "svc/" + catalog_item.uri;
                        console.log("-> " + key + "/" + domain_key + "/" + catalog_key);
                        if (catalog_item.model && WebApp.Models[catalog_item.model]) {
                            console.log("     model : " + catalog_item.model);
                        } else {
                            console.log("     model : Backbone.Model");
                        }
                        console.log("       url : " + catalog_item.url);
                    });
                });
            })
        };

        WebApp.initialize = function () {
            this.Display.fetch({
                url: "configurations/display.json",
                success: function () {
                    document.title = (WebApp.Display.get("title") || "Web App Base");
                }
            });

            this.Datamodel.fetch({
                "url": "configurations/datamodel.json",
                "method": "GET",
                "async": true
            });

            _.defer(this.startupUI, this);

            this.Lookups.Chromosomes.fetch({ dataType: "text" });

            this.Lookups.TumorTypes.fetch({ "url": "configurations/tumor_types.json" });
        };

        _.bindAll(WebApp, "startRouter", "startupUI", "initialize", "datamodelFacade");

        return WebApp;
    });