define([ "jquery", "underscore", "backbone", "hbs!templates/gs/atlas_map", "hbs!templates/open_link" ],
    function ($, _, Backbone, Tpl, OpenLinkTpl) {
        return Backbone.View.extend({
            events: {
                "click a.refresh-me": function () {
                    this.$(".download-link").remove();
                    this.trigger("refresh", this);
                },
                "click .close": function() {
                    this.$el.hide({ "always": this.__close });
                }
            },

            initialize: function() {
                _.bindAll(this, "__close");

                this.id = "atlas_map_" + Math.round(Math.random() * 10000);
                this.views = this.options["views"];
            },

            render: function () {
                var has_downloads = _.find(this.views, function(v) {
                    return v.options && (v.options["datamodel"] || v.options["datamodels"]);
                });

                this.$el.html(Tpl(_.extend({ "id": this.id, "downloads": has_downloads }, this.options, {
                    "views": _.map(this.views, function(view) {
                        return { "uid": view.id, "label": view.options["label"] };
                    })
                })));

                this.$(".info-me").popover({
                    "title": "Description",
                    "trigger": "hover",
                    "content": this.options["description"]
                });

                _.each(this.views, this.__append_downloads, this);
                _.each(this.views, function (view) {
                    this.$("#tab_" + view.id).html(view.render().el);
                    view.delegateEvents();
                }, this);

                this.$el.draggable({ "scroll": true, "cancel": ".map-contents" });
                this.$(".atlas-map").resizable({ "grid": [ 20, 10 ] });
                return this;
            },

            __close: function() {
                this.$el.empty().remove();
            },

            __append_downloads: function(v) {
                var $targetEl = this.$(".download-links");
                if (_.has(v.options, "model")) {
                    var label = v.options["label"];
                    var m = v.options["model"];
                    var url = this.__tsv_query_url(m["url"], m["query"], label);
                    $targetEl.append(OpenLinkTpl({ "label": label, "url": url, "li_class": "download-link" }));
                }

                if (_.has(v.options, "models")) {
                    _.each(v.options["models"], function(m, key) {
                        if (m["by_tumor_type"]) {
                            _.each(m, function(mm, tumor_type) {
                                if (_.isEqual(tumor_type, "by_tumor_type")) return;
                                var filelabel = v.options["label"] + "_" + tumor_type + "_" + key;
                                var linklabel = v.options["label"] + " (" + key + "): " + tumor_type;
                                var url = this.__tsv_query_url(mm["url"], mm["query"], filelabel);
                                $targetEl.append(OpenLinkTpl({ "label": linklabel, "url": url }));
                            }, this);
                        } else {
                            var filelabel = v.options["label"] + "_" + key;
                            var linklabel = v.options["label"] + " (" + key + ")";
                            var url = this.__tsv_query_url(m["url"], m["query"], filelabel);
                            $targetEl.append(OpenLinkTpl({ "label": linklabel, "url": url }));
                        }
                    }, this);
                }
            },

            __tsv_query_url: function(url, query, label) {
                var qsarray = [];
                _.each(query, function (values, key) {
                    if (_.isArray(values)) {
                        _.each(values, function (value) {
                            qsarray.push(key + "=" + value);
                        })
                    } else {
                        qsarray.push(key + "=" + values);
                    }
                });
                qsarray.push("output=tsv");
                if (label) qsarray.push("output_filename=" + label.split(" ").join("_") + ".tsv");
                return url + "?" + qsarray.join("&");
            }
        });
    });