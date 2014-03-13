define([
    "jquery",
    "underscore",
    "bootstrap",

    "views/data_menu_modal",
    "views/data_menu_sections",
    "views/sign_in",
    "hbs!templates/topbar",
    "hbs!templates/about_link"
],
    function ($, _, Bootstrap, DataMenuModal, DataMenuSections, SignInView, Tpl, AboutLinkTpl) {

        return Backbone.View.extend({
            render: function() {
                this.$el.html(Tpl({ "title": WebApp.Display.get("title") || "ISB" }));

                this.init_about_menu();
                this.init_sign_in();

                return this;
            },

//            init_data_menu: function () {
//                console.log("topbar:init_data_menu");
//                var dataMenuSectionsView = new DataMenuSections({
//                    sections: _.map(_.keys(WebApp.Datamodel.attributes), function (section_id) {
//                        return {
//                            data: WebApp.Datamodel.get(section_id),
//                            id: section_id
//                        };
//                    })
//                });
//                dataMenuSectionsView.on("select-data-item", function (selected) {
//                    new DataMenuModal(_.extend({ el: $("#modal-container") }, selected));
//                });
//                $(".data-dropdown").append(dataMenuSectionsView.render().el);
//            },

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
                var _this = this;
                var addAuthProviders = function (json) {
                    _.each(json["providers"], function (provider) {
                        var sign_in_view = new SignInView({ "provider": provider });
                        _this.$(".signin-container").append(sign_in_view.render().el);
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
