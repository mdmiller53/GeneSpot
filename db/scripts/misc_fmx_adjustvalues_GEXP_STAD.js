/*
Usage:
    mongo --host=$HOST --port=$PORT STAD featurematrix_adjustvalues_GEXP_STAD.js
*/

// migration phase
// moves 'values' into 'raw_values'
// run only once
var exists_query = { "source": "GEXP", "raw_values": { "$exists": false }, "values": { "$exists": true } };
var count = db["feature_matrix"].find(exists_query).count();
if (count > 0) {
    db["feature_matrix"].update(exists_query, {"$rename": { "values": "raw_values"}}, { "multi": true });
}

// adjustment phase
var CONSTANT_ADDITION = 4.550681;
var CONSTANT_MULTIPLY = 1.271340;

var adjust_query = { "source": "GEXP", "raw_values": { "$exists": true } };
db["feature_matrix"].find(adjust_query).forEach(function(rec) {
    var dict_raw_values = rec["raw_values"];
    var dict_values = {};
    for (var sample_id in dict_raw_values) {
        var raw_value = dict_raw_values[sample_id];
        if (0 != raw_value && (!raw_value || raw_value == "")) {
            throw sample_id + "(" + raw_value + ") didn't have a valid value for " + rec["id"];
        }
        if (String(raw_value).toUpperCase() != "NA") {
            var float_value = parseFloat(raw_value);
            if (!isNaN(float_value)) {
                float_value = (float_value * CONSTANT_MULTIPLY) + CONSTANT_ADDITION;
                dict_values[sample_id] = float_value;
            } else {
                dict_values[sample_id] = "NA";
            }
        } else {
            dict_values[sample_id] = "NA";
        }
    }
    db["feature_matrix"].update({ "_id": rec["_id"] }, { "$set": { "values": dict_values }});
});