define(["jquery", "underscore", "backbone",
    "hbs!templates/fmx_distributions/container", "hbs!templates/line_item",
    "hbs!templates/fmx_distributions/feature_defs","hbs!templates/clinvarlist/feature_defs",
    "carve", "colorbrewer"],
    function ($, _, Backbone, Tpl, LineItemTpl, FeatureDefsTpl, ClinVarFeatureDefsTpl, carve) {
        return Backbone.View.extend({
            selected_genes: {},
            selected_features: {},
            selected_tumor_type: null,
            selected_color_by: null,
            feature_definitions: {},
            feature_definitions_by_id: {},
            aggregate_features_by_id: {},

            events: {
                "click .dropdown-menu.fmx-dist-tumor-types-selector a": function (e) {
                    var tumor_type = $(e.target).data("id");
                    if (tumor_type === "all_tumor_types") {
                        console.debug("fmx-dist.selected_tumor_type:all");
                        this.selected_tumor_type = null;
                    } else {
                        console.debug("fmx-dist.selected_tumor_type:" + tumor_type);
                        this.selected_tumor_type = tumor_type;
                    }
                    _.defer(this.__draw);

                    this.$el.find(".dropdown-menu.fmx-dist-tumor-types-selector").find(".active").removeClass("active");
                    $(e.target).parent("li").addClass("active");
                },
                "click .dropdown-menu.fmx-dist-sample-types-selector a": function (e) {
                    var sample_type = $(e.target).data("id");
                    if (sample_type === "all_sample_types") {
                        console.debug("fmx-dist.all_sample_types");
                        this.selected_sample_type = null;
                    } else {
                        console.debug("fmx-dist.selected_sample_type:" + sample_type);
                        this.selected_sample_type = sample_type;
                    }
                    _.defer(this.__draw);

                    this.$el.find(".dropdown-menu.fmx-dist-sample-types-selector").find(".active").removeClass("active");
                    $(e.target).parent("li").addClass("active");
                },
                "click .dropdown-menu.fmx-dist-color-by-selector a": function(e) {
                    var color_by = $(e.target).data("id");
                    console.debug("fmx-dist.selected_color_by:" + color_by);
                    this.selected_color_by = color_by;
                    if (color_by === "tumor_type") this.selected_color_by = null;

                    _.defer(this.__draw);

                    this.$el.find(".dropdown-menu.fmx-dist-color-by-selector").find(".active").removeClass("active");
                    $(e.target).parent("li").addClass("active");
                },
                "click .dropdown-menu.genes-selector-x a": function (e) {
                    console.debug("fmx-dist.genes-x:" + $(e.target).data("id"));
                    this.selected_genes.x = $(e.target).data("id");
                    this.__render_fLabel_selectors("x");
                },
                "click .dropdown-menu.genes-selector-y a": function (e) {
                    console.debug("fmx-dist.genes-y:" + $(e.target).data("id"));
                    this.selected_genes.y = $(e.target).data("id");
                    this.__render_fLabel_selectors("y");
                }
            },

            initialize: function () {
                _.bindAll(this, "__load_fdefs_genes", "__load_fdefs_clinvars");
                _.bindAll(this, "__draw", "__init_graph");

                this.selected_tumor_types = WebApp.UserPreferences.get("selected_tumor_types");

                this.__init_sample_types();
                this.__init_selected_genes();

                var numberOfModels = _.keys(this.options["models"]).length +
                                     _.keys(this.options["clinicalvars_models"]).length;
                var drawFn = _.after(numberOfModels, this.__draw);
                _.each(this.options["models"], function (model, tumor_type) {
                    model.on("load", function () {
                        _.defer(this.__load_fdefs_genes, tumor_type);
                        _.defer(drawFn);
                    }, this);
                }, this);
                _.each(this.options["clinicalvars_models"], function (model, tumor_type) {
                    model.on("load", function () {
                        _.defer(this.__load_fdefs_clinvars, tumor_type);
                        _.defer(drawFn);
                    }, this);
                }, this);
            },

            render: function() {
                _.defer(this.__init_graph);

                this.$el.html(Tpl({
                    "genes": this.options["genes"],
                    "clinical_variables": this.options["clinical_variables"],
                    "tumor_types": this.selected_tumor_types,
                    "sample_types": this.sample_types,
                    "selected_genes": this.selected_genes
                }));

                return this;
            },

            __init_sample_types: function() {
                var sample_type_models = WebApp.Lookups.get("sample_types") || {};
                var models = _.values(sample_type_models) || [];
                var firstModel = _.first(models) || new Backbone.Model();
                this.sample_types = _.map(firstModel.get("definitions"), function(label, key) {
                    return { "label": label, "key": key };
                });
            },

            __init_selected_genes: function () {
                this.selected_genes = {
                    "x": _.first(this.options["genes"]),
                    "y": _.first(this.options["genes"])
                };
                if (this.options["genes"].length > 1) this.selected_genes["y"] = this.options["genes"][1];
            },

            __init_graph: function () {
                console.debug("fmx-dist.__init_graph");
                var carvEl = this.$el.find(".fmx-dist-container").empty();
                var carvObj = carve({
                    radius: 20,
                    margin: { top: 15, bottom: 20, left: 15, right: 50 }
                });
                this.carveVis = carvObj(carvEl.selector);
            },

            __load_fdefs_genes: function (tumor_type) {
                console.debug("fmx-dist.__load_fdefs_genes(" + tumor_type + ")");

                var items_by_gene = _.groupBy(this.options["models"][tumor_type].get("items"), "gene");
                _.each(items_by_gene, function (item_by_gene, gene) {
                    var fd_by_gene = this.feature_definitions[gene];
                    if (_.isUndefined(fd_by_gene)) fd_by_gene = this.feature_definitions[gene] = {};

                    _.each(_.groupBy(item_by_gene, "source"), function (item_by_source, feature_source) {
                        var fd_by_fsource = fd_by_gene[feature_source];
                        if (_.isUndefined(fd_by_fsource) || _.isEmpty(fd_by_fsource)) {
                            fd_by_fsource = fd_by_gene[feature_source] = [];
                            _.each(item_by_source, function (i_by_s) {
                                fd_by_fsource.push(_.omit(i_by_s, "values"));
                            }, this);
                        }
                    }, this);
                }, this);

                this.__aggregate(tumor_type, this.options["models"][tumor_type]);
                this.__render_fLabel_selectors("x");
                this.__render_fLabel_selectors("y");
            },

            __load_fdefs_clinvars: function (tumor_type) {
                console.debug("fmx-dist.__load_fdefs_clinvars(" + tumor_type + ")");
                _.each(this.options["clinical_variables"], function(item) {
                    this.feature_definitions_by_id[item.id] = _.extend({}, item);
                }, this);
                this.__aggregate(tumor_type, this.options["clinicalvars_models"][tumor_type]);
            },

            __aggregate: function(tumor_type, model) {
                _.each(model.get("items"), function(item) {
                    var a_f_by_id = this.aggregate_features_by_id[item.id];
                    if (!a_f_by_id) a_f_by_id = this.aggregate_features_by_id[item.id] = {};
                    a_f_by_id[tumor_type] = item;
                    this.feature_definitions_by_id[item.id] = _.omit(item, "values");
                }, this);
            },

            __render_fLabel_selectors: function (axis) {
                console.debug("fmx-dist.__render_fLabel_selectors(" + axis + "):" + this.selected_genes[axis]);
                if (_.isEqual(this.selected_genes[axis], "clinical-variables")) {
                    this.__render_fLabel_selectors_clinvars(axis);
                } else {
                    this.__render_fLabel_selectors_genes(axis);
                }
            },

            __render_fLabel_selectors_genes: function(axis) {
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
                    _.each(_.sortBy(features, "modifier"), function (feature) {
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

                $feature_selector.find(".feature-selector-" + axis).click(this.__feature_selector_handler(axis));
            },

            __render_fLabel_selectors_clinvars: function(axis) {
                console.debug("fmx-dist.__render_fLabel_selectors_clinvars(" + axis + "):" + this.selected_genes[axis]);

                this.$el.find(".selected-gene-" + axis).html("Clinical Variables");

                var uid = Math.round(Math.random() * 10000);
                this.$el.find(".feature-selector-" + axis).html(ClinVarFeatureDefsTpl({"axis":axis, "uid": uid}));

                var $tabEl = $("#tab-pane-clinvars-" + uid);
                _.each(this.options["clinical_variables"], function(clinical_variable) {
                    $tabEl.append(LineItemTpl(_.extend({ "a_class": "feature-selector-" + axis }, clinical_variable)));
                }, this);

                $tabEl.find(".feature-selector-" + axis).click(this.__feature_selector_handler(axis));
            },

            __feature_selector_handler: function(axis) {
                var _this = this;
                return function(e) {
                    $(e.target).parents("ul").find(".active").removeClass("active");
                    $(e.target).parent().addClass("active");
                    _this.selected_features[axis] = $(e.target).data("id");
                    _.defer(_this.__draw);
                };
            },

            __draw: function () {
                console.debug("fmx-dist.__draw:selected=" + JSON.stringify(this.selected_features));
                this.$el.find(".alert").hide();

                if (!this.selected_features["x"]) return;
                if (!this.selected_features["y"]) return;

                var X_feature = this.feature_definitions_by_id[this.selected_features["x"]];
                var Y_feature = this.feature_definitions_by_id[this.selected_features["y"]];

                var data = null;
                if (this.selected_tumor_type) {
                    var selected_tt = _.findWhere(this.selected_tumor_types, { "id": this.selected_tumor_type });
                    data = this.__visdata([selected_tt], X_feature.id, Y_feature.id);
                } else {
                    data = this.__visdata(this.selected_tumor_types, X_feature.id, Y_feature.id);
                }
                if (_.isEmpty(data)) {
                    console.debug("fmx-dist.__draw:no_data_found");
                    WebApp.alert(this.$el.find(".no-data-found"), 3000);

                    // TODO: Figure out how to properly clear the graph
                    _.defer(this.__init_graph);

                    return;
                }

                console.debug("fmx-dist.__draw:data=" + data.length + ":" + JSON.stringify(_.first(data) || {}));
                console.debug("fmx-dist.__draw:data=" + JSON.stringify(_.countBy(data, "tumor_type")));

                var color_by_label = "tumor_type";
                var color_by_list = _.pluck(this.selected_tumor_types, "id");
                var color_by_colors = _.pluck(this.selected_tumor_types, "color");

                var color_by_feature = this.feature_definitions_by_id[this.selected_color_by];
                if (color_by_feature && _.has(color_by_feature, "label")) {
                    color_by_label = this.selected_color_by;
                    color_by_list = _.unique(_.pluck(data, this.selected_color_by));
                    color_by_colors = colorbrewer.RdYlBu[3];
                }

                this.carveVis.colorBy({
                    label: color_by_label,
                    list: color_by_list,
                    colors: color_by_colors
                }).axisLabel({ x: X_feature.label, y: Y_feature.label })
                    .axisKey({ x: "x", y: "y" })
                    .id("sample")
                    .data(data)
                    .render();
            },

            __visdata: function (tumor_types, X_feature_id, Y_feature_id) {
                var sampleTypes = WebApp.Lookups.get("sample_types") || {};
                var data = _.map(tumor_types, function (tumor_type) {
                    var stModel = sampleTypes[tumor_type.id] || new Backbone.Model();
                    var by_sample_type = stModel.get("by_sample_type") || {};
                    var select_samples = by_sample_type[this.selected_sample_type];

                    var X_feature_by_tumor_type = this.aggregate_features_by_id[X_feature_id] || {};
                    var X_feature = X_feature_by_tumor_type[tumor_type.id] || {};

                    var Y_feature_by_tumor_type = this.aggregate_features_by_id[Y_feature_id] || {};
                    var Y_feature = Y_feature_by_tumor_type[tumor_type.id] || {};

                    var Cby_feature_by_tumor_type = this.aggregate_features_by_id[this.selected_color_by] || {};
                    var Cby_feature = Cby_feature_by_tumor_type[tumor_type.id] || {};

                    if (!_.has(X_feature, "values") || !_.has(Y_feature, "values")) return null;

                    return _.map(X_feature["values"], function (X_value, X_key) {
                        if (X_value === "NA") return null;

                        var Y_value = Y_feature["values"][X_key];
                        if (Y_value === "NA") return null;

                        if (this.selected_sample_type && _.indexOf(select_samples, X_key) < 0) return null;

                        if (_.isNumber(X_value)) X_value = parseFloat(X_value);
                        if (_.isNumber(Y_value)) Y_value = parseFloat(Y_value);

                        var datapoint = {
                            "tumor_type": tumor_type.id,
                            "sample": X_key,
                            "x": X_value,
                            "y": Y_value
                        };

                        if (this.selected_color_by && _.has(Cby_feature, "values")) {
                            var Cby_value = Cby_feature["values"][X_key];
                            if (Cby_value) {
                                datapoint[this.selected_color_by] = Cby_value;
                            }
                        }

                        return datapoint;
                    }, this);
                }, this);
                return _.compact(_.flatten(data));
            }
        });
    });
