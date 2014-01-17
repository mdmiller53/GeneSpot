define(["jquery", "underscore", "backbone", "models/localsync"],
    function ($, _, Backbone, LocalSyncModel) {

        return Backbone.Model.extend({
            initialize: function (options) {
                _.bindAll(this, "fetch", "after_fetch", "fetch_lookups");
            },

            fetch: function (options) {
                return Backbone.Model.prototype.fetch.call(this, _.extend(options, { "success": this.after_fetch }));
            },

            after_fetch: function () {
                var m = new LocalSyncModel({ "storage_key": "tumor_types" });
                WebApp.Lookups.set("tumor_types", m);
                m.fetch({
                    "url": "configurations/tumor_types.json",
                    "success": this.fetch_lookups
                });
            },

            fetch_lookups: function () {
                var lookups = this.get("lookups");
                var afterAllLookupsFn = _.after(_.keys(lookups).length, function () {
                    WebApp.Events.trigger("webapp:ready:lookups");
                });

                _.each(lookups, function (lookup, key) {
                    console.log("webapp:lookups:" + key + ":loading...");
                    var lookup_spec = _.extend({ "lookup_key": key }, lookup);

                    var _this = this;
                    var afterLookupFn = function (model) {
                        console.log("webapp:lookups:" + key + ":loaded");
                        _this.set(key, model);
                        afterAllLookupsFn();
                    };

                    if (_.has(lookup_spec, "datamodel")) {
                        var modelspecs = WebApp.Datamodel.find_modelspecs(lookup_spec["datamodel"]);
                        if (modelspecs["by_tumor_type"]) {
                            var by_tumor_type = {};
                            var afterTumorTypeLookupFn = _.after(_.keys(modelspecs["by_tumor_type"]).length, function() {
                                afterLookupFn(by_tumor_type);
                            });

                            _.each(modelspecs["by_tumor_type"], function(modelspec, tumor_type) {
                                this.fetch_model(_.extend({}, modelspec, lookup_spec), function(model) {
                                    console.log("webapp:lookups:" + key + ":[" + tumor_type + "]:loaded");
                                    by_tumor_type[tumor_type] = model;
                                    afterTumorTypeLookupFn();
                                });
                            }, this);

                        } else if (modelspec["single"]) {
                            this.fetch_model(_.extend({}, modelspecs["single"], lookup_spec), afterLookupFn);
                        }

                    } else if (_.has(lookup_spec, "url")) {
                        this.fetch_model(lookup_spec, afterLookupFn);
                    }
                }, this);
            },

            fetch_model: function (options, callback) {
                var modelFetchFn = function (Model) {
                    _.defer(function() {
                        var model = new Model(options);
                        model.fetch({
                            "url": model.get("url") + (model.get("url_suffix") || ""),
                            "data": options["query"],
                            "traditional": true,
                            "success": function() {
                                callback(model);
                            }
                        });
                    });
                };

                if (options["model"]) {
                    require([options["model"]], modelFetchFn);
                } else {
                    modelFetchFn(Backbone.Model);
                }
            }
        });

    });