define(["jquery", "underscore", "backbone",
    "hbs!templates/gs/scatterplot", "hbs!templates/line_item", "hbs!templates/gs/scatterplot_feature_defs", "carve"],
    function ($, _, Backbone, Tpl, LineItemTpl, FeatureDefsTpl) {
        return Backbone.View.extend({
            selected_genes: {},
            selected_features: {},
            feature_definitions: {},
            feature_definitions_by_id: {},

            events: {
                "click .tumor-type-selector-scatterplot button": function (e) {
                    var tumor_type = $(e.target).data("id");
                    if (tumor_type === "all_tumor_types") {
                        console.log("fmx-dist.carve.clear(\"highlight\")");
                        this.carveVis.clear("highlight");
                    } else {
                        console.log("fmx-dist.carve.highlight:" + tumor_type);
                        this.carveVis.highlight(tumor_type);
                    }
                },
                "click .sample-type-selector-scatterplot button": function (e) {
                    var sample_type = $(e.target).data("id");
                    if (sample_type === "all_sample_types") {
                        console.log("fmx-dist.all_sample_types");
                        this.selected_sample_type = null;
                    } else {
                        console.log("fmx-dist.selected_sample_type:" + sample_type);
                        this.selected_sample_type = sample_type;
                    }
                    _.defer(this.draw_graph);
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
                _.bindAll(this, "draw_graph", "init_graph", "aggregate_data");

                this.feature_definitions = {};
                this.feature_definitions_by_id = {};

                this.selected_tumor_types = WebApp.UserPreferences.get("selected_tumor_types");

                this.init_sampleTypes();
                this.init_selectedGenes();

                this.$el.html(Tpl({
                    "genes": this.options.genes,
                    "tumor_types": this.selected_tumor_types,
                    "sample_types": this.sample_types,
                    "selected_genes": this.selected_genes
                }));

                _.defer(this.init_graph);

                var drawFn = _.after(_.keys(this.options.models).length, this.draw_graph);
                _.each(this.options.models, function (model, tumor_type) {
                    model.on("load", function () {
                        _.defer(this.load_featureDefinitions, tumor_type);
                        _.defer(drawFn);
                    }, this);
                }, this);
            },

            init_sampleTypes: function() {
                var sample_type_models = WebApp.Lookups.get("sample_types") || {};
                var models = _.values(sample_type_models) || [];
                var firstModel = _.first(models) || new Backbone.Model();
                this.sample_types = _.map(firstModel.get("definitions"), function(label, key) {
                    return { "label": label, "key": key };
                });
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
                var carvEl = this.$el.find(".scatterplot-container");
                var carvObj = carve({
                    radius: 20,
                    margin: { top: 15, bottom: 20, left: 15, right: 50 }
                });
                this.carveVis = carvObj(carvEl.selector);
            },

            load_featureDefinitions: function (tumor_type) {
                console.log("fmx-dist.load_featureDefinitions(" + tumor_type + ")");
                var items = this.options.models[tumor_type].get("items");

                var items_by_gene = _.groupBy(items, "gene");
                _.each(items_by_gene, function (item_by_gene, gene) {
                    var fd_by_gene = this.feature_definitions[gene];
                    if (_.isUndefined(fd_by_gene)) fd_by_gene = this.feature_definitions[gene] = {};

                    _.each(_.groupBy(item_by_gene, "source"), function (item_by_source, feature_source) {
                        var fd_by_fsource = fd_by_gene[feature_source];
                        if (_.isUndefined(fd_by_fsource) || _.isEmpty(fd_by_fsource)) {
                            fd_by_fsource = fd_by_gene[feature_source] = [];
                            _.each(item_by_source, function (i_by_s) {
                                fd_by_fsource.push(_.omit(i_by_s, "values"));
                                this.feature_definitions_by_id[i_by_s.id] = { "id": i_by_s.id, "source": feature_source, "label": i_by_s.id };
                            }, this);
                        }
                    }, this);
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
                var feature_sources = _.map(_.keys(fd_by_gene || {}), function (source) {
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
            },

            draw_graph: function () {
                console.log("fmx-dist.draw_graph");
                if (!this.selected_features.x) return;
                if (!this.selected_features.y) return;

                console.log("fmx-dist.draw_graph:selected=" + JSON.stringify(this.selected_features));

                var X_feature = this.feature_definitions_by_id[this.selected_features.x];
                var Y_feature = this.feature_definitions_by_id[this.selected_features.y];

                var data = this.aggregate_data(this.selected_tumor_types, X_feature, Y_feature);
                if (_.isEmpty(data)) {
                    console.log("fmx-dist.draw_graph:no_data_found");
                    this.carveVis.clear("data");

                    // TODO: Figure out how to properly clear the graph
                    this.$el.find(".scatterplot-container").empty();
                    _.defer(this.init_graph);
                    return;
                }

                console.log("fmx-dist.draw_graph:data=" + data.length + ":" + JSON.stringify(_.first(data) || {}));
                console.log("fmx-dist.draw_graph:data=" + JSON.stringify(_.countBy(data, "tumor_type")));

                this.carveVis.colorBy({
                    label: "tumor_type",
                    list: _.pluck(this.selected_tumor_types, "id"),
                    colors: _.pluck(this.selected_tumor_types, "color")
                }).axisLabel({ x: X_feature.label, y: Y_feature.label })
                    .axisKey({ x: "x", y: "y" })
                    .id("sample")
                    .data(data)
                    .render();
            },

            aggregate_data: function (tumor_types, X_feature, Y_feature) {
                var sampleTypes = WebApp.Lookups.get("sample_types") || {};

                var EMPTY_MODEL = new Backbone.Model();

                var data = _.map(tumor_types, function (tumor_type) {
                    var stModel = sampleTypes[tumor_type.id] || EMPTY_MODEL;
                    var by_sample_type = stModel.get("by_sample_type") || {};
                    var select_samples = by_sample_type[this.selected_sample_type];

                    var model = this.options.models[tumor_type.id] || EMPTY_MODEL;

                    var items_by_id = _.groupBy(model.get("items"), "id");
                    if (!_.has(items_by_id, X_feature.id) || !_.has(items_by_id, Y_feature.id)) return null;

                    var X_features = items_by_id[X_feature.id] || [];
                    var Y_features = items_by_id[Y_feature.id] || [];
                    if (_.isEmpty(X_features) || _.isEmpty(Y_features)) return null;

                    var X_first = _.first(X_features);
                    var Y_first = _.first(Y_features);
                    if (!_.has(X_first, "values") || !_.has(Y_first, "values")) return null;

                    return _.map(X_first.values, function (X_value, X_key) {
                        if (X_value === "NA") return null;

                        var Y_value = Y_first.values[X_key];
                        if (Y_value === "NA") return null;

                        if (this.selected_sample_type && _.indexOf(select_samples, X_key) < 0) return null;

                        if (_.isNumber(X_value)) X_value = parseFloat(X_value);
                        if (_.isNumber(Y_value)) Y_value = parseFloat(Y_value);

                        return {
                            "tumor_type": tumor_type.id,
                            "sample": X_key,
                            "x": X_value,
                            "y": Y_value
                        };
                    }, this);
                }, this);
                return _.compact(_.flatten(data));
            }
        });
    });
