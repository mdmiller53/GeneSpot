define(["jquery", "underscore", "backbone", "hbs!templates/gs/stacksvis_simpler", "stacksvis", "colorbrewer"],
    function ($, _, Backbone, StacksVisTpl) {
        return Backbone.View.extend({

            "initialize": function (options) {
                _.bindAll(this, "renderView", "renderGraph", "getColumnModel");

                this.model.on("load", this.renderView);
            },

            "events": {
                "click .global-hider": function(e) {
                    this.$el.find(".hider-target").toggle();
                },
                "click .hider": function(e) {
                    $(e.target).parents("table").find(".hider-target").toggle();
                }
            },

            "renderView": function () {
                var items_by_cancer = _.groupBy(this.model.get("items"), "cancer");
                var items_by_tumor_type = _.map(items_by_cancer, function (items, cancer) {
                    var annotated_items = _.map(items, function (item) {
                        return _.extend(item, {
                            "samples": {
                                "numberOf": item.values.length,
                                "percentOf": item.values.length
                            },
                            "deletions": {
                                "numberOf": item.values.length,
                                "percentOf": item.values.length
                            },
                            "gains": {
                                "numberOf": item.values.length,
                                "percentOf": item.values.length
                            },
                            "mutations": {
                                "numberOf": item.values.length,
                                "percentOf": item.values.length
                            }
                        })
                    });

                    return {
                        "tumor_type": cancer,
                        "items": _.sortBy(annotated_items, function(item) {
                            return this.options.genes.indexOf(item["gene"]);
                        }, this)
                    }
                }, this);

                this.$el.html(StacksVisTpl({ "id": Math.floor(Math.random() * 1000), "items_by_tumor_type": items_by_tumor_type }));
                this.$el.find(".tooltips").tooltip({ "animation": false, "trigger": "click hover focus", "placement": "bottom" });
                _.each(_.pluck(items_by_tumor_type, "tumor_type"), this.renderGraph, this);
            },

            "renderGraph": function (tumor_type) {
                var ttModel = this.model.get("BY_TUMOR_TYPE")[tumor_type];
                if (_.isEmpty(ttModel.ROWS)) return;
                if (_.isEmpty(ttModel.COLUMNS)) return;
                if (_.isEmpty(ttModel.DATA)) return;

                this.rowLabels = _.map(this.options.genes, function (g) {
                    return g.toLowerCase(); // TODO: not good
                });

                var columns_by_cluster = this.getColumnModel(ttModel);
                var data = {};
                var cbscale = colorbrewer.RdYlBu[5];

                var gene_row_items = {};
                _.each(this.rowLabels, function (rowLabel) {
                    var $statsEl = this.$el.find(".stats-" + tumor_type + "-" + rowLabel);

                    gene_row_items[rowLabel] = $statsEl.find(".stats-hm").selector;

                    var row_idx = ttModel.ROWS.indexOf(rowLabel);
                    _.each(ttModel.DATA[row_idx], function (cell, cellIdx) {
                        if (_.isString(cell.orig)) cell.orig = cell.orig.trim();
                        var columnLabel = ttModel.COLUMNS[cellIdx].trim();
                        if (!data[columnLabel]) data[columnLabel] = {};
                        data[columnLabel][rowLabel] = {
                            "value": cell.value,
                            "row": rowLabel,
                            "colorscale": cbscale[cell.value],
                            "label": columnLabel + "\n" + rowLabel + "\n" + cell.orig
                        };
                    }, this);

                    var counts = _.countBy(ttModel.DATA[row_idx], "value");
                    var totals = ttModel.DATA[row_idx].length;
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

                var vis = Stacksvis(this.$el, {
                    "vertical_padding": 1,
                    "highlight_fill": colorbrewer.RdYlGn[3][2],
                    "columns_by_cluster": columns_by_cluster,
                    "row_labels": this.rowLabels,
                    "row_selectors": gene_row_items
                });
                vis.draw({ "data": data });
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
                        var row_idx = ttModel.ROWS.indexOf(row_label);
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
