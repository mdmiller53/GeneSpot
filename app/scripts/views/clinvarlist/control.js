define(["jquery", "underscore", "backbone",
    "views/clinvarlist/itemizer", "views/clinvarlist/typeahead",
    "hbs!templates/clinvarlist/container"],
    function ($, _, Backbone, Itemizer, TypeAhead, Tpl) {
        return Backbone.View.extend({
            clinvarlist_collection: new Backbone.Collection([], { "url": "svc/collections/clinvarlist" }),
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

                    var listlabels = _.map(this.clinvarlist_collection["models"], function(gl_model) {
                        return gl_model.get("label");
                    });
                    if (listlabels.indexOf(newname) >= 0) {
                        WebApp.alert(this.$el.find(".duplicate-list-name"), 3000);
                        return;
                    }

                    Backbone.sync("create", new Backbone.Model({ "label": newname, "clinical_variables": [] }), {
                        "url": "svc/collections/clinvarlist", "success": this.render
                    });

                    WebApp.alert(this.$el.find(".list-added-success"));
                },

                "click .list-remover": function(e) {
                    console.log("remove list");

                    var listid = $(e.target).data("id");

                    Backbone.sync("delete", new Backbone.Model({}), {
                        "url": "svc/collections/clinvarlist/" + listid, "success": this.render
                    });
                }
            },

            initialize: function() {
                _.bindAll(this, "__load", "render");

                this.clinvarlist_collection.on("change", function(item) {
                    if (_.isEmpty(item)) return;
                    Backbone.sync("update", item, {
                        "url": "svc/collections/clinvarlist/" + item.get("id"), "success": this.render
                    });
                });
            },

            render: function() {
                this.clinvarlist_collection.fetch({ "success": this.__load });
                return this;
            },

            __load: function() {
                var clinvarlist = _.map(this.clinvarlist_collection["models"], function(gl_model) {
                    return { "id": gl_model.get("id"), "label": gl_model.get("label") };
                });

                this.$el.html(Tpl({ "clinvarlist": _.sortBy(clinvarlist, "sort") }));
                _.each(this.clinvarlist_collection["models"], this.__render, this);
            },

            __render: function(gl_model) {
                var $clinSelector = this.$el.find("#tab-clists-" + gl_model.get("id")).find(".clinvar-selector");
                var itemizer = this.itemizers[gl_model.get("id")] = new Itemizer({"el": $clinSelector, "model": gl_model });
                itemizer.render();

                var $clinTypeahead = this.$el.find("#tab-clists-" + gl_model["id"]).find(".clin-typeahead");
                var typeahead = new TypeAhead({ "el": $clinTypeahead });
                typeahead.render();
                typeahead.on("typed", function(clin) {
                    var cv_from_model = _.map(gl_model.get("clinical_variables"), function(g) {return g;});
                    var found_item = _.find(cv_from_model, function(item_from_model) {
                        return _.isEqual(clin.id, item_from_model.id);
                    });
                    if (found_item) {
                        WebApp.alert(this.$el.find(".duplicate-clin-entered"), 3000);
                        return;
                    }

                    cv_from_model.push(clin);
                    gl_model.set("clinical_variables", cv_from_model);
                }, this);
            },

            getCurrentClinvarList: function() {
                var currentListId = this.$el.find(".nav-tabs").find("li.active").data("id");
                var currentItemizer = this.itemizers[currentListId] || { "model": new Backbone.Model() };
                return currentItemizer["model"].get("clinical_variables");
            }
        });
    });
