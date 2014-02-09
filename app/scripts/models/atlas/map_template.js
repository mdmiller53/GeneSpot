define(["jquery", "underscore", "backbone"],
    function ($, _, Backbone) {
        return Backbone.Model.extend({
            initialize: function () {
                this.set("view_templates", []);
                this.set("view_classes", new Backbone.Model());
            },

            __register: function (view_template) {
                this.get("view_templates").push(view_template);

                var view_path = view_template.get("view");
                var view_classes = this.get("view_classes");
                var view_class = view_classes.get(view_path);
                if (_.isUndefined(view_class)) {
                    require([view_path], function (View) {
                        view_classes.set(view_path, View);
                        view_template.set("view_class", View);
                    });
                } else {
                    view_template.set("view_class", view_class);
                }
            }
        });
    });
