define(["jquery", "underscore", "backbone",
    "views/collected_maps/itemizer", "hbs!templates/collected_maps/container"],
    function ($, _, Backbone, Itemizer, Tpl) {
        return Backbone.View.extend({
            itemizers: {},
            collected_maps: new Backbone.Collection([], { "url": "svc/collections/collected_maps" }),

            events: {
                "click .create-collected-map": function() {
                    this.$(".alert").hide();

                    var newname = this.$(".new-collected-map-name").val();
                    this.$(".new-collected-map-name").val("");

                    if (_.isEmpty(newname)) {
                        WebApp.alert(this.$(".invalid-collected-map-name"), 3000);
                        return;
                    }

                    var labels = _.map(this.collected_maps["models"], function(gl_model) {
                        return gl_model.get("label");
                    });
                    if (labels.indexOf(newname) >= 0) {
                        WebApp.alert(this.$(".duplicate-collected-map-name"), 3000);
                        return;
                    }

                    Backbone.sync("create", new Backbone.Model({ "label": newname, "maps": [], "shareable": true }), {
                        "url": "svc/collections/collected_maps", "success": this.render
                    });

                    WebApp.alert(this.$(".collected-map-added-success"));
                },

                "click .open-collected-map": function(e) {
                    console.debug("views/collected_maps/control.click:open-collected-map");
                    var selected_map = _.findWhere(this.collected_maps["models"], { "id": $(e.target).data("id") });
                    this.trigger("selected", selected_map);
                },

                "click .remove-collected-map": function(e) {
                    console.debug("views/collected_maps/control.click:remove-collected-map");

                    var listid = $(e.target).data("id");
                    Backbone.sync("delete", new Backbone.Model({}), {
                        "url": "svc/collections/collected_maps/" + listid, "success": this.render
                    });
                },

                "click .refresh-collected-maps": function() {
                    _.defer(this.render);
                }
            },

            initialize: function() {
                _.bindAll(this, "render", "__load", "__render");

                this.collected_maps.on("change", function(item) {
                    console.debug("views/collected_maps/control.collected_maps:change");
                    if (_.isEmpty(item)) return;
                    Backbone.sync("update", item, {
                        "url": "svc/collections/collected_maps/" + item.get("id"), "success": this.render
                    });
                });
            },

            render: function() {
                this.collected_maps.fetch({ "success": this.__load });
                return this;
            },

            __load: function() {
                var collected_maps = _.map(this.collected_maps["models"], function(gl_model) {
                    return { "id": gl_model.get("id"), "label": gl_model.get("label") };
                });

                this.$el.html(Tpl({ "collected_maps": _.sortBy(collected_maps, "sort") }));
                _.each(this.collected_maps["models"], this.__render, this);
            },

            __render: function(i_model) {
                var $collectedMap = this.$("#tab-collected-map-" + i_model.get("id")).find(".collected-map-infos");
                var itemizer = this.itemizers[i_model.get("id")] = new Itemizer({"el": $collectedMap, "model": i_model });
                itemizer.render();
            },

            add_to_current: function(new_map) {
                console.debug("views/collected_maps/control.add_to_current:" + new_map.id);
                var currentId = this.$(".nav-tabs").find("li.active").data("id");
                var currentMap = _.findWhere(this.collected_maps["models"], { "id": currentId });
                if (currentMap) {
                    var existing_maps = _.map(currentMap.get("maps"), function(m) { return m; });
                    existing_maps.push(new_map);
                    currentMap.set("maps", existing_maps);
                }
            }
        });
    });
