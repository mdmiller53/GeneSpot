define([ "jquery", "underscore", "backbone" ],
    function ($, _, Backbone) {
        return Backbone.View.extend({
            initialize: function() {
                _.bindAll(this, "render", "__typed");
            },

            render: function() {
                var all_tags_url = this.options["url"] + "/search/tag";
                this.$el.typeahead({
                    "source": function(q, p) {
                        $.ajax({
                            "url": all_tags_url,
                            "data": { "term": q },
                            "traditional": true,
                            "dataType": "json",
                            "success": function (json) {
                                if (json && json["items"]) {
                                    var matching_tags = _.uniq(_.pluck(json["items"], "tag"));
                                    if (!_.isEmpty(matching_tags)) p(matching_tags.sort());
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

            __typed: function(gene) {
                this.trigger("typed", gene);
                return "";
            }
        });
    });