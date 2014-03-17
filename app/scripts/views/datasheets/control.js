define(["jquery", "underscore", "backbone", "base64", "models/xmlmodel",
    "hbs!templates/datasheets/container", "hbs!templates/datasheets/needs_login", "hbs!templates/datasheets/worksheets"],
    function ($, _, Backbone, base64, XmlModel, Tpl, NeedsLoginTpl, WorksheetsTpl) {
        WRKSHT_API = "https://spreadsheets.google.com/feeds/worksheets/";
        WRKSHT_URL = "https://spreadsheets.google.com/feeds/cells/KEY/WRKSHT/private/full";
        WRKSHT_SVC = "svc/auth/providers/google_spreadsheets/feeds/worksheets/KEY/private/full";
        WRKSHT_DATA_SVC = "svc/auth/providers/google_spreadsheets/feeds/cells/KEY/WRKSHT/private/full/batch";

        return Backbone.View.extend({
            folder: new Backbone.Model(),
            files: new Backbone.Model({}, { "url": "svc/auth/providers/google_apis/drive/v2/files" }),

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
                            "url": "svc/auth/providers/google_apis/drive/v2/files",
                            "method": "POST",
                            "success": this.render
                        });
                },

                "click .refresh-datasheets": function() {
                    _.defer(this.render);
                },

                "click .add-worksheet": function(e) {
                    var datasheet_id = $(e.target).data("id");
                    var worksheet = _.find(this.$(".new-worksheet-name"), function(worksheet) {
                        return _.isEqual($(worksheet).data("id"), datasheet_id);
                    });
                    if (!worksheet) return;

                    var worksheet_name = $(worksheet).val();
                    if (_.isEmpty(worksheet_name)) {
                        WebApp.alert(this.$(".invalid-worksheet-name"), 3000);
                        return;
                    }

                    this.__add_a_worksheet(datasheet_id, worksheet_name);
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
                    var worksheet = new XmlModel({}, { "url": WRKSHT_SVC.replace("KEY", datasheet["id"]) });
                    worksheet.fetch({ "success": this.__render_worksheets });
                }, this);
            },

            __render_worksheets: function (model) {
                console.debug("views/datasheets/control.__render_worksheets");
                var worksheets = model.get("feed")["entry"];
                var ws = [];
                if (_.isArray(worksheets)) {
                    _.each(worksheets, function(entry) {
                        ws.push({
                            "id": _.last(entry["id"].replace(WRKSHT_API, "").split("/")),
                            "title": entry["title"].toString()
                        });
                    });
                } else {
                    ws.push({
                        "id": _.last(worksheets["id"].replace(WRKSHT_API, "").split("/")),
                        "title": worksheets["title"].toString()
                    });
                }

                var sheet_id = _.first(model.get("feed")["id"].replace(WRKSHT_API, "").split("/"));
                this.$("#tab-datasheets-" + sheet_id).find(".datasheets-infos").html(WorksheetsTpl({"datasheet": sheet_id, "worksheets": ws}));
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
                        "url": "svc/auth/providers/google_apis/drive/v2/files",
                        "method": "POST",
                        "success": this.render
                    });
            },

            __add_a_worksheet: function(datasheet_id, worksheet_name) {
                console.debug("views/datasheets/control.__add_a_worksheet(" + datasheet_id + "," + worksheet_name + ")");
                var worksheet = new XmlModel({
                    "entry": {
                        "_xmlns": "http://www.w3.org/2005/Atom",
                        "_xmlns:gs": "http://schemas.google.com/spreadsheets/2006",
                        "title": worksheet_name,
                        "gs:rowCount": 10,
                        "gs:colCount": 10
                    }
                }, { "url": WRKSHT_SVC.replace("KEY", datasheet_id) });
                worksheet.save({ "success": this.__render });
            },

            __populate_worksheet: function(datasheet_id, worksheet_id, data) {
                console.debug("views/datasheets/control.__populate_worksheet(" + datasheet_id + "," + worksheet_id + "," + data.length + ")");

                var worksheet_url = WRKSHT_URL.replace("KEY", datasheet_id).replace("WRKSHT", worksheet_id);
                var feed = {
                    "feed": {
                        "_xmlns": "http://www.w3.org/2005/Atom",
                        "_xmlns:batch": "http://schemas.google.com/gdata/batch",
                        "_xmlns:gs":"http://schemas.google.com/spreadsheets/2006",
                        "id": worksheet_url,
                        "entry": _.map(data, function(cell) {
                            var cellUrl = worksheet_url + "/R" + cell["_row"] + "C" + cell["_col"];
                            return                         {
                                "batch:id": Math.round(Math.random() * 1000000),
                                "batch:operation": {
                                    "_type":"update"
                                },
                                "id": cellUrl,
                                "link": {
                                    "_rel": "edit",
                                    "_type": "application/atom+xml",
                                    "_href": cellUrl + "/version"
                                },
                                "gs:cell": cell
                            }
                        })
                    }
                };

                var cells = new XmlModel(feed, { "url": WRKSHT_DATA_SVC.replace("KEY", datasheet_id).replace("WRKSHT", worksheet_id) });
                cells.save({ "method": "POST", "headers": { "If-Match": "*" } });
            }

//                    <a href="#" onclick="return false;" data-id="{{id}}" data-datasheet="{{../datasheet}}" class="add-data-to-worksheet">(add data)</a>
//                var datasheet_id = $(e.target).data("datasheet");
//                var worksheet_id = $(e.target).data("id");
//                var data = [
//                    { "_row": 1, "_col": 1, "_inputValue": Math.random() },
//                    { "_row": 2, "_col": 1, "_inputValue": Math.random() },
//                    { "_row": 3, "_col": 1, "_inputValue": Math.random() },
//                    { "_row": 1, "_col": 2, "_inputValue": "BLAH_" + Math.random() },
//                    { "_row": 2, "_col": 2, "_inputValue": "BLAH_" + Math.random() },
//                    { "_row": 3, "_col": 2, "_inputValue": "BLAH_" + Math.random() }
//                ];
//                this.__populate_worksheet(datasheet_id, worksheet_id, data);

        });
    });
