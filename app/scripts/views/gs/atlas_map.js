define([ "jquery", "underscore", "backbone",
    "views/gs/atlas_map_tab", "hbs!templates/gs/atlas_map", "hbs!templates/open_link" ],
    function ($, _, Backbone, ViewSpec, Tpl, OpenLinkTpl) {
        return Backbone.View.extend({
            events: {
                "click a.refresh-me": function () {
                    this.$el.find(".download-link").remove();
                    this.trigger("refresh");
                },
                "click .close": function() {
                    this.$el.hide({ "always": this.closeOut });
                }
            },

            initialize: function() {
                _.bindAll(this, "closeOut", "append_downloads");

                var uid = Math.round(Math.random() * 10000);
                this.view_specs = _.map(this.options["views"], function(view_spec) {
                    return new ViewSpec(_.extend({ "uid": uid++, "parent_id": this.id }, view_spec));
                }, this);
            },

            render: function () {
                this.$el.html(Tpl(_.extend({
                    "id": this.id,
                    "downloads": this.has_downloads(),
                    "views": this.view_specs
                }, _.omit(this.options, "views"))));

                this.$el.find(".info-me").popover({
                    "title": "Description",
                    "trigger": "hover",
                    "content": this.options["description"]
                });

                _.each(this.view_specs, function (view_spec) {
                    view_spec["$targetEl"] = this.$el.find("#tab_" + view_spec["uid"]);
                    view_spec.on("ready", function(v) {
                        this.append_downloads(view_spec, v);
                    }, this);
                }, this);

                this.$el.draggable({ "scroll": true, "cancel": ".map-contents" });

                return this;
            },

            closeOut: function() {
                this.$el.empty().remove();
            },

            append_downloads: function(view_spec, v) {
                var $targetEl = this.$el.find(".download-links");
                if (view_spec["datamodel"] && v["model"]) {
                    var m = v["model"];
                    var url = this.outputTsvQueryUrl(m.get("url"), m.get("query"), view_spec["label"]);
                    $targetEl.append(OpenLinkTpl({ "label": view_spec["label"], "url": url, "li_class": "download-link" }));
                }

                if (view_spec["datamodels"] && v.options["models"]) {
                    _.each(v.options["models"], function(m, key) {
                        var url = this.outputTsvQueryUrl(m.get("url"), m.get("query"), view_spec["label"] + "_" + key);
                        $targetEl.append(OpenLinkTpl({ "label": view_spec["label"] + " (" + key + ")", "url": url }));
                    }, this);
                }

                if (view_spec["by_tumor_type"] && v.options["models"]) {
                    _.each(v.options["models"], function(m, key) {
                        var url = this.outputTsvQueryUrl(m.get("url"), m.get("query"), view_spec["label"] + "_" + key);
                        $targetEl.append(OpenLinkTpl({ "label": view_spec["label"] + " (" + key + ")", "url": url }));
                    }, this);
                }
            },

            has_downloads: function() {
                return _.find(this.view_specs, function(view_spec) {
                    return view_spec["datamodel"] || view_spec["datamodels"];
                });
            },

            outputTsvQueryUrl: function(url, query, label) {
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