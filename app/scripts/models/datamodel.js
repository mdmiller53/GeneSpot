define(["jquery", "underscore", "backbone"],
    function ($, _, Backbone) {

        return Backbone.Model.extend({
            initialize: function() {
                _.bindAll(this, "fetch", "after_fetch", "load_datasources", "find_catalogItem", "fetch_datasource");
            },

            fetch: function (options) {
                return Backbone.Model.prototype.fetch.call(this, _.extend(options, { "success": this.after_fetch }));
            },

            after_fetch: function () {
                console.log("datamodel [Dynamic Data Model Directory]");
                _.each(this.attributes, function (item, key) {
                    _.each(item, function (domain_item, domain_key) {
                        _.each(domain_item.catalog, function (catalog_item, catalog_key) {
                            catalog_item.url = "svc/" + catalog_item.service || "svc/" + catalog_item.uri;
                            console.log("-> " + key + "/" + domain_key + "/" + catalog_key);
                            if (domain_item.group) {
                                console.log("     group : [" + domain_item.group + "=" + catalog_item[domain_item.group] + "]");
                            }
                            if (catalog_item.model) console.log("     model : " + catalog_item.model);
                            console.log("       url : " + catalog_item.url);
                            if (_.has(catalog_item, "active")) console.log("    active : " + catalog_item.active);
                        });
                        if (_.has(domain_item, "group")) {
                            domain_item[domain_item["group"]] = _.groupBy(domain_item.catalog, domain_item["group"]);
                        }
                    });
                });
                WebApp.Events.trigger("datamodel-ready");
            },

            load_datasources: function (data_sources, tumor_type_list, options) {
                var models_by_key = {};
                _.each(data_sources, function (datamodelUri, key) {
                    if (_.isUndefined(datamodelUri)) return;

                    var catalog_item = this.find_catalogItem(datamodelUri, tumor_type_list);
                    if (_.isUndefined(catalog_item)) return;

                    if (_.has(catalog_item, "url")) {
                        var Model = WebApp.Models[catalog_item.model] || Backbone.Model;

                        var model = models_by_key[key] = new Model(options);
                        if (options.callback) model.on("load", options.callback, model);
                        this.fetch_datasource(model, catalog_item["url"], options["query"]);
                    } else {
                        models_by_key[key] = {};
                        _.each(tumor_type_list, function (tumor_type) {
                            var tt_item = catalog_item[tumor_type];
                            if (tt_item && _.has(tt_item, "url")) {
                                var tt_optns = _.extend(options, {"tumor_type": tumor_type});
                                var Model = WebApp.Models[catalog_item.model] || Backbone.Model;
                                var model = models_by_key[key][tumor_type] = new Model(tt_optns);
                                if (options.callback) model.on("load", options.callback, model);

                                var modelUrl = tt_item["url"];
                                if (_.has(options, "source_suffix")) modelUrl += options["source_suffix"];

                                this.fetch_datasource(model, modelUrl, options.query || {});
                            }
                        }, this);
                    }
                }, this)
                return models_by_key;
            },

            find_catalogItem: function (datamodelUri, tumor_types) {
                var parts = datamodelUri.split("/");
                var datamodel_root = parts[0];
                var domain_key = parts[1];
                var catalog_key = parts[2];

                if (datamodel_root && domain_key) {
                    var domain_item = this.get(datamodel_root)[domain_key];
                    if (domain_item) {
                        if (_.has(domain_item, "catalog")) {
                            if (catalog_key) return domain_item.catalog[catalog_key];
                        }

                        if (_.has(domain_item, "tumor_type")) {
                            var grouped_catalog_items = {};
                            _.each(tumor_types, function (tumor_type) {
                                var per_tumor_type = domain_item["tumor_type"][tumor_type];
                                if (!_.isArray(per_tumor_type)) return;

                                if (per_tumor_type.length > 1) {
                                    per_tumor_type = _.filter(per_tumor_type, function (ptt_item) {
                                        return _.has(ptt_item, "active") && ptt_item.active;
                                    });
                                }
                                grouped_catalog_items[tumor_type] = _.first(per_tumor_type);
                            });
                            return grouped_catalog_items;
                        }
                    }
                }
                return null;
            },

            fetch_datasource: function (model, url, query) {
                if (url) {
                    _.defer(function () {
                        model.fetch({
                            "url": url,
                            "data": query || {},
                            "traditional": true,
                            "success": function () {
                                model.trigger("load");
                            }
                        });
                    });
                } else {
                    _.defer(function () {
                        model.trigger("load");
                    });
                }
            }
        });

    });