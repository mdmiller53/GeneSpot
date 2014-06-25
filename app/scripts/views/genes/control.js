define(["jquery", "underscore", "backbone",
    "views/genes/itemizer", "views/genes/typeahead",
    "hbs!templates/genes/container",
    "models/genes/default_genelist"],
    function ($, _, Backbone, Itemizer, TypeAhead, Tpl, DefaultGenelistModel) {
        return Backbone.View.extend({
            genelists_collection: new Backbone.Collection([], { "url": "svc/collections/genelists" }),
            itemizers: {},

            events: {
                "click .add-new-list": function() {
                    this.$el.find(".alert").hide();

                    var newname = this.$el.find(".new-list-name").val();
                    this.$el.find(".new-list-name").val("");

                    if (_.isEmpty(newname)) {
                        WebApp.alert(this.$el.find(".invalid-list-name"), 3000);
                        return;
                    }

                    var listlabels = _.map(this.genelists_collection["models"], function(gl_model) {
                        return gl_model.get("label");
                    });
                    if (listlabels.indexOf(newname) >= 0) {
                        WebApp.alert(this.$el.find(".duplicate-list-name"), 3000);
                        return;
                    }

                    Backbone.sync("create", new Backbone.Model({ "label": newname, "genes": [] }), {
                        "url": "svc/collections/genelists", "success": this.__refresh
                    });

                    WebApp.alert(this.$el.find(".list-added-success"));
                },

                "click .list-remover": function(e) {
                    console.log("remove list");

                    var listid = $(e.target).data("id");

                    Backbone.sync("delete", new Backbone.Model({}), {
                        "url": "svc/collections/genelists/" + listid, "success": this.__refresh
                    });
                },

                "click .list-refresh": function() {
                    _.defer(this.__refresh);
                }
            },

            initialize: function() {
                _.bindAll(this, "__load", "__refresh", "__ready");
            },

            render: function() {
                this.genelists_collection.fetch({ "success": this.__ready });
                this.genelists_collection.on("change", function(item) {
                    if (_.isEmpty(item)) return;
                    Backbone.sync("update", new Backbone.Model(_.omit(item.toJSON(), "uri", "id", "_id")), {
                        "url": "svc/collections/genelists/" + item.get("_id"), "success": this.__refresh
                    });
                });

                return this;
            },

            __ready: function() {
                this.__load();
                this.trigger("ready");
            },

            __refresh: function() {
                this.genelists_collection.fetch({ "success": this.__load });
            },

            __load: function() {
                var genelists = _.map(this.genelists_collection["models"], function(gl_model) {
                    return _.extend({ "id": gl_model.get("_id") }, gl_model.toJSON());
                });

                var default_gl = {
                    "id": "default-list",
                    "_id": "default-list",
                    "label": "Default List",
                    "genes": this.options["default_genelist"],
                    "sort": 1,
                    "isDefault": true
                };
                genelists.push(default_gl);

                this.$el.html(Tpl({ "genelists": _.sortBy(genelists, "sort") }));
                this.__render(new DefaultGenelistModel(default_gl));
                _.each(this.genelists_collection["models"], this.__render, this);
            },

            __render: function(gl_model) {
                var $glList = this.$el.find("#tab-glists-glist-" + gl_model.get("_id"));
                var itemizer = this.itemizers[gl_model.get("_id")] = new Itemizer({"el": $glList.find(".gene-selector"), "model": gl_model });
                itemizer.render();

                var typeahead = new TypeAhead({ "el": $glList.find(".genes-typeahead"), "url": this.options["all_tags_url"] });
                typeahead.render();
                typeahead.on("typed", function(gene) {
                    var genes_from_model = _.map(gl_model.get("genes"), function(g) {return g;});
                    if (genes_from_model.indexOf(gene) >= 0) {
                        WebApp.alert(this.$el.find(".duplicate-gene-entered"), 3000);
                        return;
                    }

                    gl_model.set("genes", _.flatten([gene, genes_from_model]));
                    WebApp.alert(this.$el.find(".gene-added-success"), 3000);
                }, this);
            },

            get_current: function() {
                var currentGeneListId = this.$el.find(".nav-tabs").find("li.active").data("id");
                return this.itemizers[currentGeneListId].model.get("genes");
            }
        });
    });
