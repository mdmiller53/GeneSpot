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

                                localStorage.clear();
                            });
                        }
                    });
                }
            },

            "initialize": function() {
                this.model = this.options.user;
                this.model.on("change", this.__load, this);
            },

            render: function() {
                this.$el.html(Tpl({}));
                return this;
            },

            "__load": function() {
                this.$el.html(Tpl(this.model.toJSON()));
                WebApp.GDrive.Workdesk.find();
            }
        });
    });
