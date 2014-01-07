define(["jquery", "underscore", "backbone"],
    function ($, _, Backbone) {
        return Backbone.Model.extend({

            initialize: function (options) {
                _.extend(this, options);
            },

            parse: function (data) {
                this.set("items", data.items);

                if (_.isEmpty(data.items)) {
                    return { "ROWS": [], "COLUMNS": [], "DATA": [] };
                }

                var itemsByTumorType = _.groupBy(data.items, "cancer");
                var dataByTumorType = {};
                _.each(itemsByTumorType, function (items, tumor_type) {
                    if (_.isEmpty(data.items)) {
                        dataByTumorType[tumor_type] = { "ROWS": [], "COLUMNS": [], "DATA": [] };
                    } else {
                        var ROWS = _.pluck(items, "gene");
                        var COLUMNS = _.pluck(items[0].values, "id");
                        var coldict = {};
                        _.each(COLUMNS, function (col, idx) {
                            coldict[col] = idx;
                        });

                        var DATA = _.map(items, function (data_item) {
                            var row_array = [];
                            _.each(data_item.values, function (value_obj) {
                                row_array[coldict[value_obj.id]] = value_obj.v;
                            });
                            return row_array;
                        });
                        dataByTumorType[tumor_type] = { "ROWS": ROWS, "COLUMNS": COLUMNS, "DATA": DATA };
                    }
                });

                return { "BY_TUMOR_TYPE": dataByTumorType };
            }
        });
    });
