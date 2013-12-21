define(["jquery", "underscore", "backbone"],
    function ($, _, Backbone) {
        return Backbone.Model.extend({
            initialize: function () {
                _.bindAll(this, "fetch", "after_fetch");
            },

            fetch: function (options) {
                var successFn = (options["success"]) ? _.wrap(options["success"], this.after_fetch): this.after_fetch;
                return Backbone.Model.prototype.fetch.call(this, _.extend(options, { "success": successFn }));
            },

            after_fetch: function (callbackFn) {
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

                if (_.isFunction(callbackFn)) callbackFn();
            }
        });
    });
