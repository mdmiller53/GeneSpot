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
                var lookupsReadyFn = _.after(_.keys(lookups).length, function () {
                    WebApp.Events.trigger("webapp:ready:lookups");
                });

                var _this = this;
                _.each(lookups, function (lookup, key) {
                    console.log("webapp:lookups:" + key + ":loading...");

                    var callbackFn = function () {
                        console.log("webapp:lookups:" + key + ":loaded");
                        lookupsReadyFn();
                    };

                    if (_.has(lookup, "datamodel")) {
                        var modelspecs = WebApp.Datamodel.modelspecs_by_datamodel_uri[lookup["datamodel"]];
                        if (modelspecs["by_tumor_type"]) {
                            var by_tumor_type = {};
                            _this.set(key, by_tumor_type);

                            var tumor_type_list = _.keys(_.groupBy(modelspecs["catalog"], modelspecs["by_tumor_type"]));

                            var ttCbFn = _.after(tumor_type_list.length, callbackFn);
                            var wrapperFn = function (model) {
                                by_tumor_type[model.get("tumor_type")] = model;
                                ttCbFn();
                            };

                            WebApp.Datamodel.fetch_by_datamodel_uri(lookup["datamodel"], _.extend(lookup, { "callback": wrapperFn }));
                        }

                    } else if (_.has(lookup, "url")) {
                        var wrapperFn = function(model) {
                            _this.set(key, model);
                            callbackFn(model);
                        };

                        WebApp.Datamodel.fetch_by_modelspec(lookup, _.extend(lookup, { "callback": wrapperFn }));
                    }
                });
            }
        });

    });