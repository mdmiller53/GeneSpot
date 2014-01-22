define([ "jquery", "underscore", "backbone", "hbs!templates/line_item" ],
    function ($, _, Backbone, LineItemTpl) {
        return Backbone.View.extend({
            render: function() {
                console.log("genes/typeahead.render");
                var genelist = WebApp.Lookups.get("genes").get("keys");
                if (_.isEmpty(genelist)) return;

                var _this = this;
                this.$el.typeahead({
                    source: function (q, p) {
                        p(_.compact(_.flatten(_.map(q.toLowerCase().split(" "), function (qi) {
                            return _.map(genelist, function (geneitem) {
                                if (geneitem.toLowerCase().indexOf(qi) >= 0) return geneitem;
                            });
                        }))));
                    },

                    updater: function (gene) {
                        _this.trigger("typed", gene);
                        return "";
                    }
                });

                return this;
            }
        });
    });