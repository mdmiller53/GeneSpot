define([ "jquery", "underscore", "backbone", "hbs!templates/line_item" ],
    function ($, _, Backbone, LineItemTpl) {

        var extract_data_id = function (link) {
            return $(link).data("id")
        };

        return Backbone.View.extend({

            initialize: function (options) {
                _.bindAll(this, "init_typeahead", "load_selected_genes", "append_to_genelist");

                _.defer(this.init_typeahead);

                WebApp.Events.on("webapp:ready:lookups", this.init_typeahead);

                this.options.model.on("load", this.load_selected_genes);
            },

            init_typeahead: function () {
                var genelist = WebApp.Lookups.get("genes").get("keys");

                var _this = this;
                this.options.$el.find(".genes-typeahead").typeahead({
                    source: function (q, p) {
                        p(_.compact(_.flatten(_.map(q.toLowerCase().split(" "), function (qi) {
                            return _.map(genelist, function (geneitem) {
                                if (geneitem.toLowerCase().indexOf(qi) >= 0) return geneitem;
                            });
                        }))));
                    },

                    updater: function (gene) {
                        if (_this.append_to_genelist(gene)) {
                            WebApp.Events.trigger("gene-selector-updated", { "add": [gene] });
                        }
                        return "";
                    }
                });

                this.options.$el.find(".gene-selector").sortable({
                    "update": function (e, ui) {
                        var reorder = _.map($(e.target).find("a"), extract_data_id);
                        WebApp.Events.trigger("gene-selector-updated", { "reorder": reorder });
                    }
                });

                console.log("genelist:typeahead:ready");
            },

            load_selected_genes: function () {
                var genes_in_list = this.options.model.get("default_genelist");
                _.each(genes_in_list, this.append_to_genelist, this);
                console.log("genelist:selected_genes:ready");
            },

            append_to_genelist: function (gene) {
                var UL = this.options.$el.find(".gene-selector");
                var LI_A_existing = _.find(UL.find("a"), function(link) {
                    return extract_data_id(link) == gene;
                });
                if (LI_A_existing) {
                    console.log("genelist:append_to_genelist(" + gene + "):duplicate:ignore");
                    return false;
                }

                UL.append(LineItemTpl({ "a_class": "item-remover", "id": gene, "label": gene, "i_class": "icon-trash" }));
                var LI_A = _.find(UL.find("a"), function(link) {
                    return extract_data_id(link) == gene;
                });
                $(LI_A).click(function (e) {
                    $(e.target).parent().remove();
                    WebApp.Events.trigger("gene-selector-updated", { "remove": [extract_data_id(e.target)] });
                });

                return true;
            }
        });
    });