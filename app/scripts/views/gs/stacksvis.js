define(["jquery", "underscore", "backbone", "hbs!templates/gs/stacksvis_simpler", "hbs!templates/line_item", "stacksvis", "colorbrewer"],
    function ($, _, Backbone, StacksVisTpl, LineItemTpl) {
        return Backbone.View.extend({
            "annotations": new Backbone.Model(),

            "initialize": function (options) {
                console.log("stacksvis.initialize");

                _.bindAll(this, "renderView", "renderGraph", "getColumnModel");

                if (this.options.annotations) {
                    var parts = this.options.annotations.split("/");
                    var annotations_url = "svc/" + WebApp.Datamodel.get(parts[0])[parts[1]]["catalog"][parts[2]]["service"];
                    this.annotations.fetch({
                        "url": annotations_url,
                        "async": false,
                        "dataType": "json",
                        "traditional": true,
                        "data": {
                            "gene": this.options.genes,
                            "cancer": this.options.cancers
                        }
                    });
                }

                this.model.on("load", this.renderView);
            },

            "renderView": function () {
                var items_by_cancer = _.groupBy(this.model.get("items"), "cancer");
                var annotations_by_tumor_types = _.groupBy(this.annotations.get("items"), "cancer");
                var items_by_tumor_type = _.map(items_by_cancer, function (items, key) {
                    var annotations_by_genes = _.groupBy(annotations_by_tumor_types[key], "gene");
                    var annotated_items = _.map(items, function (item) {
                        if (item.values) {
                            item.samples = {
                                numberOf: item.values.length,
                                percentOf: item.values.length
                            }
                            item.deletions = {
                                numberOf: item.values.length,
                                percentOf: item.values.length
                            }
                            item.gains = {
                                numberOf: item.values.length,
                                percentOf: item.values.length
                            }
                            item.mutations = {
                                numberOf: item.values.length,
                                percentOf: item.values.length
                            }
                        }

                        var annotations_by_gene = annotations_by_genes[item.gene];
                        if (annotations_by_gene) return _.extend(annotations_by_gene[0], item);
                    }, this);
                    return { "tumor_type": key, "items": _.compact(annotated_items), "numberOfItems": annotated_items.length };
                }, this);

                this.$el.html(StacksVisTpl({ "id": Math.floor(Math.random() * 1000), "items_by_tumor_type": items_by_tumor_type }));
                _.each(_.pluck(items_by_tumor_type, "tumor_type"), function(tumor_type) {
                    this.renderGraph(tumor_type, this.$el.find(".heatmap-" + tumor_type));
                }, this);
            },

            "renderGraph": function (tumor_type, visEl) {
                var ttModel = this.model.get("BY_TUMOR_TYPE")[tumor_type];
                if (_.isEmpty(ttModel.ROWS)) return;
                if (_.isEmpty(ttModel.COLUMNS)) return;
                if (_.isEmpty(ttModel.DATA)) return;

                this.rowLabels = this.options.genes;

                var columns_by_cluster = this.getColumnModel(ttModel);
                var data = {};
                var cbscale = colorbrewer.RdYlBu[5];

                var gene_row_items = {};
                _.each(this.rowLabels, function (rowLabel) {
                    gene_row_items[rowLabel] = "#stacksvis-row-" + tumor_type + "-" + rowLabel;

                    var row_idx = ttModel.ROWS.indexOf(rowLabel.toLowerCase());
                    _.each(ttModel.DATA[row_idx], function (cell, cellIdx) {
                        if (_.isString(cell.orig)) cell.orig = cell.orig.trim();
                        var columnLabel = ttModel.COLUMNS[cellIdx].trim();
                        if (!data[columnLabel]) data[columnLabel] = {};
                        data[columnLabel][rowLabel] = { "value": cell.value, "row": rowLabel, "colorscale": cbscale[cell.value], "label": columnLabel + "\n" + rowLabel + "\n" + cell.orig };
                    }, this);
                }, this);

                var optns = {
                    "label_width": 50,
                    "vertical_padding": 1,
                    "highlight_fill": colorbrewer.RdYlGn[3][2],
                    "color_fn": function (d) {
                        return d ? d.colorscale : "white";
                    },
                    "columns_by_cluster": columns_by_cluster,
                    "cluster_labels": _.keys(columns_by_cluster),
                    "row_labels": this.rowLabels,
                    spacing: {
                        column: 1,
                        row: 1,
                        cluster: 0
                    },
                    "selectors": {
                        "row": "span3 nav s-row",
                        "heatmap": "span7 s-heatmap"
                    },
                    "row_selectors": gene_row_items
                };

                var vis = Stacksvis(visEl, optns);
                vis.draw({
                    "dimensions": {
                        "row": ttModel.ROWS,
                        "column": ttModel.COLUMNS
                    },
                    "data": ttModel.DATA
                });
            },

            "getColumnModel": function (ttModel) {
                var discretizeFn = function (val) {
                    if (_.isNumber(val)) {
                        if (val < -1.5) return 4;
                        if (val < -0.5) return 3;
                        if (val < 0.5) return 2;
                        if (val < 1.5) return 1;
                        return 0;
                    }
                    return val;
                };

                _.each(ttModel.DATA, function (outer_array, idx) {
                    ttModel.DATA[idx] = _.map(outer_array, function (x) {
                        return { "value": discretizeFn(x), "orig": x };
                    });
                });

                var unsorted_columns = [];
                _.each(ttModel.COLUMNS, function (column_name, col_idx) {
                    var column = { "name": column_name.trim(), "cluster": "_", "values": [] };
                    _.each(this.rowLabels, function (row_label) {
                        var row_idx = ttModel.ROWS.indexOf(row_label.toLowerCase());
                        var cell = ttModel.DATA[row_idx][col_idx];
                        if (_.isString(cell.orig)) {
                            cell.orig = cell.orig.trim().toLowerCase();
                        }
                        column.values.push(cell.value);
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
            }
        });
    });
