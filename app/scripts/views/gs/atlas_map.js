define([ "jquery", "underscore", "backbone", "hbs!templates/gs/atlas_map" ],
    function ($, _, Backbone, Tpl) {
        return Backbone.View.extend({
            events: {
                "click a.refresh-me": function () {
                    this.trigger("refresh");
                },
                "click .close": function() {
                    this.$el.hide({ "always": this.closeOut });
                },
                "click a.download-link": function (e) {
                    console.log("download-link:" + JSON.stringify($(e.target).data()));
                }
            },

            initialize: function() {
                _.bindAll(this, "closeOut");
            },

            render: function () {
                var uid = Math.round(Math.random() * 10000);
                var downloads = _.compact(_.flatten(_.map(this.options["views"], function (view_spec) {
                    view_spec["uid"] = uid++;
                    view_spec["view"] = view_spec["view"] || view_spec["id"];
                    if (view_spec["datamodel"]) {
                        return _.extend({}, view_spec, { "datamodel": "model" });
                    }
                    if (view_spec["datamodels"]) {
                        return _.map(view_spec["datamodels"], function(datamodel, key) {
                            return {
                                "label": view_spec["label"] + " (" + key + ")",
                                "uid": view_spec["uid"],
                                "datamodel": key
                            };
                        });
                    }
                })));

                this.$el.html(Tpl(_.extend({ "downloads": downloads }, this["options"])));
                this.$el.find(".info-me").popover({
                    "title": "Description",
                    "trigger": "hover",
                    "content": this.options["description"]
                });

                _.each(this.options["views"], function (view_spec) {
                    view_spec["$targetEl"] = this.$el.find("#tab_" + view_spec["uid"]);
                }, this);

                return this;
            },

            closeOut: function() {
                this.$el.empty().remove();
            },

            outputTsvQuery: function (query) {
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
                return qsarray.join("&");
            }
        });
    });