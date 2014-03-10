define([ "jquery", "underscore", "backbone", "hbs!templates/datasheets/item" ],
    function ($, _, Backbone, Tpl) {
        return Backbone.View.extend({

            render: function() {
                console.debug("views/datasheets/itemizer.render");
                this.$el.empty();
                _.each(this.model.get("datasheets"), function (datasheet) {
                    this.$el.append(Tpl(_.extend({ "a_class": "item-remover" }, datasheet)));
                }, this);
                return this;
            }

        });
    });