define(["jquery", "underscore", "backbone", "hbs!templates/google_sign_in"],
    function ($, _, Backbone, Tpl) {
        return Backbone.View.extend({
            events: {
                "click .signout-link": function() {
                    $.ajax({
                        "url": "svc/auth/signout/google",
                        "method": "GET",
                        "success": function() {
                            _.defer(function() {
                                document.location = document.location.href;
                            });
                        }
                    });
                }
            },

            render: function() {
                this.$el.html(Tpl({}));
                this.options.user.on("load", function() {
                    this.$el.html(Tpl(this.options.user.toJSON()));
                }, this);
                return this;
            }
        });
    });
