define([ "jquery", "underscore", "backbone" ],
    function ($, _, Backbone) {
        return Backbone.View.extend({
            initialize: function() {
                _.bindAll(this, "render", "__typed");
            },

            render: function() {
                var genelist = WebApp.Lookups.get("genes").get("keys");
                if (_.isEmpty(genelist)) return this;

                this.$el.typeahead({
                    source: function (q, p) {
                        p(_.compact(_.flatten(_.map(q.toLowerCase().split(" "), function (qi) {
                            return _.map(genelist, function (geneitem) {
                                if (geneitem.toLowerCase().indexOf(qi) >= 0) return geneitem;
                                return null;
                            });
                        }))));
                    },

                    updater: this.__typed
                });

                return this;
            },

            __typed: function(gene) {
                this.trigger("typed", gene);
                return "";
            }
        });
    });