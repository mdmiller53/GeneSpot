define(["jquery", "underscore", "backbone", "hbs!templates/workdesk/container"],
    function ($, _, Backbone, Tpl) {
        return Backbone.View.extend({
            workbooks: new Backbone.Model({}, {
                "url": "svc/auth/providers/google_apis/drive/v2/files"
            }),

            events: {
                "click .refresh-workbooks": "render",
                "click .create-workbook": function () {
                    var title = this.$(".workbook-new-title").val();
                    this.$(".workbook-new-title").val("");

                    new Backbone.Model(
                        {
                            "description": "test workbook",
                            "mimeType": "application/vnd.genespot.workbook",
                            "indexableText": {
                                "text": "GeneSpot Workbooks " + title
                            },
                            "uploadType": "media",
                            "title": title,
                            "parents": [
                                { "id": "appdata" }
                            ]
                        },
                        {
                            "url": "svc/auth/providers/google_apis/upload/drive/v2/files"
                        }
                    ).save({ "success": this.render });
                },
                "click .delete-workbook": function(e) {
                    var workbookId = $(e.target).parent().data("id");
                    if (_.isEmpty(workbookId)) return;
                    $.ajax({
                        "url": "svc/auth/providers/google_apis/drive/v2/files/" + workbookId,
                        "method": "DELETE",
                        "success": this.render,
                        "context": this
                    });
                }
            },

            "initialize": function () {
                this.active_workbook = this.options.active_workbook;
                this.workbooks.on("load", this.__list_workbooks, this);
            },

            render: function () {
                this.workbooks.fetch({
                    "success": function (model) {
                        model.trigger("load");
                    }
                });

                this.$el.html(Tpl({}));
                return this;
            },

            __list_workbooks: function () {
                var items = _.where(this.workbooks.get("items"), { "mimeType": "application/vnd.genespot.workbook" });
                this.$el.html(Tpl({ "items": items }));
            }
        });
    });
