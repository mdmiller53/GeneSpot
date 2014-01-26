define([ "jquery", "underscore", "backbone" ],
    function ($, _, Backbone) {
        return Backbone.View.extend({
            initialize: function() {
                _.bindAll(this, "render", "typed");
            },

            render: function() {
                var clinical_variables = _.extend({}, WebApp.Lookups.get("clinical_variables").get("items"));
                if (_.isEmpty(clinical_variables)) return this;

                this.clinical_variables_by_id = _.groupBy(clinical_variables, "id");

                this.$el.typeahead({
                    source: function (q, p) {
                        p(_.compact(_.flatten(_.map(q.toLowerCase().split(" "), function (qi) {
                            return _.map(clinical_variables, function (item) {
                                if (item.id.toLowerCase().indexOf(qi) >= 0) return item.id;
                                if (item.label.toLowerCase().indexOf(qi) >= 0) return item.id;
                                return null;
                            });
                        }))));
                    },

                    updater: this.typed
                });

                return this;
            },

            typed: function(clin) {
                this.trigger("typed", _.first(this.clinical_variables_by_id[clin]));
                return "";
            }
        });
    });