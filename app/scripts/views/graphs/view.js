define(["jquery", "underscore", "backbone", "hbs!templates/graphs/container"],
    function ($, _, Backbone, Tpl) {
        return Backbone.View.extend({
            events: {
                "click .dropdown-menu.foobar a": function (e) {
                    var foobar = $(e.target).data("id");
                }
            },

            initialize: function () {
                console.debug("views/graphs.initialize");
                this.model = this.options.models["graph_db"];
            },

            render: function () {
                console.debug("views/graphs.render");

                this.model.on("load", this.__load, this);
                this.$el.html(Tpl({}));
                return this;
            },

            __load: function () {
                console.debug("views/graphs.__load");
                var items = _.map(this.model.get("items"), function (item) {
                    return item.toJSON();
                }, this);
                this.$el.html(Tpl({"items": items}));
            }
        });
    });
