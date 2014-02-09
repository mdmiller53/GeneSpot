define(["jquery", "underscore", "backbone", "hbs!templates/data_grid"],
    function ($, _, Backbone, Template) {
        return Backbone.View.extend({
            "dimensions": {
                "pivot": "",
                "values": "",
                "groupBy": ""
            },

            "styles": {
                "plain": "plain-cell",
                "highlight": "highlight-cell"
            },

            initialize: function (options) {
                _.extend(this, options);
                _.bindAll(this, "processData");

                this.model.on("load", this.processData);
            },

            processData: function () {
                var items = _.map(this.model.get("items"), function (item) {
                    item["cell_value"] = item[this.dimensions["values"]];
                    item["cell_cls"] = this.styles["plain"];
                    if (item["cell_value"]) {
                        _.each(this.options["genes"], function (g) {
                            if (_.isEqual(g.toLowerCase(), item["cell_value"].toLowerCase())) {
                                item["cell_cls"] = this.styles["highlight"];
                            }
                        }, this);
                    }
                    return item;
                }, this);

                var headers = _.map(_.uniq(_.pluck(items, this.dimensions["pivot"])), function (h) {
                    return { "id": h };
                });

                var upperCaseHeaders = _.map(headers, function (header) {
                    // TODO : reduce the need for this?
                    if (header && header.id) return { "id": header.id.toUpperCase() };
                    return header;
                });

                var rows = _.map(_.groupBy(items, this.dimensions["groupBy"]), function (sorted_data, row_label) {
                    var sorted_by_column = _.groupBy(sorted_data, this.dimensions["pivot"]);
                    var values = _.map(headers, function (header) {
                        if (sorted_by_column[header.id]) return sorted_by_column[header.id][0];
                        return [];
                    });
                    return { "label": row_label, "values": values };
                }, this);

                this.$el.html(Template({ "headers": upperCaseHeaders, "rows": rows }));
            }
        });
    });
