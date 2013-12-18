define(["jquery", "underscore", "backbone"],
    function ($, _, Backbone) {

        return Backbone.Model.extend({
            initialize: function () {
                _.bindAll(this, "fetch", "after_fetch");
            },

            fetch: function (options) {
                return Backbone.Model.prototype.fetch.call(this, _.extend(options, { "success": this.after_fetch }));
            },

            after_fetch: function () {
                _.each(this.get("prerequisites"), function(url, key) {
                    var _this = this;
                    var m = new Backbone.Model();
                    m.fetch({
                        "url": url,
                        "async": true,
                        "success": function(json) {
                            _this.set(key, json);
                        }
                    });
                }, this);

                var lookups = this.get("lookups");
                var lookupsReadyFn = _.after(_.keys(lookups).length, function () {
                    WebApp.Events.trigger("webapp:ready:lookups");
                });

                _.each(lookups, function (lookup, key) {
                    console.log("webapp:lookups:" + key + ":loading...");
                    this.set(key, {});

                    if (_.has(lookup, "source")) {
                        var tumor_type_list = ["BRCA"]; // TODO
                        var completeFn = _.after(tumor_type_list.length, lookupsReadyFn);
                        var lookup_obj = this.get(key);

                        var models = WebApp.Datamodel.load_datasources({"source": lookup["source"]}, tumor_type_list, {
                            "source_suffix": lookup["source_suffix"],
                            "query": lookup.query,
                            "callback": function () {
                                var tumor_type = this.get("tumor_type");
                                var items = this.get("items");
                                console.log("lookups:" + key + ":complete[" + tumor_type + "," + items.length + "]");
                                lookup_obj[tumor_type] = items;
                                completeFn();
                            }
                        });

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