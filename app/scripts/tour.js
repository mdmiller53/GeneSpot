define(["jquery", "underscore", "backbone", "tether", "shepherd"],
    function ($, _, Backbone) {
        return Backbone.View.extend({

            initialize: function () {
                this.model = this.options.model;
                this.model.on("load", this.__init_tour, this);
            },

            __init_tour: function () {
                console.log("tour.__init_tour");

                if (localStorage.getItem("dismiss-tour")) return;

                var tour = new Shepherd.Tour(this.model.get("defaults"));

                var exitButton = {
                    "text": "Dismiss",
                    "classes": "shepherd-button-secondary",
                    "action": function () {
                        localStorage.setItem("dismiss-tour", "dismissed");
                        return tour.hide();
                    }
                };

                var backButton = {
                    "text": "Back",
                    "classes": "shepherd-button-secondary",
                    "action": tour.back
                };

                var nextButton = {
                    "text": "Next",
                    "classes": "shepherd-button-example-primary",
                    "action": tour.next
                };

                var steps = this.model.get("steps");
                var numberOfSteps = _.keys(steps).length;
                if (numberOfSteps == 0) return;

                var currentStep = 0;
                _.each(steps, function (step, key) {
                    var btns = [ backButton, nextButton, exitButton ];
                    if (currentStep == 0) btns = [ nextButton, exitButton ];
                    if (currentStep == (numberOfSteps - 1)) btns = [ backButton, exitButton ];

                    tour.addStep(key, _.extend(step, { "buttons": btns }));
                    currentStep++;
                }, this);
                tour.start();
            },

            start: function() {
                localStorage.removeItem("dismiss-tour");
                this.__init_tour();
            }
        });
    });