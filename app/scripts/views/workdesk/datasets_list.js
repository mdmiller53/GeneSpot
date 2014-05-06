define(["jquery", "underscore", "backbone",
        "hbs!templates/workdesk/datasets_list"],
    function ($, _, Backbone, Tpl) {
        return Backbone.View.extend({
            "events": {
                "click .select-all-datasets": function() {
                    var isChecked = this.$(".select-all-datasets").is(":checked");
                    this.$(".select-item-dataset").prop("checked", isChecked);
                }
            },

            "initialize": function() {
                WebApp.Events.on("webapp:ready:datamodel", this.render, this);
            },

            "render": function() {
                var modelspecs = WebApp.Datamodel.list_modelspecs();
                this.$el.html(Tpl({ "modelspecs": WebApp.Datamodel.list_modelspecs() }));
                return this;
            }
        })
    });