define([ "jquery", "underscore", "backbone", "hbs!templates/genes/item" ],
    function ($, _, Backbone, GeneItemTpl) {
        return Backbone.View.extend({
            events: {
                "click .item-remover": function (e) {
                    $(e.target).parents("li.gene-item").remove();
                    _.defer(this.__update);
                }
            },

            initialize: function () {
                _.bindAll(this, "__reorder", "__update");
                this.model.on("change:genes", this.render, this);
            },

            render: function() {
                this.$el.empty();
                _.each(this.model.get("genes"), function (gene) {
                    this.$el.append(GeneItemTpl({ "a_class": "item-remover", "id": gene, "label": gene }));
                }, this);
                this.$el.sortable({ "update": this.__reorder, "handle": "button", "cancel": "" });
                return this;
            },

            __reorder: function () {
                _.defer(this.__update);
            },

            __update: function () {
                var current_genelist = _.map(this.$el.find(".item-remover"), function (link) {
                    return $(link).data("id")
                });
                this.model.set("genes", current_genelist);
            }
        });
    });