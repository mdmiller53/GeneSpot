define(["jquery", "underscore", "bootstrap",
    "hbs!templates/topbar", "hbs!templates/about_links",
    "views/google_sign_in"],
    function ($, _, Bootstrap, Tpl, AboutLinksTpl, GoogleSignInView) {

        return Backbone.View.extend({
            render: function() {
                this.$el.html(Tpl({ "title": WebApp.Display.get("title") || "ISB" }));

                this.__init_about_menu();
                this.__init_sign_in();
                this.__init_error_handlers();

                WebApp.Search.setElement(this.$(".search-box"));
                WebApp.Search.render();
                return this;
            },

            __init_about_menu: function () {
                var aboutLinks = WebApp.Display.get("aboutLinks") || [];
                if (!_.isEmpty(aboutLinks)) {
                    this.$(".about-links").html(AboutLinksTpl({ "links": aboutLinks }));
                }
            },

            __init_sign_in: function () {
                var userinfo = new Backbone.Model();

                var g_si_view = new GoogleSignInView({ "user": userinfo });
                this.$(".signin-container").append(g_si_view.render().el);

                userinfo.fetch({
                    "url": "svc/auth/providers/google_apis/oauth2/v1/userinfo",
                    "success": function() {
                        userinfo.trigger("load");
                    }
                });
            },

            __init_error_handlers: function() {
                var $403 = this.$(".ajax-forbidden-access");
                $(document).ajaxError(function (event, request) {
                    if (request.status == 403) {
                        $403.show();
                        return;
                    }
//                    if (request.status == 401) {
//                        $.ajax({
//                            "url": "svc/auth/signin/google/refresh", "method": "GET", "context": this,
//                            "success": function(json) {
//                                console.debug("topbar_view.__init_error_handlers:ajaxError:auth/refresh:success");
//                            },
//                            "error": function(json) {
//                                console.debug("topbar_view.__init_error_handlers:ajaxError:auth/refresh:error");
//                            }
//                        })
//                    }
                });
            }
        });
    });
