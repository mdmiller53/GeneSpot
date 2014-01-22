define(["jquery", "underscore", "backbone", "views/genes/itemizer", "views/genes/typeahead", "hbs!templates/genes/genelist_container"],
    function ($, _, Backbone, Itemizer, TypeAhead, Tpl) {
        return Backbone.View.extend({
            itemizers: {},

            initialize: function(options) {
                this.genelists_model = new Backbone.Model({
                    "items": [
                        { "id": "default-list", "label": "Default List", "genes": options["default_genelist"] },
                        { "id": "gl1", "label": "Gene List 1", "genes": ["TP53", "AKT1", "AKT2"]},
                        { "id": "gl2", "label": "Gene List 2", "genes": ["KRAS", "DIABLO", "EGFR"]},
                        { "id": "gl3", "label": "Gene List 3", "genes": ["A4GNT", "ACYP1", "ACYP2"]}
                    ]
                });
                this.genelists_model.on("load", this.loadGeneLists, this);
            },

            render: function() {
                this.genelists_model.trigger("load");

                return this;
            },

            loadGeneLists: function() {
                var genelists = this.genelists_model.get("items");
                this.$el.html(Tpl({ "genelists": genelists }));

                _.each(genelists, function(genelist) {
                    var $geneSelector = this.$el.find("#tab-glists-glist-" + genelist["id"]).find(".gene-selector");
                    var glmodel = new Backbone.Model(genelist);
                    var itemizer = this.itemizers[genelist["id"]] = new Itemizer({"el": $geneSelector, "model": glmodel });
                    itemizer.on("updated", function(upd) {
                        this.trigger("updated", upd);
                    }, this);
                    itemizer.render();

                    var $geneTypeahead = this.$el.find("#tab-glists-glist-" + genelist["id"]).find(".genes-typeahead");
                    var typeahead = new TypeAhead({ "el": $geneTypeahead });
                    typeahead.render();
                    typeahead.on("typed", itemizer.append_gene, itemizer);

                    glmodel.trigger("load");
                }, this);
            },

            getCurrentGeneList: function() {
                var currentGeneListId = this.$el.find(".nav-tabs").find("li.active").data("id");
                return this.itemizers[currentGeneListId].model.get("genes");
            }
        });
    });
