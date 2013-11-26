define(["jquery", "underscore", "backbone", "hbs!templates/gs/atlas_quick_tutorial"],
    function ($, _, Backbone, Tpl) {
        return Backbone.View.extend({
            initialize: function () {
                var _id = Math.round(Math.random() * 100000);
                this.$el.html(Tpl({"id": _id}));
            }
        });
    });