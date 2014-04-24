define([ "jquery", "underscore", "backbone", "hbs!templates/gs/atlas_map", "hbs!templates/open_links_grouped" ],
    function ($, _, Backbone, Tpl, GroupedLinksTpl) {
        return Backbone.View.extend({
            events: {
                "click a.refresh-me": function () {
                    this.$(".download-links").empty();
                    this.trigger("refresh", this);
                },
                "click .close": function(e) {
                    var map_id = $(e.target).data("id");
                    var openMaps = (localStorage.getItem("open-maps") || "").split(",");
                    localStorage.setItem("open-maps", _.unique(_.without(openMaps, map_id)));

                    this.$el.hide({ "always": this.__close });
                },
                "click .collect-me": function() {
                    this.trigger("collect", this);
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
                this.options.isOpen = false;
            },

            __append_downloads: function(v) {
                var $targetEl = this.$(".download-links");
                var view_label = v.options["label"];

                if (_.has(v.options, "model")) {
                    var m = v.options["model"];
                    if (m["do_fetch"]) {
                        var url = this.__tsv_query_url(m, view_label.toLowerCase());
                        $targetEl.append(GroupedLinksTpl({ "header": view_label, "groups": [
                            { "label": view_label, "url": url }
                        ] }));
                    }
                }

                if (_.has(v.options, "models")) {
                    var groups = _.compact(_.map(v.options["models"], function (m, datamodel_key) {
                        var d_label = datamodel_key.replace("_", " ");
                        var f_label = (view_label + "_" + datamodel_key).toLowerCase();
                        if (m["by_tumor_type"]) {
                            var links = _.compact(_.map(m["by_tumor_type"], function (mm, tumor_type) {
                                if (mm["do_fetch"]) {
                                    var url = this.__tsv_query_url(mm, f_label + "_" + tumor_type);
                                    return { "group": d_label, "label": tumor_type, "url": url };
                                }
                                return null;
                            }, this), this);

                            if (!_.isEmpty(links)) {
                                return { "group": d_label, "links": links };
                            }
                        } else {
                            if (m["do_fetch"]) {
                                var url = this.__tsv_query_url(m, f_label);
                                return { "label": d_label, "url": url };
                            }
                        }
                        return null;
                    }, this), this);
                    if (!_.isEmpty(groups)) {
                        $targetEl.append(GroupedLinksTpl({ "header": view_label, "groups": groups }));
                    }
                }
            },

            __tsv_query_url: function(model, label) {
                var url = model["url"];
                var query = model["query"];
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