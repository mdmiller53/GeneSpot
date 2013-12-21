define(["jquery", "underscore", "backbone"],
    function ($, _, Backbone) {
        return Backbone.Model.extend({
            "modelspecs_by_datamodel_uri": {},

            initialize: function () {
                _.bindAll(this, "fetch", "after_fetch", "fetch_datasource", "pretty_print");
                _.bindAll(this, "fetch_by_modelspec", "fetch_by_datamodel_uri");
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

            fetch_by_datamodel_uri: function (datamodel_uri, model_options) {
                if (_.isUndefined(datamodel_uri)) return;

                var model_specs = _.clone(this.modelspecs_by_datamodel_uri[datamodel_uri]);
                if (!model_specs) return;

                if (model_specs["by_tumor_type"]) {
                    var model_specs_by_tumor_type = _.groupBy(model_specs["catalog"], model_specs["by_tumor_type"]);
                    var tumor_types = model_options["tumor_types"] || _.keys(model_specs_by_tumor_type);

                    _.each(tumor_types, function (tumor_type) {
                        var model_spec_array = model_specs_by_tumor_type[tumor_type];
                        // grap active modelspec
                        if (model_spec_array.length > 1) {
                            var active_model_spec = _.find(model_spec_array, function (model_spec_item) {
                                return model_spec_item["active"];
                            });
                            model_spec_array = [active_model_spec]
                        }
                        _.each(model_spec_array, function (model_spec_item) {
                            this.fetch_by_modelspec(model_spec_item, model_options);
                        }, this);
                    }, this);
                } else {
                    this.fetch_by_modelspec(model_specs, model_options);
                }
            },

            fetch_by_modelspec: function (model_spec, options) {
                model_spec = _.extend(model_spec, options);

                var _this = this;
                var clojureFn = function (Model) {
                    var model = new Model(model_spec);
                    if (_.has(options, "url_suffix")) model.set("url", model.get("url") + options["url_suffix"]);
                    _this.fetch_datasource(model, options);
                };

                var model = options["model"] || model_spec["model"];
                if (model) {
                    require([model], clojureFn);
                } else {
                    clojureFn(Backbone.Model);
                }
            },

            fetch_datasource: function (model, options) {
                _.defer(function () {
                    var url = model.get("url") || options["url"];
                    if (url) {
                        model.fetch({
                            "url": url,
                            "data": options["query"] || {},
                            "traditional": true,
                            "success": function () {
                                if (options["callback"]) options["callback"](model);
                                model.trigger("load");
                            }
                        });
                    } else {
                        if (options["callback"]) options["callback"](model);
                        model.trigger("load");
                    }
                });
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