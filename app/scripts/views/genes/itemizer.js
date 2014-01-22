define([ "jquery", "underscore", "backbone", "hbs!templates/line_item" ],
    function ($, _, Backbone, LineItemTpl) {

        var extract_data_id = function (link) {
            return $(link).data("id")
        };

        return Backbone.View.extend({
            initialize: function (options) {
                this.model.on("load", this.load_selected_genes, this);

                console.log("genelist:init:ready");

                var _this = this;
                this.$el.sortable({
                    "update": function (e) {
                        _this.trigger("updated", { "reorder": _.map($(e.target).find("a"), extract_data_id) });
                    }
                });
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

                this.$el.append(LineItemTpl({ "a_class": "item-remover", "id": gene, "label": gene, "i_class": "icon-trash" }));
                var LI_A = _.find(this.$el.find("a"), function (link) {
                    return extract_data_id(link) == gene;
                });

                var _this = this;
                $(LI_A).click(function (e) {
                    $(e.target).parent().remove();

                    var index = _this.model.get("genes").indexOf(gene);
                    if (index > -1) {
                        _this.model.get("genes").splice(index, 1);
                    }

                    _this.trigger("updated", { "removed": [extract_data_id(e.target)] });
                });
            }
        });
    });