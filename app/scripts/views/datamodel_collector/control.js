define(["jquery", "underscore", "backbone",
    "views/datamodel_collector/itemizer", "hbs!templates/datamodel_collector/container"],
    function ($, _, Backbone, Itemizer, Tpl) {
        return Backbone.View.extend({
            events: {
                "click .create-collector": function() {
                    this.$el.find(".alert").hide();

                    var newname = this.$el.find(".new-collector-name").val();
                    this.$el.find(".new-collector-name").val("");

                    if (_.isEmpty(newname)) {
                        WebApp.alert(this.$el.find(".invalid-collector-name"), 3000);
                        return;
                    }

                    var found = _.find(WebApp.LocalSession.get("collectors"), function(c_model) {
                        if (_.isEqual(c_model.get("label"), newname)) {
                            WebApp.alert(this.$el.find(".existing-collector-name"), 3000);
                            return session_model.get("label");
                        }
                    }, this);
                    if (found) return;

                    var promise = WebApp.LocalSession.get("collector").save(new Backbone.Model({ "label": newname, "collected": [] }) );
                    promise.always(this.render, this);
                    promise.fail(function() {
                        WebApp.alert(this.$el.find(".something-went-wrong-pls-try-again"), 3000);
                    }, this);

                    WebApp.alert(this.$el.find(".collector-added-success"));
                },

                "click .remove-collector": function(e) {
                    var promise = WebApp.LocalSession.delete("collectors", $(e.target).data("id"));
                    promise.always(this.render)
                }
            },

            initialize: function() {
                _.bindAll(this, "render");
                WebApp.LocalSession.on("collector:change", this.render);
            },

            render: function() {
                var datamodels = _.map(WebApp.Datamodel.get("datamodel"), function(datamodel_group, datamodel_key) {
                    var items = _.map(datamodel_group.catalog, function(item, item_key) {
                        return _.extend({ "item_key": item_key, "datamodel_key": datamodel_key }, item);
                    }, this);

                    var tumorTypes = _.compact(_.pluck(items, "tumor_type"));
                    if (!_.isEmpty(tumorTypes)) {
                        var by_tumor_type = _.map(_.groupBy(items, "tumor_type"), function(tumor_type_items, tumor_type_key) {
                            return { "tumor_type": tumor_type_key, "items": tumor_type_items };
                        });
                        return {
                            "datamodel_key": datamodel_key,
                            "label": datamodel_group["label"],
                            "by_tumor_type": by_tumor_type,
                            "numberOfItems": tumorTypes.length
                        };
                    }
                    return {
                        "datamodel_key": datamodel_key,
                        "label": datamodel_group["label"],
                        "items": _.sortBy(items, "datamodel"),
                        "numberOfItems": items.length
                    };
                }, this);

                var collector = WebApp.LocalSession.get("collector");
                if (_.isUndefined(collector)) {
                    this.$el.html(Tpl({"datamodels":datamodels}));
                    return this;
                }

                var collectors = _.sortBy(collector.toJSON(), "sort");
                this.$el.html(Tpl({ "collectors": collectors,  "datamodels": datamodels }));

                _.each(collector.get("collected"), function(dmc_model) {
                    var $listEl = this.$el.find("#tab-collectors-" + dmc_model.get("id")).find(".collected-items");
                    var itemizer = new Itemizer({ "model": dmc_model });
                    $listEl.append(itemizer.render().el);
                }, this);

                return this;
            }
        });
    });
