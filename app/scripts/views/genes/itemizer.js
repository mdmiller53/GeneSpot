define([ "jquery", "underscore", "backbone", "hbs!templates/genes/gene_item" ],
    function ($, _, Backbone, GeneItemTpl) {
        return Backbone.View.extend({
            events: {
                "click .item-remover": function (e) {
                    $(e.target).parents("li").remove();
                    _.defer(this.update_genelist);
                }
            },

            initialize: function () {
                _.bindAll(this, "reorder_gene_els", "update_genelist");
            },

            render: function() {
                _.each(this.model.get("genes"), this.append_gene_el, this);
                this.$el.sortable({ "update": this.reorder_gene_els, "handle": "button", "cancel": "" });
                return this;
            },

            append_gene: function (gene) {
                if (this.model.get("genes").indexOf(gene) >= 0) {
                    console.log("genes/itemizer:append_gene(" + gene + "):duplicate:ignore");
                    return;
                }

                this.append_gene_el(gene);

                _.defer(this.update_genelist);
            },

            append_gene_el: function (gene) {
                this.$el.append(GeneItemTpl({ "a_class": "item-remover", "id": gene, "label": gene }));
            },

            reorder_gene_els: function () {
                _.defer(this.update_genelist);
            },

            update_genelist: function () {
                this.model.set("genes", this.retrieve_active_genes());
            },

            retrieve_active_genes: function () {
                return _.map(this.$el.find(".item-remover"), function (link) {
                    return $(link).data("id")
                });
            }
        });
    });