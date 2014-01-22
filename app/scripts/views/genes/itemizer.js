define([ "jquery", "underscore", "backbone", "hbs!templates/genes/gene_item" ],
    function ($, _, Backbone, GeneItemTpl) {

        var extract_data_id = function (link) {
            return $(link).data("id")
        };

        return Backbone.View.extend({
            events: {
                "click .item-remover": "remove_gene_el"
            },

            initialize: function () {
                _.bindAll(this, "remove_gene_el", "reordered_gene_els");

                this.model.on("load", this.load_selected_genes, this);
                this.$el.sortable({ "update": this.reordered_gene_els, "handle": "button", "cancel": "" });
            },

            load_selected_genes: function () {
                _.each(this.model.get("genes"), this.append_gene_el, this);
            },

            append_gene: function (gene) {
                console.log("genes/itemizer:append_gene(" + gene + ")");

                if (this.model.get("genes").indexOf(gene) >= 0) {
                    console.log("genes/itemizer:append_gene(" + gene + "):duplicate:ignore");
                    return;
                }

                this.model.get("genes").push(gene);

                this.append_gene_el(gene);

                this.trigger("updated", { "added": [gene] });
            },

            append_gene_el: function (gene) {
                this.$el.append(GeneItemTpl({ "a_class": "item-remover", "id": gene, "label": gene }));
            },

            remove_gene_el: function(e) {
                $(e.target).parents("li").remove();

                var gene = $(e.target).data("id");

                var modelIdx = this.model.get("genes").indexOf(gene);
                if (modelIdx > -1) this.model.get("genes").splice(modelIdx, 1);

                this.trigger("updated", { "removed": [ gene ] });
            },

            reordered_gene_els: function(e) {
                this.trigger("updated", { "reorder": _.map($(e.target).find("a"), extract_data_id) });
            }
        });
    });