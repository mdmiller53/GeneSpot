define([
    "jquery",
    "underscore",
    "backbone"
],
function ($, _, Backbone
) {
    var URL = "svc/collections/samplelists";

    return Backbone.Collection.extend({
        "url": URL,

        "model": Backbone.Model.extend({
            idAttribute: "_id"
        }),

        initialize: function() {
            this.on("add", this.__add_handler, this);
            this.on("remove", this.__remove_handler, this);
            this.on("change", this.__change_handler, this);
        },

        __add_handler: function() {

        },

        __remove_handler: function(model, collection, index) {
            Backbone.sync("delete", new Backbone.Model({}), {
                "url": URL + "/" + model["id"], "success": this.__refresh
            });
        },

        __change_handler: function() {

        },

        __createModelForSync: function(model) {
            var data = _.omit(model.toJSON(), "uri", "id", "_id");
            return new Backbone.Model(data);
        },

        updateSampleList: function(model_id, sample_list) {
            var model = this.get(model_id);
            var successFn = _.bind(function() {
                model.trigger("change");
            }, this);

            model.set({
                samples: sample_list
            });

            this.sync("update", this.__createModelForSync(model), {
                url: URL + "/" + model["id"],
                success: successFn,
                context: this
            });
        },

        updateSampleListByUnion: function(model_id, sample_list) {
            var sample_id_set = this.get(model_id).get("samples");
            Array.prototype.push.apply(sample_id_set, sample_list);
            this.updateSampleList(model_id, _.unique(sample_id_set));
        },

        addSampleList: function(label, sample_id_array) {
            var sample_list_model = new this.model({
                "label": label,
                "samples": sample_id_array
            });

            var successFn = _.bind(function(response, status) {
                this.add(_.extend(sample_list_model, {"id": response["id"]}));
            }, this);

            this.sync("create", sample_list_model, {
                url: URL,
                success: successFn,
                context: this
            });
        }
    });
});
