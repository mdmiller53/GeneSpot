define(["jquery", "underscore", "backbone", "hbs!templates/gs/scatterplot"],
    function ($, _, Backbone, Tpl) {
        return Backbone.View.extend({
            selected_tumor_types: [],
            selected_genes: { "x": "TP53", "y": "KRAS" },
            selected_features: { "x": null, "y": null },
            colorsByTumorType: {},
            carve: {
                highlight: function (tumor_type) {
                    console.log("carve.highlight:" + tumor_type);
                    return this;
                },
                render: function () {
                    console.log("carve.render");
                    return this;
                }
            },

            events: {
                "click .tumor-type-selector-scatterplot button": function (e) {
                    this.carve.highlight($(e.target).data("id")).render();
//                    this.carve.highlight("").render();
                }
            },

            initialize: function (options) {
                _.bindAll(this, "loadData", "initFeatureLabelSelector", "drawGraph");

                this.$el.html(Tpl({
                    "genes": this.options.genes,
                    "first_gene": _.first(this.options.genes),
                    "tumor_types": WebApp.Lookups.TumorTypes.get("selected")
                }));

                this.initGraph();

                var models = _.values(this.options.models.source);
                this.loadData = _.after(this.loadData, models.length);

                _.each(models, function (model) {
                    model.on("load", this.loadData);
                }, this);
            },

            loadData: function (tumor_type) {
                console.log("loadData:" + tumor_type);

//                this.$el.find(".download-container").empty();

                var _this = this;
                return function () {
                    _this.feature_map = _.groupBy(_this.options.models.source[tumor_type].get("items"), "id");
                    _.defer(_this.initFeatureLabelSelector);
                    _.defer(_this.drawGraph);
                };
            },

            initFeatureLabelSelector: function () {
                console.log("initFeatureLabelSelector");
            },

            initGraph: function () {
                console.log("initGraph");
            },

            drawGraph: function () {
                console.log("drawGraph");
            }
        });
    });
