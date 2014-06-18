define([ "jquery", "underscore", "backbone" ],
    function ($, _, Backbone) {
        return Backbone.View.extend({
            initialize: function() {
                _.bindAll(this, "render", "__typed");
            },

            render: function() {
                var clinical_variables = _.extend({}, WebApp.Lookups.get("clinical_variables").get("items"));
                if (_.isEmpty(clinical_variables)) return this;

                this.clinical_variables_by_label = _.groupBy(clinical_variables, "label");

                this.$el.typeahead({
                    source: function (q, p) {
                        p(_.compact(_.flatten(_.map(q.toLowerCase().split(" "), function (qi) {
                            return _.map(clinical_variables, function (item) {
                                if (item["label"].toLowerCase().indexOf(qi) >= 0) return item["label"];
                                return null;
                            });
                        }))));
                    },

                    updater: this.__typed
                });

                return this;
            },

            __typed: function(clin) {
                this.trigger("typed", _.first(this.clinical_variables_by_label[clin]));
                return "";
            }
        });
    });