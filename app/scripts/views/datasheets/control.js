define(["jquery", "underscore", "backbone",
    "views/datasheets/itemizer", "hbs!templates/datasheets/container"],
    function ($, _, Backbone, Itemizer, Tpl) {
        return Backbone.View.extend({
            itemizers: {},
            datasheets: new Backbone.Collection([], { "url": "svc/collections/datasheets" }),

            events: {
                "click .create-datasheets": function() {
                    this.$(".alert").hide();

                    var newname = this.$(".new-datasheets-name").val();
                    this.$(".new-datasheets-name").val("");

                    if (_.isEmpty(newname)) {
                        WebApp.alert(this.$(".invalid-datasheets-name"), 3000);
                        return;
                    }

                    var labels = _.map(this.datasheets["models"], function(gl_model) {
                        return gl_model.get("label");
                    });
                    if (labels.indexOf(newname) >= 0) {
                        WebApp.alert(this.$(".duplicate-datasheets-name"), 3000);
                        return;
                    }

                    // TODO: Create sheet in Google Drive
                    Backbone.sync("create", new Backbone.Model({ "label": newname }), {
                        "url": "svc/collections/datasheets", "success": this.render
                    });

                    WebApp.alert(this.$(".datasheets-added-success"));
                },

                "click .remove-datasheets": function(e) {
                    console.debug("views/datasheets/control.click:remove-datasheets");

                    var listid = $(e.target).data("id");
                    Backbone.sync("delete", new Backbone.Model({}), {
                        "url": "svc/collections/datasheets/" + listid, "success": this.render
                    });
                },

                "click .refresh-datasheets": function() {
                    _.defer(this.render);
                }
            },

            initialize: function() {
                _.bindAll(this, "render", "__load", "__render");

                this.datasheets.on("change", function(item) {
                    console.debug("views/datasheets/control.datasheets:change");
                    if (_.isEmpty(item)) return;
                    Backbone.sync("update", item, {
                        "url": "svc/collections/datasheets/" + item.get("id"), "success": this.render
                    });
                });
            },

            render: function() {
                this.datasheets.fetch({ "success": this.__load });
                this.$el.html(Tpl({ "datasheets": [] }));
                return this;
            },

            __load: function() {
                var datasheets = _.map(this.datasheets["models"], function(gl_model) {
                    return { "id": gl_model.get("id"), "label": gl_model.get("label") };
                });

                this.$el.html(Tpl({ "datasheets": _.sortBy(datasheets, "sort") }));
                _.each(this.datasheets["models"], this.__render, this);
            },

            __render: function(i_model) {
                var $datasheet = this.$("#tab-datasheets-" + i_model.get("id")).find(".datasheets-infos");
                var itemizer = this.itemizers[i_model.get("id")] = new Itemizer({"el": $datasheet, "model": i_model });
                itemizer.render();
            },

            add_to_current: function(new_map) {
                console.debug("views/datasheets/control.add_to_current:" + new_map.id);
                var currentId = this.$(".nav-tabs").find("li.active").data("id");
                var currentSheet = _.findWhere(this.datasheets["models"], { "id": currentId });
                if (currentSheet) {
                    var existing_sheets = _.map(currentSheet.get("maps"), function(m) { return m; });
                    existing_sheets.push(new_map);
                    currentSheet.set("maps", existing_sheets);
                }
            }
        });
    });
