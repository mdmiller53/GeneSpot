define(["jquery", "underscore", "bootstrap", "views/sign_in", "hbs!templates/topbar", "hbs!templates/about_link"],
    function ($, _, Bootstrap, SignInView, Tpl, AboutLinkTpl) {

        return Backbone.View.extend({
            render: function() {
                this.$el.html(Tpl({ "title": WebApp.Display.get("title") || "ISB" }));

                this.init_about_menu();
                this.init_sign_in();

                return this;
            },

            init_about_menu: function () {
                var aboutLinks = WebApp.Display.get("aboutLinks") || [];
                if (!_.isEmpty(aboutLinks)) {
                    var UL = this.$el.find(".about-links");
                    UL.empty();
                    _.each(aboutLinks, function (aboutLink) {
                        if (aboutLink.divider) {
                            UL.append("<li class=\"divider\"></li>");
                            if (aboutLink.header) {
                                UL.append("<li class=\"nav-header\">" + aboutLink.header + "</li>");
                            }
                        } else {
                            UL.append(AboutLinkTpl(aboutLink));
                        }
                    });
                }
            },

            init_sign_in: function () {
                var $signinEl = this.$(".signin-container");
                var addAuthProviders = function (json) {
                    _.each(json["providers"], function (provider) {
                        var sign_in_view = new SignInView({ "provider": provider });
                        $signinEl.append(sign_in_view.render().el);
                    });
                };

                // prepare sign in process in case of 403 (Forbidden)
                var signInProcessStart = _.once(function () {
                    $.ajax({ url: "svc/auth/providers", type: "GET", dataType: "json", success: addAuthProviders });
                });

                $(document).ajaxError(function (event, request) {
                    if (request.status == 403) signInProcessStart();
                });

                $.ajax({ url: "svc/auth/whoami", method: "GET", context: this, success: addAuthProviders });
            }
        });
    });
