define(["jquery", "underscore", "backbone", "models/atlas/map_template", "models/atlas/view_template"],
    function ($, _, Backbone, MapTemplate, ViewTemplate) {
        return Backbone.Model.extend({
            initialize: function () {
                _.bindAll(this, "__after_fetch");
                this.set("map_templates", new Backbone.Model());
            },

            fetch: function (options) {
                var successFn = this.__after_fetch;
                if (options["success"]) {
                    successFn = _.wrap(options["success"], this.__after_fetch);
                }
                return Backbone.Model.prototype.fetch.call(this, _.extend(options, { "success": successFn }));
            },

            __after_fetch: function (callbackFn) {
                _.each(this.get("maps"), function (map) {
                    var map_template = new MapTemplate(_.extend({}, map));
                    this.get("map_templates").set(map_template.id, map_template);

                    _.each(map_template.get("views"), function (view) {
                        var view_template = new ViewTemplate(_.extend({}, view));
                        map_template.__register(view_template);

                        if (_.has(view, "datamodels")) {
                            _.each(view["datamodels"], function (datamodel, datamodel_key) {
                                this.__process_datamodel(view_template, datamodel, datamodel_key);
                            }, this);

                        } else if (_.has(view, "datamodel")) {
                            this.__process_datamodel(view_template, view["datamodel"], "datamodel");
                        }
                    }, this);
                }, this);

                if (_.isFunction(callbackFn)) callbackFn();
            },

            __process_datamodel: function (view_template, datamodel, key) {
                if (_.isString(datamodel)) {
                    var modelspecs = WebApp.Datamodel.find_modelspecs(datamodel);
                    this.__process_modelspecs(view_template, modelspecs, { "uri": datamodel, "datamodel_key": key });
                }

                if (_.isObject(datamodel)) {
                    var uri = datamodel["uri"];
                    var modelspecs = WebApp.Datamodel.find_modelspecs(uri);
                    this.__process_modelspecs(view_template, modelspecs, _.extend({ "datamodel_key": key }, datamodel));
                }
            },

            __process_modelspecs: function (view_template, modelspecs, datamodel) {
                if (_.has(modelspecs, "by_tumor_type")) {
                    _.each(modelspecs["by_tumor_type"], function (modelspec, tumor_type) {
                        this.__process_modelspec(view_template, _.extend({ "tumor_type": tumor_type }, modelspec), datamodel);
                    }, this);
                } else if (_.has(modelspecs, "single")) {
                    this.__process_modelspec(view_template, modelspecs["single"], datamodel);
                }
            },

            __process_modelspec: function (view_template, modelspec, datamodel) {
                var model_options = _.extend({}, modelspec);
                if (_.has(modelspec, "url") && _.has(datamodel, "url_suffix")) {
                    model_options["url"] = modelspec["url"] + datamodel["url_suffix"];
                }
                _.each(["base_query", "query_all_genes", "query_clinical_variables", "query_tags"], function (key) {
                    if (_.has(datamodel, key)) model_options[key] = datamodel[key];
                });

                if (_.has(modelspec, "model")) {
                    require([modelspec["model"]], function (Model) {
                        view_template.__register(datamodel["datamodel_key"], Model, model_options);
                    });
                } else {
                    view_template.__register(datamodel["datamodel_key"], Backbone.Model, model_options);
                }
            }
        });
    });
