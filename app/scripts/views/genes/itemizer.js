define([ "jquery", "underscore", "backbone", "hbs!templates/genes/gene_item" ],
    function ($, _, Backbone, GeneItemTpl) {
        return Backbone.View.extend({
            events: {
                "click .item-remover": function (e) {
                    $(e.target).parents("li.gene-item").remove();
                    _.defer(this.update_genelist);
                }
            },

            initialize: function () {
                _.bindAll(this, "reorder_gene_els", "update_genelist");
                this.model.on("change:genes", this.render, this);
            },

            render: function() {
                this.$el.empty();
                _.each(this.model.get("genes"), function (gene) {
                    this.$el.append(GeneItemTpl({ "a_class": "item-remover", "id": gene, "label": gene }));
                }, this);
                this.$el.sortable({ "update": this.reorder_gene_els, "handle": "button", "cancel": "" });
                return this;
            },

            reorder_gene_els: function () {
                _.defer(this.update_genelist);
            },

            update_genelist: function () {
                var current_genelist = _.map(this.$el.find(".item-remover"), function (link) {
                    return $(link).data("id")
                });
                this.model.set("genes", current_genelist);
            }
        });
    });