define(["jquery", "underscore", "backbone"],
    function ($, _, Backbone) {

        return Backbone.Model.extend({
            "initialize": function (options) {
                _.bindAll(this, "fetch", "sync", "after_sync", "to_localStorage", "from_localStorage");
            },

            "sync": function (method, model, options) {
                if (_.isEqual(method, "read")) {
                    if (this.from_localStorage()) {
                        this.after_sync();
                        if (_.isFunction(options["success"])) _.defer(options["success"]);
                        return;
                    }

                    var _this = this;
                    var successFn = function(data) {
                        _this.to_localStorage(data);
                        _this.after_sync();
                        if (_.isFunction(options["success"])) _.defer(options["success"]);
                    };

                    return Backbone.Model.prototype.sync.call(this, method, model, _.extend({}, options, { "success": successFn }));
                }
                return Backbone.Model.prototype.sync.call(this, method, model, options);
            },

            "from_localStorage": function () {
                var storage_key = this.get("storage_key");
                console.log("backbone:localsync:from_localStorage:" + storage_key);

                var matched_keys = _.compact(_.map(_.keys(localStorage), function (key) {
                    if (_.isEqual(key.substring(0, "data_types".length), "data_types")) return null;

                    if (_.isEqual(key.substring(0, storage_key.length), storage_key)) {
                        var data_type = localStorage.getItem("data_types:" + key) || "json";
                        if (_.isEqual(data_type, "string")) {
                            return { "data_type": data_type, "to_model": "data", "from_storage": key }
                        }
                        return { "data_type": data_type, "to_model": key.substring(storage_key.length + 1), "from_storage": key }
                    }
                }, this), this);

                _.each(matched_keys, function (matched_key) {
                    var stored_value = localStorage.getItem(matched_key["from_storage"]);
                    if (_.isEqual(matched_key["data_type"], "string")) {
                        this.set(matched_key["to_model"], stored_value);
                    } else {
                        this.set(matched_key["to_model"], JSON.parse(stored_value));
                    }
                }, this);
                return !_.isEmpty(matched_keys);
            },

            "to_localStorage": function (data) {
                if (!data) {
                    console.log("localsync:to_localStorage:no_data");
                    return;
                }
                var storage_key = this.get("storage_key");
                if (_.isString(data)) {
                    console.log("backbone:localsync:to_localStorage:" + storage_key + ":string");
                    localStorage.setItem("data_types:" + storage_key, "string");
                    localStorage.setItem(storage_key, data);
                    this.set("data", data);
                } else {
                    console.log("backbone:localsync:to_localStorage:" + storage_key + ":" + _.keys(data));
                    localStorage.setItem("data_types:" + storage_key, "json");
                    _.each(data, function (data_item, data_key) {
                        this.set(data_key, data_item);
                        localStorage.setItem(storage_key + ":" + data_key, JSON.stringify(data_item));
                    }, this);
                }
            },

            "after_sync": function () {
                console.log("backbone:localsync:after_sync");
            }
        });

    });