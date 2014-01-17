define(["jquery", "underscore", "backbone", "models/localsync"],
    function ($, _, Backbone, LocalSyncModel) {
        return LocalSyncModel.extend({
            initialize: function (options) {
                _.bindAll(this, "after_sync");
                this.set("storage_key", options["storage_key"] + ":" + this.get(options["storage_suffix"]));
            },

            after_sync: function () {
                var by_sample_type = {};
                _.each(this.get("items"), function(item) {
                    if (item.values && !_.isEmpty(item.values)) {
                        _.each(item.values, function(sample_type, sample_id) {
                            var samples = by_sample_type[sample_type];
                            if (!samples) samples = by_sample_type[sample_type] = [];
                            samples.push(sample_id);
                        }, this);
                    }
                }, this);

                this.set("by_sample_type", by_sample_type);
            }
        });
    });
