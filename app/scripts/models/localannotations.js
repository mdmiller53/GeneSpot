define(["jquery", "underscore", "backbone", "models/localsync", "d3"],
    function ($, _, Backbone, LocalSyncModel, d3) {
        return LocalSyncModel.extend({
            initialize: function(options) {
                _.bindAll(this, "after_sync");
                this.set("storage_key", options["storage_key"]);
            },

            after_sync: function() {
                var data = this.get("data");
                if (!data) {
                    console.log("localannotations:after_synch:no_data");
                    return;
                }

                var itemsById = {};
                _.each(d3.tsv.parse(data), function (row) {
                    if (row["ID"]) {
                        var item = {};
                        _.each(_.keys(row), function (k) {
                            item[k.toLowerCase()] = row[k];
                        });
                        itemsById[item.id] = item;
                    }
                });

                this.set("itemsById", itemsById);
                this.set("keys", _.keys(itemsById));
            },

            fetch:function (options) {
                return LocalSyncModel.prototype.fetch.call(this, _.extend({}, options, {dataType:"text"}));
            }
        });

    });