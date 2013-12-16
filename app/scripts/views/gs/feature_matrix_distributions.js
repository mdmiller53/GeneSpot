define(["jquery", "underscore", "backbone",
    "hbs!templates/gs/scatterplot", "hbs!templates/line_item", "hbs!templates/gs/scatterplot_feature_defs"],
    function ($, _, Backbone, Tpl, LineItemTpl, FeatureDefsTpl) {
        return Backbone.View.extend({
            selected_genes: {},
            selected_features: {},
            feature_definitions: {},

            events: {
                "click .tumor-type-selector-scatterplot button": function (e) {
                    console.log("fmx-dist.carve.highlight:" + $(e.target).data("id"));
                },
                "click .dropdown-menu.genes-selector-x a": function (e) {
                    console.log("fmx-dist.genes-x:" + $(e.target).data("id"));
                    this.selected_genes.x = $(e.target).data("id");
                    this.render_featureLabelSelectors("x");
                },
                "click .dropdown-menu.genes-selector-y a": function (e) {
                    console.log("fmx-dist.genes-y:" + $(e.target).data("id"));
                    this.selected_genes.y = $(e.target).data("id");
                    this.render_featureLabelSelectors("y");
                }
            },

            initialize: function () {
                _.bindAll(this, "init_selectedGenes", "load_featureDefinitions", "render_featureLabelSelectors");
                _.bindAll(this, "draw_graph", "init_graph");

                this.feature_definitions = {};

                this.init_selectedGenes();

                this.$el.html(Tpl({
                    "genes": this.options.genes,
                    "tumor_types": WebApp.Lookups.TumorTypes.get("selected"),
                    "selected_genes": this.selected_genes
                }));

                this.init_graph();

                var models = _.values(this.options.models.source);
                _.each(models, function (model) {
                    model.on("load", function() {
                        _.defer(this.load_featureDefinitions, model.get("tumor_type"));
                    }, this);
                }, this);
            },

            init_selectedGenes: function () {
                this.selected_genes = {
                    "x": _.first(this.options.genes),
                    "y": _.first(this.options.genes)
                };
                if (this.options.genes.length > 1) this.selected_genes["y"] = this.options.genes[1];
            },

            init_graph: function () {
                console.log("fmx-dist.init_graph");
            },

            load_featureDefinitions: function (tumor_type) {
                console.log("fmx-dist.load_featureDefinitions(" + tumor_type + ")");
                var items = this.options.models.source[tumor_type].get("items");

                var items_by_gene = _.groupBy(items, "gene");
                _.each(items_by_gene, function (item_by_gene, gene) {
                    var fd_by_gene = this.feature_definitions[gene];
                    if (_.isUndefined(fd_by_gene)) fd_by_gene = this.feature_definitions[gene] = {};

                    _.each(_.groupBy(item_by_gene, "source"), function (item_by_source, feature_source) {
                        var fd_by_fsource = fd_by_gene[feature_source];
                        if (_.isUndefined(fd_by_fsource)) fd_by_fsource = fd_by_gene[feature_source] = [];
                        _.each(item_by_source, function (i_by_s) {
                            fd_by_fsource.push(_.omit(i_by_s, "values"));
                        });
                    });
                }, this);

                this.render_featureLabelSelectors("x");
                this.render_featureLabelSelectors("y");
            },

            render_featureLabelSelectors: function (axis) {
                console.log("fmx-dist.render_featureLabelSelectors(" + axis + "):" + this.selected_genes[axis]);
                this.$el.find(".selected-gene-" + axis).html(this.selected_genes[axis]);

                var fd_by_gene = this.feature_definitions[this.selected_genes[axis]];

                var $feature_selector = this.$el.find(".feature-selector-" + axis).empty();

                var uid = Math.round(Math.random() * 10000);
                var fdefs_uid_by_source = {};
                var feature_sources = _.map(_.keys(fd_by_gene || {}), function(source) {
                    var s_uid = uid++ + "-" + axis;
                    fdefs_uid_by_source[source] = s_uid;
                    return { "uid": s_uid, "label": source.toUpperCase(), "item_class": "feature_defs" };
                });
                $feature_selector.append(FeatureDefsTpl({"axis": axis, "feature_sources": feature_sources}));

                _.each(fd_by_gene, function (features, source) {
                    var collapserUL = $feature_selector.find("#tab-pane-" + fdefs_uid_by_source[source]);
                    _.each(features, function (feature) {
                        var label = feature.modifier || "chr" + feature.chr + ":" + feature.start + ":" + feature.end + ":" + feature.strand;
                        collapserUL.append(LineItemTpl({ "label": label, "id": feature.id, "a_class": "feature-selector-" + axis }));
                    });
                });

                var firstFD = $(_.first($feature_selector.find(".feature_defs a")));
                if (firstFD) {
                    this.selected_features[axis] = firstFD.data("id");
                    firstFD.parents("li").addClass("active");
                    firstFD.parents("ul").addClass("active");
                    $("#tab-" + firstFD.parents("ul").data("uid")).parents("li").addClass("active")
                }

                var _this = this;
                $feature_selector.find(".feature-selector-" + axis).click(function (e) {
                    $(e.target).parents("ul").find(".active").removeClass("active");
                    $(e.target).parent().addClass("active");
                    _this.selected_features[axis] = $(e.target).data("id");
                    _.defer(_this.draw_graph);
                });

                _.defer(this.draw_graph);
            },

            draw_graph: function () {
                console.log("fmx-dist.draw_graph");
                if (!this.selected_features.x) return;
                if (!this.selected_features.y) return;

                console.log("fmx-dist.draw_graph:" + JSON.stringify(this.selected_features));
            }
        });
    });
