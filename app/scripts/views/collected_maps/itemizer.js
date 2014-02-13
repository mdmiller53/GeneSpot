define([ "jquery", "underscore", "backbone", "hbs!templates/collected_maps/item" ],
    function ($, _, Backbone, CollectedMapTpl) {
        return Backbone.View.extend({

            render: function() {
                console.debug("views/collected_maps/itemizer.render");
                this.$el.empty();
                _.each(this.model.get("maps"), function (collected_map) {
                    this.$el.append(CollectedMapTpl(_.extend({ "a_class": "item-remover" }, collected_map)));
                }, this);
                return this;
            }

        });
    });