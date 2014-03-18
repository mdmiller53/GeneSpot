define(["jquery", "underscore", "backbone"],
    function ($, _, Backbone) {
        return Backbone.Model.extend({
            initialize: function(data, options) {
                var id_attribute = options["id_attribute"];
                var ids = _.pluck(data, id_attribute);

                var ancilliary_keys = _.without(_.keys(_.first(data)), id_attribute, "x", "y");

                var x_feature = options["features"]["x"];
                var x_row = _.pluck(data, "x");

                var y_feature = options["features"]["y"];
                var y_row = _.pluck(data, "y");

                var row_id = 1;
                var col_id = 1;
                var cell_data = [];
                var add_cells = function(head, row) {
                    cell_data.push({ "_row": row_id++, "_col": col_id, "_inputValue": head });
                    _.each(row, function(cell) {
                        cell_data.push({ "_row": row_id++, "_col": col_id, "_inputValue": cell });
                    });
                    col_id++;
                    row_id = 1;
                };

                add_cells(id_attribute, ids);
                _.each(ancilliary_keys, function(ancilliary_key) {
                    var ancilliary_row = _.pluck(data, ancilliary_key);
                    add_cells(ancilliary_key, ancilliary_row);
                }, this);
                add_cells(x_feature, x_row);
                add_cells(y_feature, y_row);

                this.set("cells", _.flatten(cell_data));
            }
        });

    });
