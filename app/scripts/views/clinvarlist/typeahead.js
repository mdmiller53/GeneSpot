define([ "jquery", "underscore", "backbone" ],
    function ($, _, Backbone) {
        return Backbone.View.extend({
            "clinical_variables_by_label": {},

            initialize: function() {
                _.bindAll(this, "render", "__typed");
            },

            render: function() {
                var url = this.options["url"] + "/search/label";
                var label_bucket = this.clinical_variables_by_label;

                this.$el.typeahead({
                    "source": function (q, p) {
                        $.ajax({
                            "url": url,
                            "data": { "term": q },
                            "traditional": true,
                            "dataType": "json",
                            "success": function (json) {
                                if (json && json["items"]) {
                                    var matching_labels = _.compact(_.map(json["items"], function(item) {
                                        label_bucket[item["label"]] = item;
                                        return item["label"];
                                    }));

                                    if (!_.isEmpty(matching_labels)) p(matching_labels.sort());
                                }
                            }
                        });
                    },
                    "items": 16,
                    "minLength": 2,
                    "updater": this.__typed
                });

                return this;
            },

            __typed: function(clin) {
                this.trigger("typed", this.clinical_variables_by_label[clin]);
                return "";
            }
        });
    });