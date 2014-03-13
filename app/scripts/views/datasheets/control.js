define(["jquery", "underscore", "backbone", "base64", "models/xmlmodel",
    "hbs!templates/datasheets/container", "hbs!templates/datasheets/needs_login", "hbs!templates/datasheets/worksheets"],
    function ($, _, Backbone, base64, XmlModel, Tpl, NeedsLoginTpl, WorksheetsTpl) {
        API_URL = "https://spreadsheets.google.com/feeds/worksheets/";
        TPL_URL = "svc/auth/providers/google_spreadsheets/feeds/worksheets/KEY/private/full";

        return Backbone.View.extend({
            folder: new Backbone.Model(),
            files: new Backbone.Model({}, { "url": "svc/auth/providers/google_drive/drive/v2/files" }),

            events: {
                "click .create-datasheets": function() {
                    this.$(".alert").hide();

                    var newname = this.$(".new-datasheets-name").val();
                    this.$(".new-datasheets-name").val("");

                    if (_.isEmpty(newname)) {
                        WebApp.alert(this.$(".invalid-datasheets-name"), 3000);
                        return;
                    }

                    var labels = _.pluck(this.files.get("items"), "title");
                    if (labels.indexOf(newname) >= 0) {
                        WebApp.alert(this.$(".duplicate-datasheets-name"), 3000);
                        return;
                    }

                    new Backbone.Model().save(
                        {
                            "title": newname,
                            "parents": [ {"id": this.folder.get("id")} ],
                            "mimeType": "application/vnd.google-apps.spreadsheet"
                        },
                        {
                            "url": "svc/auth/providers/google_drive/drive/v2/files",
                            "method": "POST",
                            "success": this.render
                        });
                },

                "click .refresh-datasheets": function() {
                    _.defer(this.render);
                }
            },

            initialize: function() {
                _.bindAll(this, "render", "__load", "__render", "__create_folder", "__render_worksheets");
            },

            render: function() {
                console.debug("views/datasheets/control.render");

                this.files.fetch({ "success": this.__load });

                this.$el.html(NeedsLoginTpl());
                return this;
            },

            __load: function(model) {
                console.debug("views/datasheets/control.__load");
                var folderInfo = _.findWhere(model.get("items"), { "title": "GeneSpot | Data Sheets" });
                if (folderInfo) {
                    this.folder = new Backbone.Model(folderInfo);
                    _.defer(this.__render);
                } else {
                    _.defer(this.__create_folder);
                }
            },

            __render: function() {
                console.debug("views/datasheets/control.__render");
                var onlysheets = { "mimeType": "application/vnd.google-apps.spreadsheet" };
                var datasheets = _.where(this.files.get("items"), onlysheets);
                this.$el.html(Tpl({ "datasheets": _.sortBy(datasheets, "title"), "folder": this.folder.toJSON() }));

                _.each(datasheets, function(datasheet) {
                    var worksheet = new XmlModel({}, { "url": TPL_URL.replace("KEY", datasheet["id"]) });
                    worksheet.fetch({ "success": this.__render_worksheets });
                }, this);
            },

            __render_worksheets: function (model) {
                console.debug("views/datasheets/control.__render_worksheets");
                var worksheets = model.get("feed").entry;
                var titles = [];
                if (_.isArray(worksheets)) {
                    _.each(model.get("feed").entry, function(entry) {
                        titles.push(entry["title"].toString());
                    });
                } else {
                    titles.push([worksheets["title"].toString()]);
                }

                var sheet_id = _.first(model.get("feed")["id"].replace(API_URL, "").split("/"));
                this.$("#tab-datasheets-" + sheet_id).find(".datasheets-infos").html(WorksheetsTpl({"titles": titles}));
            },

            __create_folder: function() {
                console.debug("views/datasheets/control.__create_folder");
                this.folder.save(
                    {
                        "title": "GeneSpot | Data Sheets",
                        "parents": [ {"id": "root"} ],
                        "mimeType": "application/vnd.google-apps.folder"
                    },
                    {
                        "url": "svc/auth/providers/google_drive/drive/v2/files",
                        "method": "POST",
                        "success": this.render
                    });
            },

            __new_datasheet: function(meta, contents) {
                const boundary = "-------314159265358979323846";
                const delimiter = "\r\n--" + boundary + "\r\n";
                const close_delim = "\r\n--" + boundary + "--";

//                var file_meta = {
//                    "title": "testfile01",
//                    "description": "This text describes the file",
//                    "mimeType": "text/plain",
//                    "writersCanShare": true
//                };

                var request_body = "\r\n--" + boundary + "\r\n" +
                    "Content-Type: application/json\r\n\r\n" + JSON.stringify(meta) +
                    "\r\n--" + boundary + "\r\n" +
                    "Content-Type: application/octet-stream" +
                    "\r\n" +
                    "Content-Transfer-Encoding: base64" +
                    "\r\n\r\n" + $.base64.encode(contents) +
                    "\r\n--" + boundary + "--";

                $.ajax({
                    "url": "svc/auth/providers/google_drive/upload/drive/v2/files?uploadType=multipart",
                    "method": "POST",
                    "contentType": "multipart/mixed; boundary=\"" + boundary + "\"",
                    "data": request_body
                });
            }
        });
    });
