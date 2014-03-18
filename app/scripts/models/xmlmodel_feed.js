define(["jquery", "underscore", "backbone", "models/xmlmodel"],
    function ($, _, Backbone, XmlModel) {
        return XmlModel.extend({
            initialize: function(attributes, options) {
                var worksheet_url = options["worksheet_url"];
                var cells = options["cells"];

                this.set("feed", {
                    "_xmlns": "http://www.w3.org/2005/Atom",
                    "_xmlns:gs":"http://schemas.google.com/spreadsheets/2006",
                    "_xmlns:batch": "http://schemas.google.com/gdata/batch",
                    "id": worksheet_url,
                    "entry": _.map(cells, function(cell) {
                        var cellUrl = worksheet_url + "/R" + cell["_row"] + "C" + cell["_col"];
                        return {
                            "_xmlns": "http://www.w3.org/2005/Atom",
                            "_xmlns:gs": "http://schemas.google.com/spreadsheets/2006",
                            "title": options["worksheet_title"],
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
                });
            }
        });

    });