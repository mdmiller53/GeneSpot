define(["jquery", "underscore", "backbone"],
    function ($, _, Backbone) {
        return Backbone.Model.extend({
            initialize: function(attributes, options) {
                this.set(this.parse(attributes));
            },

            parse: function (data) {
                var items = data["items"];
                this.set("items", items);

                if (_.isEmpty(items)) return { "ROWS": [], "COLUMNS": [], "DATA": [] };

                var ROWS = _.pluck(items, "gene");
                var COLUMNS = _.keys(_.first(items)["values"]);
                var coldict = {};
                _.each(COLUMNS, function (col, idx) {
                    coldict[col] = idx;
                });

                var DATA = _.map(items, function (data_item) {
                    var row_array = [];
                    _.each(data_item["values"], function (value, id) {
                        row_array[coldict[id]] = value;
                    });
                    return row_array;
                });

                return { "ROWS": ROWS, "COLUMNS": COLUMNS, "DATA": DATA  };
            }
        });
    });
