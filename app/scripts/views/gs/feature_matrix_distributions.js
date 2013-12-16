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
                },
                "click .dropdown-menu.genes-selector-x a": function(e) {
                    console.log("fmx-dist.genes-x:" + $(e.target).data("id"));
                    this.selected_genes.x = $(e.target).data("id");
                    this.initFeatureLabelSelectors();
                },
                "click .dropdown-menu.genes-selector-y a": function(e) {
                    console.log("fmx-dist.genes-y:" + $(e.target).data("id"));
                    this.selected_genes.y = $(e.target).data("id");
                    this.initFeatureLabelSelectors();
                }
            },

            initialize: function (options) {
                _.bindAll(this, "loadData", "initSelectedGenes", "initFeatureLabelSelectors", "drawGraph");
                this.initSelectedGenes();

                this.$el.html(Tpl({
                    "genes": this.options.genes,
                    "tumor_types": WebApp.Lookups.TumorTypes.get("selected"),
                    "selected_genes": this.selected_genes
                }));

                this.initGraph();

                var models = _.values(this.options.models.source);
                _.each(models, function (model) {
                    model.on("load", this.loadData);
                }, this);
            },

            initSelectedGenes: function() {
                this.selected_genes = {
                    "x": _.first(this.options.genes),
                    "y": _.first(this.options.genes)
                };
                if (this.options.genes.length > 1) this.selected_genes["y"] = this.options.genes[1];
            },

            loadData: function () {
                console.log("fmx-dist.loadData");

//                this.$el.find(".download-container").empty();

//                this.feature_map = _.groupBy(this.options.models.source[tumor_type].get("items"), "id");
                _.defer(this.initFeatureLabelSelectors);
                _.defer(this.drawGraph);
            },

            initFeatureLabelSelectors: function () {
                console.log("fmx-dist.initFeatureLabelSelectors:" + JSON.stringify(this.selected_genes));
                this.$el.find(".selected-gene-x").html(this.selected_genes["x"]);
                this.$el.find(".selected-gene-y").html(this.selected_genes["y"]);
            },

            initGraph: function () {
                console.log("fmx-dist.initGraph");
            },

            drawGraph: function () {
                console.log("fmx-dist.drawGraph");
            }
        });
    });
