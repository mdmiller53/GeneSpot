define(["jquery", "underscore", "backbone"],
    function ($, _, Backbone) {
        return Backbone.Model.extend({
            initialize: function () {
                _.bindAll(this, "__register");

                this.set("model_templates", new Backbone.Model());
            },

            spin: function (options) {
                var View = this.get("view_class");
                var view_id = "view_spin_" + Math.round(Math.random() * 10000);

                var express_model = function (model_tpl) {
                    var Model = model_tpl["Model"];
                    return _.extend(new Model({}, model_tpl.options), model_tpl.options);
                };

                if (!_.isEmpty(this.get("datamodels"))) {
                    var models = [];
                    var model_bucket = {};

                    _.each(_.keys(this.get("datamodels")), function (datamodel_key) {
                        var model_template = this.get("model_templates").get(datamodel_key);
                        if (model_template["by_tumor_type"]) {
                            model_bucket[datamodel_key] = { "by_tumor_type": {} };
                            _.each(model_template["by_tumor_type"], function (mtpl, tumor_type) {
                                if (!_.contains(options["tumor_types"], tumor_type)) return;

                                var model = express_model(mtpl);
                                model_bucket[datamodel_key]["by_tumor_type"][tumor_type] = model;
                                models.push(model);
                            }, this);
                        } else {
                            var model = express_model(model_template);
                            model_bucket[datamodel_key] = model;
                            models.push(model);
                        }
                    }, this);

                    return new View(_.extend({
                        "id": view_id, "all_models": models, "models": model_bucket
                    }, options, this.toJSON()));
                }

                if (!_.isEmpty(this.get("datamodel"))) {
                    var model_template = this.get("model_templates").get("datamodel");
                    var model = express_model(model_template);

                    return new View(_.extend({
                        "id": view_id, "all_models": [model], "model": model
                    }, options, this.toJSON()));
                }

                return new View(_.extend({ "id": view_id }, options, this.toJSON()));
            },

            __register: function (datamodel_key, Model, model_options) {
                if (_.has(model_options, "tumor_type")) {
                    var tumor_type = model_options["tumor_type"];

                    var mtpl_tt = this.get("model_templates").get(datamodel_key);
                    if (_.isUndefined(mtpl_tt)) {
                        mtpl_tt = { "by_tumor_type": {} };
                        this.get("model_templates").set(datamodel_key, mtpl_tt);
                    }

                    mtpl_tt["by_tumor_type"][tumor_type] = { "Model": Model, "options": model_options };

                } else {
                    this.get("model_templates").set(datamodel_key, { "Model": Model, "options": model_options });
                }
            }
        });
    });