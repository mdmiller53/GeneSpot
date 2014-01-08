define(["jquery", "underscore", "backbone", "hbs!templates/data_grid"],
    function ($, _, Backbone, Template) {
        return Backbone.View.extend({
            "header_attribute": "cancer",
            "cell_attribute": "gene",

            initialize: function (options) {
                _.extend(this, options);
                _.bindAll(this, "processData");

                this.model.on("load", this.processData);
            },

            processData: function () {
                var items = _.map(this.model.get("items"), function (item) {
                    item["cell_value"] = item[this.cell_attribute];
                    item["cell_cls"] = "plain-cell";
                    _.each(this.genes, function (g) {
                        if (_.isEqual(g.toLowerCase(), item["cell_value"].toLowerCase())) {
                            item["cell_cls"] = "highlight-cell";
                        }
                    });
                    return item;
                }, this);

                var data = _.groupBy(items, "rank");

                var rowlabels = _.chain(items).pluck("rank").uniq().sortBy(function (d) {
                        return d;
                    }).value();

                var headers = _.map(_.uniq(_.pluck(items, this.header_attribute)), function (h) {
                    return { "id": h };
                });

                var _this = this;
                this.$el.html(Template({
                    "headers": _.map(headers, function(header) {
                        return { "id": header.id.toUpperCase() };
                    }),
                    "rows": _.map(rowlabels, function (rowlabel) {
                        var rank_data = data[rowlabel];
                        var row_data = _.groupBy(rank_data, "cancer");
                        var values = _.map(headers, function (header) {
                            if (row_data[header.id]) return row_data[header.id][0];
                            return [];
                        });
                        return {
                            "label": rowlabel,
                            "values": values
                        };
                    })
                }));
            }
        });
    });
