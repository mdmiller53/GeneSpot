define(["jquery", "underscore", "backbone", "views/genes/itemizer", "views/genes/typeahead", "hbs!templates/genes/genelist_container"],
    function ($, _, Backbone, Itemizer, TypeAhead, Tpl) {
        var do_alert = function(alertEl, timeout) {
            $(alertEl).show();
            _.delay(function() {
                $(alertEl).hide({ "effect": "fade" });
            }, timeout || 2000);
        };

        return Backbone.View.extend({
            genelists_collection: new Backbone.Collection([], { "url": "svc/collections/genelists" }),
            itemizers: {},

            events: {
                "click .add-new-list": function() {
                    this.$el.find(".alert").hide();

                    var newname = this.$el.find(".new-list-name").val();
                    this.$el.find(".new-list-name").val("");

                    if (_.isEmpty(newname)) {
                        do_alert(this.$el.find(".invalid-list-name"), 3000);
                        return;
                    }

                    var listlabels = _.map(this.genelists_collection["models"], function(gl_model) {
                        return gl_model.get("label");
                    });
                    if (listlabels.indexOf(newname) >= 0) {
                        do_alert(this.$el.find(".duplicate-list-name"), 3000);
                        return;
                    }

                    Backbone.sync("create", new Backbone.Model({ "label": newname, "genes": [] }), {
                        "url": "svc/collections/genelists", "success": this.refreshGeneLists
                    });

                    do_alert(this.$el.find(".list-added-success"));
                }
            },

            initialize: function() {
                _.bindAll(this, "loadGeneLists", "refreshGeneLists");
                _.defer(this.refreshGeneLists);

                this.genelists_collection.on("change", function(item) {
                    if (_.isEmpty(item)) return;
                    Backbone.sync("update", item, {
                        "url": "svc/collections/genelists/" + item.get("id"), "success": this.refreshGeneLists
                    });
                });

                this.genelists_collection.on("remove", function(item) {
                    console.log("genelists_collection.remove=" + JSON.stringify(item));
                    Backbone.sync("delete", item, {
                        "url": "svc/collections/genelists/" + item.get("id"), "success": this.refreshGeneLists
                    });
                });
            },

            refreshGeneLists: function() {
                this.genelists_collection.fetch({ "success": this.loadGeneLists });
            },

            loadGeneLists: function() {
                var genelists = _.map(this.genelists_collection["models"], function(gl_model) {
                    return { "id": gl_model.get("id"), "label": gl_model.get("label") };
                });

                var default_gl = { "id": "default-list", "label": "Default List", "genes": this.options["default_genelist"], "sort": 1 };
                genelists.push(default_gl);

                this.$el.html(Tpl({ "genelists": _.sortBy(genelists, "sort") }));
                this.renderGeneLists(new Backbone.Model(default_gl));
                _.each(this.genelists_collection["models"], this.renderGeneLists, this);
            },

            renderGeneLists: function(gl_model) {
                var $geneSelector = this.$el.find("#tab-glists-glist-" + gl_model.get("id")).find(".gene-selector");
                var itemizer = this.itemizers[gl_model.get("id")] = new Itemizer({"el": $geneSelector, "model": gl_model });
                itemizer.render();

                var $geneTypeahead = this.$el.find("#tab-glists-glist-" + gl_model["id"]).find(".genes-typeahead");
                var typeahead = new TypeAhead({ "el": $geneTypeahead });
                typeahead.render();
                typeahead.on("typed", itemizer.append_gene, itemizer);
            },

            getCurrentGeneList: function() {
                var currentGeneListId = this.$el.find(".nav-tabs").find("li.active").data("id");
                return this.itemizers[currentGeneListId].model.get("genes");
            }
        });
    });
