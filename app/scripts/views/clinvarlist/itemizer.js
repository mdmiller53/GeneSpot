define([ "jquery", "underscore", "backbone", "hbs!templates/clinvarlist/item" ],
    function ($, _, Backbone, ClinItemTpl) {
        return Backbone.View.extend({
            events: {
                "click .item-remover": function (e) {
                    $(e.target).parents("li.clinvar-item").remove();
                    _.defer(this.__update);
                }
            },

            initialize: function () {
                _.bindAll(this, "__reorder", "__update");
                this.model.on("change:clinical_variables", this.render, this);
            },

            render: function() {
                this.$el.empty();
                _.each(this.model.get("clinical_variables"), function (clin) {
                    this.$el.append(ClinItemTpl(_.extend({ "a_class": "item-remover" }, clin)));
                }, this);
                this.$el.sortable({ "update": this.__reorder, "handle": "button", "cancel": "" });
                return this;
            },

            __reorder: function () {
                _.defer(this.__update);
            },

            __update: function () {
                var current_clinlist = _.map(this.$el.find(".item-remover"), function (link) {
                    return { "id": $(link).data("id"), "label": $(link).data("label") };
                });
                this.model.set("clinical_variables", current_clinlist);
            }
        });
    });