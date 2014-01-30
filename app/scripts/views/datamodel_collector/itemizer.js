define([ "jquery", "underscore", "backbone", "hbs!templates/datamodel_collector/item" ],
    function ($, _, Backbone, DatamodelItemTpl) {
        return Backbone.View.extend({
            events: {
                "click .item-remover": function (e) {
                    $(e.target).parents("li.datamodel-item").remove();
                    _.defer(this.__update);
                }
            },

            initialize: function () {
                _.bindAll(this, "__reorder", "__update");
                this.model.on("collected:change", this.render, this);
            },

            render: function() {
                this.$el.empty();
                _.each(this.model.get("collected"), function (datamodel) {
                    this.$el.append(DatamodelItemTpl(_.extend({ "a_class": "datamodel-item" }, datamodel.toJSON())));
                }, this);
                this.$el.sortable({ "update": _.defer(this.__update), "handle": "button", "cancel": "" });
                // TODO: Add drag and droppable
                return this;
            },

            __update: function () {
                this.model.set("collected", _.map(this.$el.find(".datamodel-item"), function (link) {
                    return _.extend({}, $(link).data());
                }));
            }
        });
    });