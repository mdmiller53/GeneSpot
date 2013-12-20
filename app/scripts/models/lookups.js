define(["jquery", "underscore", "backbone"],
    function ($, _, Backbone) {

        return Backbone.Model.extend({
            initialize: function () {
                _.bindAll(this, "fetch", "after_fetch", "fetch_lookups");
            },

            fetch: function (options) {
                return Backbone.Model.prototype.fetch.call(this, _.extend(options, { "success": this.after_fetch }));
            },

            after_fetch: function () {
                var m = new Backbone.Model();
                WebApp.Lookups.set("tumor_types", m);
                m.fetch({
                    "url": "configurations/tumor_types.json",
                    "success": this.fetch_lookups
                });
            },

            fetch_lookups: function () {
                var lookups = this.get("lookups");
                var lookupsReadyFn = _.after(_.keys(lookups).length - 1, function () {
                    WebApp.Events.trigger("webapp:ready:lookups");
                });

                _.each(lookups, function (lookup, key) {
                    console.log("webapp:lookups:" + key + ":loading...");
                    this.set(key, {});

                    if (_.has(lookup, "tumor_type_source")) {
                        var tumor_type_list = _.pluck(WebApp.Lookups.get("tumor_types").get("items"), "id");
                        var completeFn = _.after(tumor_type_list.length, lookupsReadyFn);
                        var lookup_obj = this.get(key);

                        var callbackFn = function () {
                            var tumor_type = this.get("tumor_type");
                            var items = this.get("items");
                            console.log("lookups:" + key + ":complete[" + tumor_type + "," + items.length + "]");
                            lookup_obj[tumor_type] = items;
                            completeFn();
                        };

                        var models = WebApp.Datamodel.load_datasources({
                            "source": lookup["tumor_type_source"]
                        }, tumor_type_list, _.extend(lookup, { "callback": callbackFn }));
                        this.set(key, models["source"]);

                    } else if (_.has(lookup, "source")) {
                        var callbackFn = function() {
                            var items = this.get("items");
                            console.log("lookups:" + key + ":complete[" + items.length + "]");
                            lookupsReadyFn();
                        };
                        var models = WebApp.Datamodel.load_datasources({
                            "source": lookup["source"]
                        }, [], _.extend(lookup, { "callback": callbackFn }));
                        this.set(key, models["source"]);

                    } else if (_.has(lookup, "url")) {
                        var lookupModel = new Backbone.Model();
                        if (_.has(lookup, "model")) {
                            var M = WebApp.Models[lookup["model"]];
                            if (M) lookupModel = new M({});
                        }
                        this.set(key, lookupModel);
                        lookupModel.fetch(_.extend(lookup, { "success": lookupsReadyFn, "error": lookupsReadyFn }));
                    }
                }, this);
            }
        });

    });