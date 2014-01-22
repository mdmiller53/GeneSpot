define([ "jquery", "underscore", "backbone", "hbs!templates/genes/gene_item" ],
    function ($, _, Backbone, GeneItemTpl) {

        var extract_data_id = function (link) {
            return $(link).data("id")
        };

        return Backbone.View.extend({
            initialize: function () {
                _.bindAll(this, "remove_gene_el", "reordered_gene_els");

                this.model.on("load", this.load_selected_genes, this);
                this.$el.sortable({ "update": this.reordered_gene_els });
            },

            load_selected_genes: function () {
                var genes_in_list = this.model.get("genes");
                _.each(genes_in_list, this.append_gene_el, this);
                console.log("genes/itemizer:selected_genes:ready");
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
                console.log("genes/itemizer:append_gene_el(" + gene + ")");

                this.$el.append(GeneItemTpl({ "a_class": "item-remover", "id": gene, "label": gene }));

                var genelink = _.find(this.$el.find("a"), function (link) {
                    return extract_data_id(link) == gene;
                });
                $(genelink).click(this.remove_gene_el);
            },

            remove_gene_el: function(e) {
                $(e.target).parents("li").remove();

                var gene = $(e.target).parents("a").data("id");

                var modelIdx = this.model.get("genes").indexOf(gene);
                if (modelIdx > -1) this.model.get("genes").splice(modelIdx, 1);

                this.trigger("updated", { "removed": [ gene ] });
            },

            reordered_gene_els: function(e) {
                this.trigger("updated", { "reorder": _.map($(e.target).find("a"), extract_data_id) });
            }
        });
    });