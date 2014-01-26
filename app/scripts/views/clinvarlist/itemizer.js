define([ "jquery", "underscore", "backbone", "hbs!templates/clinvarlist/item" ],
    function ($, _, Backbone, ClinItemTpl) {
        return Backbone.View.extend({
            events: {
                "click .item-remover": function (e) {
                    $(e.target).parents("li.clinvar-item").remove();
                    _.defer(this.update_clinvarlist);
                }
            },

            initialize: function () {
                _.bindAll(this, "reorder_clinvar_els", "update_clinvarlist");
                this.model.on("change:clinical_variables", this.render, this);
            },

            render: function() {
                this.$el.empty();
                _.each(this.model.get("clinical_variables"), function (clin) {
                    this.$el.append(ClinItemTpl(_.extend({ "a_class": "item-remover" }, clin)));
                }, this);
                this.$el.sortable({ "update": this.reorder_clinvar_els, "handle": "button", "cancel": "" });
                return this;
            },

            reorder_clinvar_els: function () {
                _.defer(this.update_clinvarlist);
            },

            update_clinvarlist: function () {
                var current_clinlist = _.map(this.$el.find(".item-remover"), function (link) {
                    return { "id": $(link).data("id"), "label": $(link).data("label") };
                });
                this.model.set("clinical_variables", current_clinlist);
            }
        });
    });