define(["jquery", "underscore", "backbone",
        "hbs!templates/workdesk/dataset", "hbs!templates/workdesk/datasettabs",
        "hbs!templates/workdesk/datasetinfo", "hbs!templates/workdesk/title"],
    function ($, _, Backbone, Tpl, TabsTpl, InfoTpl, TitleTpl) {
        return Backbone.View.extend({
            events: {
                "click a.select-datasettab": function (e) {
                    var tab_id = $(e.target).data("id");
                    var payload = this.model.get("payload");
                    _.each(payload["datasettabs"], function (tab) {
                        tab["active"] = _.isEqual(tab["id"], tab_id);
                    }, this);
                    this.set("payload", payload);
                },
                "click a.append-body": function (e) {
                    console.log("append-body=" + $(e.target).data("id"));
                    this.model.set("payload", {
                        "datasettabs": [
                            {"id": "1", "label": "Title 1"},
                            {"id": "2", "label": "Title 2"},
                            {"id": "3", "label": "Title 3"}
                        ]
                    });
                },
                "click a.save-dataset": function () {
                    if (this.model.get("id")) {
                        _.defer(this.model.update);
                    } else {
                        if (!_.isEmpty(WebApp.GDrive.Workdesk.get("id"))) {
                            this.model.set({
                                "parents": [
                                    { "id": WebApp.GDrive.Workdesk.get("id"), "kind": "drive#fileLink" }
                                ]
                            });
                        }

                        this.model.once("change:id", function() {
                            WebApp.Router.navigate("#dataset/" + this.model.get("id"), { "trigger": true });
                        }, this);
                        _.defer(this.model.insert);
                    }
                },
                "click .rename-title": function() {
                    var new_title = this.$(".title-field").val();
                    if (_.isEmpty(new_title)) {
                        return; // todo: show message
                    }
                    if (_.isEqual(new_title, this.model.get("title"))) {
                        return; // todo: show message
                    }
                    this.model.set({ "title": new_title });
                    _.defer(this.model.update);
                }
            },

            initialize: function () {
                this.model = this.options.model;
                this.model.on("change", this.__render_info, this);
                this.model.on("change:title", this.__render_title, this);
                this.model.on("change:payload", this.__render_tabs, this);
            },

            "render": function () {
                this.$el.html(Tpl(this.model.toJSON()));
                return this;
            },

            "__render_title": function() {
                this.$(".dataset-title").html(TitleTpl({ "title": this.model.get("title") }))
            },

            "__render_info": function () {
                this.$(".dataset-info").html(InfoTpl(_.omit(this.model.toJSON(), "payload")));
            },

            "__render_tabs": function () {
                this.$(".dataset-tabs").html(TabsTpl(this.model.get("payload") || {}));
            }
        });
    });