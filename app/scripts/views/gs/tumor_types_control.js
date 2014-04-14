define(["jquery", "underscore", "backbone", "hbs!templates/gs/tumor_types_container"],
    function ($, _, Backbone, Tpl) {
        return Backbone.View.extend({

            events: {
                "click a.apply": function() {
                    WebApp.Router.atlas();
                }
            },

            initialize: function () {
                _.bindAll(this, "mark_selected", "change_selected");

                this.tumor_types = _.sortBy(_.extend([], WebApp.Lookups.get("tumor_types").get("items")), "id");
                this.tumor_types_by_id = _.indexBy(this.tumor_types, "id");

                var stored_tumor_types = (localStorage.getItem("selected-tumor-types") || "").split(",");
                if (!_.isEmpty(_.compact(stored_tumor_types))) {
                    _.each(this.tumor_types, function(tumor_type) {
                        tumor_type.isChecked = _.contains(stored_tumor_types, tumor_type.id);
                    });
                }

                localStorage.setItem("selected-tumor-types", _.where(this.tumor_types, { "isChecked": true }).join(","));
            },

            render: function () {
                this.$el.html(Tpl({ "tumor_types": this.tumor_types }));
                this.$el.find(".tumor-types-selector").find(":checkbox").change(this.change_selected);
                this.$el.find(".tumor-types-selector").find(":checkbox").change(function(e) {
                    $(e.target).parents("tr").toggleClass("success");
                });
                _.defer(this.mark_selected);
                return this;
            },

            change_selected: function() {
                this.trigger("updated", this.mark_selected());
            },

            mark_selected: function () {
                var selected_tumor_types = _.map(this.$el.find(".tumor-types-selector input:checked"), function(checkbox) {
                    var id = $(checkbox).data("id");
                    return this.tumor_types_by_id[id];
                }, this);
                localStorage.setItem("selected-tumor-types", _.pluck(selected_tumor_types, "id").join(","));
                WebApp.UserPreferences.set("selected_tumor_types", selected_tumor_types);
                return selected_tumor_types;
            }
        });
    });
