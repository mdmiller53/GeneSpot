define(["jquery", "underscore", "backbone", "base64",
    "models/xmlmodel", "models/xmlmodel_feed",
    "hbs!templates/datasheets/container", "hbs!templates/datasheets/needs_login", "hbs!templates/datasheets/worksheets"],
    function ($, _, Backbone, base64, XmlModel, FeedXmlModel, Tpl, NeedsLoginTpl, WorksheetsTpl) {
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
                _.bindAll(this, "render", "__load", "__render", "__create_folder", "__render_worksheets", "__put_data_in_chunks");
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
                this.datasheets = _.indexBy(datasheets, "id");
                this.$el.html(Tpl({ "datasheets": _.sortBy(datasheets, "title"), "folder": this.folder.toJSON() }));

                _.each(datasheets, function(datasheet) {
                    var worksheet = new XmlModel({}, { "url": this.__api_worksheet(datasheet["id"]) });
                    worksheet.fetch({ "success": this.__render_worksheets });
                }, this);
            },

            __render_worksheets: function (model) {
                console.debug("views/datasheets/control.__render_worksheets");
                var worksheets = model.get("feed")["entry"];
                var ws = [];
                var wsUrl = "https://spreadsheets.google.com/feeds/worksheets/";
                if (_.isArray(worksheets)) {
                    _.each(worksheets, function(entry) {
                        ws.push({
                            "id": _.last(entry["id"].replace(wsUrl, "").split("/")),
                            "title": entry["title"].toString()
                        });
                    });
                } else {
                    ws.push({
                        "id": _.last(worksheets["id"].replace(wsUrl, "").split("/")),
                        "title": worksheets["title"].toString()
                    });
                }


                var datasheet_id = _.first(model.get("feed")["id"].replace(wsUrl, "").split("/"));
                var datasheet = this.datasheets[datasheet_id];
                datasheet["worksheets"] = ws;

                this.$("#tab-datasheets-" + datasheet_id).find(".datasheets-infos").html(WorksheetsTpl(datasheet));
                this.trigger("datasheets:loaded", datasheet);
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
                }, { "url": this.__api_worksheet(datasheet_id) });
                worksheet.save({ "success": this.__render });
            },

            populate_worksheet: function(datasheet_id, worksheet_id, data) {
                console.debug("views/datasheets/control.populate_worksheet(" + datasheet_id + "," + worksheet_id + "," + data.length + ")");

                var numberOfRows = 1 + _.max(data, function(item) { return item["_row"] })["_row"];
                var numberOfColumns = 1 + _.max(data, function(item) { return item["_col"] })["_col"];

                var datasheet = this.datasheets[datasheet_id];
                var worksheet = _.findWhere(datasheet["worksheets"], { "id": worksheet_id });

                var worksheet_url = this.__url_feeds(datasheet_id, worksheet_id);
                var resize = new XmlModel({
                    "entry": {
                        "_xmlns": "http://www.w3.org/2005/Atom",
                        "_xmlns:gs": "http://schemas.google.com/spreadsheets/2006",
                        "id": worksheet_url,
                        "category": {
                            "_scheme": "http://schemas.google.com/spreadsheets/2006",
                            "_term": "http://schemas.google.com/spreadsheets/2006#worksheet"
                        },
                        "title": worksheet["title"],
                        "link": [
                            {
                                "_rel": "http://schemas.google.com/spreadsheets/2006#listfeed",
                                "_type": "application/atom+xml",
                                "_href": "https://spreadsheets.google.com/feeds/list/" + datasheet_id + "/" + worksheet_id + "/private/full"
                            },
                            {
                                "_rel": "http://schemas.google.com/spreadsheets/2006#cellsfeed",
                                "_type": "application/atom+xml",
                                "_href": "https://spreadsheets.google.com/feeds/cells/" + datasheet_id + "/" + worksheet_id + "/private/full"
                            },
                            {
                                "_rel": "self",
                                "_type": "application/atom+xml",
                                "_href": worksheet_url
                            },
                            {
                                "_rel": "edit",
                                "_type": "application/atom+xml",
                                "_href": worksheet_url + "/version"
                            }
                        ],
                        "gs:rowCount": numberOfRows,
                        "gs:colCount": numberOfColumns
                    }
                }, { "url": this.__api_worksheet(datasheet_id, worksheet_id) });

                var successFn = this.__put_data_in_chunks(data, {
                    "url": this.__api_cells(datasheet_id, worksheet_id),
                    "worksheet_url": this.__url_worksheet(datasheet_id, worksheet_id),
                    "worksheet_title": worksheet["title"]
                });
                resize.save({ "method": "PUT", "headers": { "If-Match": "*" }, "success": successFn });
            },

            __put_data_in_chunks: function(data, default_config) {
                if (_.isEmpty(data)) return function() {};

                var batch_size = 2000;
                var successFn = this.__put_data_in_chunks(_.rest(data, batch_size), default_config);
                return function() {
                    var cells = new FeedXmlModel({}, _.extend({ "cells": _.first(data, batch_size) }, default_config));
                    cells.save({ "headers": { "If-Match": "*" }, "success": successFn });
                }
            },

            __url_worksheet: function(datasheet_id, worksheet_id) {
                return "https://spreadsheets.google.com/feeds/cells/" + datasheet_id + "/" + worksheet_id + "/private/full";
            },

            __url_feeds: function(datasheet_id, worksheet_id) {
                return "https://spreadsheets.google.com/feeds/worksheets/" + datasheet_id + "/private/full/" + worksheet_id;
            },

            __api_worksheet: function(datasheet_id, worksheet_id) {
                var api = "svc/auth/providers/google_spreadsheets/feeds/worksheets/" + datasheet_id + "/private/full";
                if (!_.isEmpty(worksheet_id)) api += "/" + worksheet_id;
                return api;
            },

            __api_cells: function(datasheet_id, worksheet_id) {
                return "svc/auth/providers/google_spreadsheets/feeds/cells/" + datasheet_id + "/" + worksheet_id + "/private/full/batch";
            }
        });
    });
