define([
    "jquery",
    "underscore",
    "bootstrap",
    "bootstrap-dropdown-checkbox",

    "views/data_menu_modal",
    "views/data_menu_sections",
    "views/sessions_view",

    "hbs!templates/topbar",
    "hbs!templates/sign_in_modal",
    "hbs!templates/hangout_link",
    "hbs!templates/about_link",

    "views/sign_in",
    "views/cloud_storage_view"
],

    function ($, _, Bootstrap, DropDownCheckbox,
              DataMenuModal, DataMenuSections, SessionsView,
              Template, SignInModal, HangoutLink, AboutLink, SignInView, CloudStorageView) {

        return Backbone.View.extend({
            events: {
                "click .signin": function () {
                    this.$signInModal.modal("toggle");
                    return false;
                }
            },

            initialize: function () {
                _.bindAll(this, "init_data_menu", "init_sessions_menu", "init_hangout_link", "init_about_menu", "init_tumor_types_menu");

                this.$el.html(Template());

                this.initSignIn();
                _.defer(function () {
                    new CloudStorageView();
                });

                _.defer(this.init_data_menu);
                _.defer(this.init_sessions_menu);
                _.defer(this.init_hangout_link);
                _.defer(this.init_about_menu);
                _.defer(this.init_tumor_types_menu);

                this.$el.find(".titled").html(WebApp.Display.get("title") || "AppTemplate");
            },

            init_data_menu: function () {
                console.log("topbar:init_data_menu");
                var dataMenuSectionsView = new DataMenuSections({
                    sections: _.map(_.keys(WebApp.Datamodel.attributes), function (section_id) {
                        return {
                            data: WebApp.Datamodel.get(section_id),
                            id: section_id
                        };
                    })
                });

                dataMenuSectionsView.on("select-data-item", function (selected) {
                    new DataMenuModal(_.extend({ el: $("#modal-container") }, selected));
                });

                $(".data-dropdown").append(dataMenuSectionsView.render().el);
            },

            init_sessions_menu: function () {
                console.log("topbar:init_sessions_menu");
                var sessionsView = new SessionsView();
                this.$el.find(".sessions-container").html(sessionsView.render().el);
            },

            init_hangout_link: function () {
                var hangoutUrl = WebApp.Display.get("hangoutUrl");
                if (hangoutUrl) {
                    this.$el.find(".hangout-container").html(HangoutLink({ "url": hangoutUrl }));
                }
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
                            UL.append(AboutLink(aboutLink));
                        }
                    });
                }
            },

            initSignIn: function () {
                this.$signInModal = $("body").append(SignInModal()).find(".signin-container");

                var _this = this;
                var addAuthProviders = function (json) {
                    _.each(json.providers, function (provider) {
                        var sign_in_view = new SignInView({ "provider": provider });
                        _this.$signInModal.find(".modal-body").append(sign_in_view.render().el);
                        _this.$signInModal.find(".signout-all").click(function () {
                            sign_in_view.signout();
                        });
                        if (provider.id == "google") {
                            if (provider.active) _this.$el.find(".requires-google-oauth").show();
                            sign_in_view.on("signout", function () {
                                _this.$el.find(".requires-google-oauth").hide();
                            });
                        }
                    });
                };

                // prepare sign in process in case of 403 (Forbidden)
                var signInProcessStart = _.once(function () {
                    $.ajax({
                        url: "svc/auth/providers",
                        type: "GET",
                        dataType: "json",
                        success: function (json) {
                            addAuthProviders(json);
                            _this.$signInModal.modal("show");
                            _this.$signInModal.find(".signout-all").click();
                        }
                    });
                });

                $(document).ajaxError(function (event, request) {
                    if (request.status == 403) signInProcessStart();
                });

                $.ajax({ url: "svc/auth/whoami", method: "GET", context: this, success: addAuthProviders });
            },

            init_tumor_types_menu: function () {
                var data = _.map(WebApp.Lookups.get("tumor_types"), function (obj) {
                    return { "label": obj.id + " :: " + obj.label, "isChecked": obj.isSelected, "id": obj.id };
                });
                var hasChecks = _.find(data, function (item) {
                    return item.isChecked;
                });
                if (_.isUndefined(hasChecks)) _.first(data).isChecked = true;

                $(".tumor-types-selector").dropdownCheckbox({ "data": data, "title": "Tumor Types" });
                $(".tumor-types-selector").find(":checkbox").change(function () {
                    WebApp.Events.trigger("webapp:tumor-types:selector:change");
                });
                WebApp.Events.trigger("webapp:tumor-types:selector:init");
            }
        });
    });
