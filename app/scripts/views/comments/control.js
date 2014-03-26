define(["jquery", "underscore", "backbone",
    "hbs!templates/comments/container", "hbs!templates/comments/needs_login", "jquery-dateFormat"],
    function ($, _, Backbone, Tpl, NeedsLoginTpl) {
        return Backbone.View.extend({
            file: new Backbone.Model(),
            comments: new Backbone.Model(),

            events: {
                "click .create-comments": function () {
                    this.$(".alert").hide();

                    var newcomment = this.$(".new-comments-text").val();
                    this.$(".new-comments-text").val("");

                    if (_.isEmpty(newcomment)) {
                        WebApp.alert(this.$(".invalid-comments-name"), 3000);
                        return;
                    }

                    $.ajax({
                        "url": this.comments["url"],
                        "method": "POST",
                        "contentType": "application/json",
                        "data": JSON.stringify({ "content": newcomment }),
                        "success": this.__render
                    });
                },

                "click .refresh-comments": function () {
                    _.defer(this.__render);
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
                var comments = _.map(this.comments.get("items"), function(item) {
                    return {
                        "displayName": item["author"]["displayName"],
                        "picture": item["author"]["picture"]["url"],
                        "createdDate": item["createdDate"],
                        "prettyDate": $.format.prettyDate(item["createdDate"]),
                        "htmlContent": item["htmlContent"],
                        "replies": _.sortBy(_.map(item["replies"], function(reply) {
                            return {
                                "displayName": reply["author"]["displayName"],
                                "picture": reply["author"]["picture"]["url"],
                                "createdDate": reply["createdDate"],
                                "prettyDate": $.format.prettyDate(reply["createdDate"]),
                                "htmlContent": reply["htmlContent"],
                            }
                        }), "createdDate").reverse()
                    }
                });
                var comments = _.sortBy(comments, "createdDate");
                this.$el.html(Tpl({ "comments": comments.reverse() }));
            }
        });
    });
