define(["jquery", "underscore", "backbone", "hbs!templates/sign_in"],
    function ($, _, Backbone, Tpl) {
        return Backbone.View.extend({
            events: {
                "click .signout-link": function() {
                    $.ajax({
                        url: "svc/auth/signout/" + this.provider.id,
                        method: "GET",
                        success: function() {
                            _.defer(function() {
                                document.location = document.location.href;
                            });
                        }
                    });
                }
            },

            initialize: function() {
                this.provider = this.options.provider || {};
            },

            render: function() {
                this.$el.append(Tpl({
                    "provider": this.provider,
                    "active_user": this.provider["user"]
                }));
                return this;
            }
        });
    });
