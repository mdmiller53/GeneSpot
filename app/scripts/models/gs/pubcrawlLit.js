define(["jquery", "underscore", "backbone"],
    function ($, _, Backbone) {
        return Backbone.Model.extend({

            initialize: function (options) {
                _.extend(this, options);
            },

            url: function () {
                return this.get("data_uri") + "?q=%2Btext%3A%28'" + this.genes[0].toLowerCase() + "'%29+%2Btext%3A%28'cancer'%29&fq=pub_date_year:[1991 TO 2012]&qt=distributed_select&sort=pub_date_year desc&wt=json&rows=1000&" +
                    "hl.q=abstract_text%3Acancer article_title%3Acancer abstract_text%3A" + this.genes[0].toLowerCase() + " article_title%3A" + this.genes[0].toLowerCase();
            },

            parse: function (response) {
                this.docs = [];
                if (response.response.docs != null) {
                    for (var i = 0; i < response.response.docs.length; i++) {
                        var doc = response.response.docs[i];
                        if (response.highlighting[doc.pmid] != undefined) {
                            if (response.highlighting[doc.pmid].abstract_text != undefined) {
                                doc.abstract_text = response.highlighting[doc.pmid].abstract_text;
                            }
                            if (response.highlighting[doc.pmid].article_title != undefined) {
                                doc.article_title = response.highlighting[doc.pmid].article_title;
                            }
                        }

                        this.docs.push(doc);
                    }
                }

                return;

            }
        });
    });
