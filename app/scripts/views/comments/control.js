define(["jquery", "underscore", "backbone",
    "hbs!templates/comments/container", "hbs!templates/comments/needs_login", "base64"],
    function ($, _, Backbone, Tpl, NeedsLoginTpl) {
        return Backbone.View.extend({
            file: new Backbone.Model(),
            comments: new Backbone.Model(),

            events: {
                "click .create-comments": function () {
                    this.$(".alert").hide();

                    var newname = this.$(".new-comments-name").val();
                    this.$(".new-comments-name").val("");

                    if (_.isEmpty(newname)) {
                        WebApp.alert(this.$(".invalid-comments-name"), 3000);
                        return;
                    }

                    var labels = _.pluck(this.files.get("items"), "title");
                    if (labels.indexOf(newname) >= 0) {
                        WebApp.alert(this.$(".duplicate-comments-name"), 3000);
                        return;
                    }

//                    new Backbone.Model().save(
//                        {
//                            "title": newname,
//                            "parents": [ {"id": this.folder.get("id")} ]
//                        },
//                        {
//                            "url": "svc/auth/providers/google_apis/drive/v2/files",
//                            "method": "POST",
//                            "success": this.render
//                        });
                },

                "click .refresh-comments": function () {
                    _.defer(this.render);
                }
            },

            initialize: function () {
                _.bindAll(this, "render", "__load", "__render");

                this.folder = this.options.folder_control["folder"];
                this.files = this.options.folder_control["files"];
                this.options.folder_control.on("folder-ready", this.__render, this);
            },

            render: function () {
                console.debug("views/comments/control.render");

                this.$el.html(NeedsLoginTpl());
                return this;
            },

            __render: function () {
                var comments_file = _.findWhere(this.files.get("items"), { "title": "GeneSpot | Comments" });
                if (comments_file) {
                    this.comments = new Backbone.Model({}, {
                        "url": "svc/auth/providers/google_apis/drive/v2/files/" + comments_file["id"] + "/comments"
                    });
                    this.comments.fetch({ "success": this.__load });
                } else {
                    $.ajax({
                        "url": "svc/auth/providers/google_apis/drive/v2/files",
                        "method": "POST",
                        "contentType": "application/json",
                        "data": JSON.stringify({
                            "title": "GeneSpot | Comments",
                            "parents": [
                                { "id": this.folder["id"] }
                            ]
                        }),
                        "success": this.options.folder_control.sync_up
                    });
                }
            },

            __load: function () {
                console.debug("views/comments/control.__load");

                var comments = _.map(this.comments.get("items"), function (item) {
                    return item.toJSON();
                });
                this.$el.html(Tpl({ "comments": _.sortBy(comments, "order") }));
            }
        });
    });
