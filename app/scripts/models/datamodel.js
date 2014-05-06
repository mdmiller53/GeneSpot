define(["jquery", "underscore", "backbone"],
    function ($, _, Backbone) {
        return Backbone.Model.extend({
            "modelspecs_by_datamodel_uri": {},

            initialize: function () {
                _.bindAll(this, "fetch", "after_fetch", "find_modelspecs", "pretty_print");
            },

            fetch: function (options) {
                return Backbone.Model.prototype.fetch.call(this, _.extend(options, { "success": this.after_fetch }));
            },

            after_fetch: function () {
                _.each(this.attributes, function (item, key) {
                    _.each(item, function (domain_item, domain_key) {
                        // define datamodel_uri; accumulate model_specs
                        if (domain_item["by_tumor_type"]) {
                            this.modelspecs_by_datamodel_uri[key + "/" + domain_key] = domain_item;
                        } else {
                            _.each(domain_item["catalog"], function (model_spec, catalog_key) {
                                this.modelspecs_by_datamodel_uri[key + "/" + domain_key + "/" + catalog_key] = model_spec;
                            }, this);
                        }

                        // populate URL
                        _.each(domain_item["catalog"], function (model_spec) {
                            if (!model_spec["url"]) model_spec["url"] = "svc/" + model_spec["service"];
                        }, this);
                    }, this);
                }, this);

                _.defer(this.pretty_print);
                WebApp.Events.trigger("webapp:ready:datamodel");
            },

            find_modelspecs: function (datamodel_uri) {
                var modelspecs = this.modelspecs_by_datamodel_uri[datamodel_uri];
                if (!modelspecs) return null;

                if (modelspecs["by_tumor_type"]) {
                    var cleanspecs_by_tumor_type = {};
                    var modelspecs_by_tumor_type = _.groupBy(modelspecs["catalog"], modelspecs["by_tumor_type"]);
                    _.each(modelspecs_by_tumor_type, function (modelspec_group, tumor_type) {
                        // grab active modelspec
                        if (modelspec_group.length > 1) {
                            var active_spec = _.find(modelspec_group, function (model_spec_item) {
                                return model_spec_item["active"];
                            });
                            cleanspecs_by_tumor_type[tumor_type] = _.extend({}, active_spec);
                        } else {
                            cleanspecs_by_tumor_type[tumor_type] = _.extend({}, _.first(modelspec_group));
                        }
                    });
                    return { "by_tumor_type": cleanspecs_by_tumor_type };
                }
                return { "single": _.extend({}, modelspecs) };
            },

            list_modelspecs: function() {
                var model_specs = _.map(_.values(this.modelspecs_by_datamodel_uri), function(model_spec, key) {
                    if (_.has(model_spec, "url")) {
                        return _.extend({ "id": key }, model_spec);
                    }
                    if (_.has(model_spec, "catalog")) {
                        return _.map(model_spec["catalog"], function(catalog_item, key) {
                            return _.extend({ "id": key }, catalog_item);
                        }, this);
                    }
                    return null;
                }, this);
                return _.compact(_.flatten(model_specs));
            },

            pretty_print: function () {
                console.log("datamodel [Dynamic Data Model Directory]");
                _.each(this.modelspecs_by_datamodel_uri, function (model_spec, datamodel_uri) {
                    console.log("---------------------------------------------");
                    if (model_spec["by_tumor_type"]) {
                        var by_tumor_type_key = model_spec["by_tumor_type"];
                        console.log("-> " + datamodel_uri + ":" + by_tumor_type_key);
                        _.each(model_spec["catalog"], function (mspec) {
                            console.log(" tumor_type : " + mspec[by_tumor_type_key]);
                            console.log("        url : " + mspec.url);
                            if (mspec.model) {
                                console.log("      model : " + mspec.model);
                            }
                            if (_.has(mspec, "active")) {
                                console.log("     active : " + mspec.active);
                            }
                        });
                    } else {
                        console.log("-> " + datamodel_uri);
                        console.log("        url : " + model_spec.url);
                        if (model_spec.model) {
                            console.log("      model : " + model_spec.model);
                        }
                        if (_.has(model_spec, "active")) {
                            console.log("     active : " + model_spec.active);
                        }
                        if (by_tumor_type_key) {
                            console.log(" tumor_type : " + model_spec[by_tumor_type_key]);
                        }
                    }
                });
                console.log("---------------------------------------------");
            }
        });
    });