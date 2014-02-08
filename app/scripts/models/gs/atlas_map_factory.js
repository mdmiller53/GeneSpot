define(["jquery", "underscore", "backbone"],
    function ($, _, Backbone) {
        var MapTemplate = new Backbone.Model.extend({
            initialize: function () {
                this.set("view_templates", []);
            }
        });

        var ViewTemplate = new Backbone.Model.extend({
            initialize: function () {
                _.bindAll(this, "__register");

                this.set("id", "view_template_" + Math.round(Math.random() * 10000));
                this.set("models", []);
                this.set("model_templates", new Backbone.Model());
            },

            spin: function (options) {
                var View = WebApp.Views[this.get("view")];

                var express_model = function(model_tpl) {
                    var Model = model_tpl["Model"];
                    return new Model({}, model_tpl["options"]);
                };

                if (!_.isEmpty(this.get("datamodels"))) {
                    var models = [];
                    var model_bucket = {};

                    _.each(this.keys("datamodels"), function (datamodel_key) {
                        var model_template = this.get("model_templates").get(datamodel_key);
                        if (model_template["by_tumor_type"]) {
                            model_bucket[datamodel_key] = {};
                            _.each(model_template, function(mtpl, tumor_type) {
                                if (_.has(mtpl, "tumor_type") && _.isEqual(mtpl["tumor_type"], tumor_type)) {
                                    var model = express_model(model_template[tumor_type]);
                                    model_bucket[datamodel_key][tumor_type] = model;
                                    models.push(model);
                                }
                            }, this);
                        } else {
                            var model = express_model(model_template);
                            model_bucket[datamodel_key] = model;
                            models.push(model);
                        }
                    }, this);

                    return new View(_.extend({ "all_models": models, "models": model_bucket }, this.toJSON()));
                }

                if (!_.isEmpty(this.get("datamodel"))) {
                    var model_template = this.get("model_templates").get("datamodel")
                    var model = express_model(model_template);
                    model_bucket["model"] = model;

                    return new View(_.extend({ "all_models": [model], "model": model }, this.toJSON()));
                }

                return new View(_.extend({}, this.toJSON()));
            },

            __register: function (datamodel_key, Model, model_options) {
                if (_.has(model_options, "tumor_type")) {
                    var tumor_type = model_options["tumor_type"];

                    var mtpl_tt = this.get("model_templates").get(datamodel_key);
                    if (_.isUndefined(mtpl_tt)) {
                        mtpl_tt = { "by_tumor_type": true };
                        this.get("model_templates").set(datamodel_key, mtpl_tt);
                    }

                    mtpl_tt[tumor_type] = { "Model": Model, "options": model_options };

                } else {
                    this.get("model_templates").set(datamodel_key, { "Model": Model, "options": model_options });
                }
            }
        });

        return Backbone.Model.extend({
            initialize: function () {
                _.bindAll(this, "__after_fetch");
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
                    this.set(map_template.id, map_template);

                    _.each(map_template["views"], function (view) {
                        var view_template = new ViewTemplate(_.extend({}, view));
                        map_template.get("view_templates").push(view_template);

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
                WebApp.Events.trigger("webapp:ready:atlas_map_factory");
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
                _.each(["base_query", "query_all_genes", "query_clinical_variables"], function (key) {
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
