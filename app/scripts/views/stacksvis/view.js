define(["jquery", "underscore", "backbone", "stacksvis", "models/gs/by_tumor_type",
    "hbs!templates/stacksvis/container", "hbs!templates/gs/q_values_ampdel",
    "colorbrewer", "d3"],
    function ($, _, Backbone, StacksVis, TransformModel, Tpl, QValueTpl) {
        return Backbone.View.extend({

            "events": {
                "click .global-hider": function (e) {
                    this.$el.find(".hider-target").toggle();
                },
                "click .hider": function (e) {
                    $(e.target).parents("table").find(".hider-target").toggle();
                }
            },

            "initialize": function () {
                this.options["models"]["q_value"].on("load", this.__render_q_value, this);

                _.each(this.options["models"]["copy_number"]["by_tumor_type"], function(model, tumor_type) {
                    model.on("load", function() {
                        this.__render_copy_number(tumor_type, new TransformModel(model.toJSON()));
                    }, this);
                }, this);
                _.each(this.options["models"]["mutated_samples"]["by_tumor_type"], function(model, tumor_type) {
                    model.on("load", function() {
                        this.__render_mutated_samples(tumor_type, model);
                    }, this);
                }, this);
            },

            render: function () {
                this.$el.html(Tpl({
                    "id": Math.floor(Math.random() * 1000),
                    "tumor_types": WebApp.UserPreferences.get("selected_tumor_types"),
                    "genes": this.options["genes"]
                }));

                this.$el.find(".tooltips").tooltip({ "animation": false, "trigger": "click hover focus", "placement": "right" });
                return this;
            },

            __render_q_value: function () {
                if (!this.options.models["q_value"].get("items")) return;

                var items_per_tumor_type_lower = _.groupBy(this.options.models["q_value"].get("items"), "cancer");
                var items_per_tumor_type = {};
                _.each(items_per_tumor_type_lower, function (items, lower) {
                    items_per_tumor_type[lower.toUpperCase()] = items;
                });

                _.each(WebApp.UserPreferences.get("selected_tumor_types"), function (tumor_type_obj) {
                    var items_per_gene = _.groupBy(items_per_tumor_type[tumor_type_obj.id], "gene");
                    _.each(this.options["genes"], function (gene) {
                        var gene_items = items_per_gene[gene];
                        if (!gene_items || !_.isArray(gene_items)) return;

                        _.each(gene_items, function (gene_item) {
                            gene_item[gene_item["type"]] = true; // binarize for template use
                        });

                        var $qvalues = this.$el.find(".stats-" + tumor_type_obj["id"] + "-" + gene).show();
                        $qvalues.find(".q-values").html(QValueTpl({"items": _.sortBy(gene_items, "type")}));
                        $qvalues.find(".tooltips").tooltip({ "animation": false, "trigger": "click hover focus", "placement": "top" });
                    }, this);

                }, this);
            },

            __render_copy_number: function (tumor_type, model) {
                this.rowLabels = this.options.genes;

                var ROWS = model.get("ROWS");
                if (_.isEmpty(ROWS)) return;

                var COLUMNS = model.get("COLUMNS");
                if (_.isEmpty(COLUMNS)) return;

                var DATA = model.get("DATA");
                if (_.isEmpty(DATA)) return;

                var columns_by_cluster = this.__column_model(model);
                var data = {};
                var cbscale = colorbrewer.RdYlBu[5];

                var gene_row_items = {};
                _.each(this.rowLabels, function (rowLabel) {
                    var $statsEl = this.$el.find(".stats-" + tumor_type + "-" + rowLabel).show();

                    gene_row_items[rowLabel] = $statsEl.find(".stats-hm").selector;

                    var row_idx = ROWS.indexOf(rowLabel);
                    if (row_idx < 0) return;

                    _.each(DATA[row_idx], function (cell, cellIdx) {
                        if (_.isString(cell.orig)) cell.orig = cell.orig.trim();
                        var columnLabel = COLUMNS[cellIdx].trim();
                        if (!data[columnLabel]) data[columnLabel] = {};
                        data[columnLabel][rowLabel] = {
                            "value": cell["value"],
                            "row": rowLabel,
                            "colorscale": cbscale[cell["value"]],
                            "label": columnLabel + "\n" + rowLabel + "\n" + cell.orig
                        };
                    }, this);

                    var counts = _.countBy(DATA[row_idx], "value");
                    var totals = DATA[row_idx].length;
                    var lookupPercentage = function (idx) {
                        var count = counts[idx];
                        if (count) return (100 * count / totals).toFixed(1) + "%";
                        return "";
                    };
                    $statsEl.find(".stats-samples").html(totals);
                    $statsEl.find(".stats-0").html(lookupPercentage("0"));
                    $statsEl.find(".stats-1").html(lookupPercentage("1"));
                    $statsEl.find(".stats-2").html(lookupPercentage("2"));
                    $statsEl.find(".stats-3").html(lookupPercentage("3"));
                    $statsEl.find(".stats-4").html(lookupPercentage("4"));
                }, this);

                var vis = new StacksVis(this.$el, {
                    "bar_width": 0.75,
                    "vertical_padding": 1,
                    "highlight_fill": colorbrewer.RdYlGn[3][2],
                    "columns_by_cluster": columns_by_cluster,
                    "row_labels": this.rowLabels,
                    "row_selectors": gene_row_items
                });
                vis.draw({ "data": data });
            },

            __render_mutated_samples: function(tumor_type, model) {
                _.each(model.get("items"), function(item) {
                    var gene = item["gene"];
                    var $mutEl = this.$el.find(".stats-" + tumor_type + "-" + gene).show();
                    $mutEl.find(".stats-mutations").html(item["numberOf"]);
                }, this);
            },

            __column_model: function (model) {
                var ROWS = model.get("ROWS") || [];
                var COLUMNS = model.get("COLUMNS") || [];
                var DATA = model.get("DATA") || [];

                _.each(DATA, function (outer_array, idx) {
                    DATA[idx] = _.map(outer_array, function (x) {
                        return { "value": this.__discretize(x), "orig": x };
                    }, this);
                }, this);

                var unsorted_columns = [];
                _.each(COLUMNS, function (column_name, col_idx) {
                    var column = { "name": column_name.trim(), "cluster": "_", "values": [] };
                    _.each(this.rowLabels, function (row_label) {
                        var row_idx = ROWS.indexOf(row_label);
                        if (row_idx < 0) return;

                        var cell = DATA[row_idx][col_idx];
                        if (_.isString(cell["orig"])) cell["orig"] = cell["orig"].trim();
                        column["values"].push(cell["value"]);
                    }, this);
                    unsorted_columns.push(column);
                }, this);

                var sorted_columns = _.sortBy(unsorted_columns, "values");
                var grouped_columns = _.groupBy(sorted_columns, "cluster");

                var columns_by_cluster = {};
                _.each(grouped_columns, function (values, key) {
                    columns_by_cluster[key] = [];
                    _.each(values, function (value) {
                        columns_by_cluster[key].push(value.name);
                    })
                });

                return columns_by_cluster;
            },

            __discretize: function (val) {
                if (_.isNumber(val)) {
                    if (val < -1.5) return 4; // homozygous loss (less than -1.5)
                    if (val < -0.5) return 3; // heterozygous loss (between -0.5 and -1.4999)
                    if (val < 0.5) return 2; // diploid (between 0.5 and -0.4999)
                    if (val < 1.5) return 1; // gain (between 1.5 and 0.49999)
                    return 0; // amplification // greater than 1.5
                }
                return val;
            }
        });
    });
