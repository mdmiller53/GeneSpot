if (!feature_source) feature_source = "GEXP";
var record_count = 20;
var sample_count = 10;

var selected_samples = [];

var collectFn = function (numberOf, sample_array) {
    return function (doc) {
        if (sample_array.length > numberOf) return;

        if (doc["values"]) {
            var counter = 1;
            for (var sample_id in doc["values"]) {
                sample_array.push(sample_id);
                if (counter++ > numberOf) break;
            }
        }
    }
};

var outputFn = function (selected_samples) {
    var counter = 0;
    return function (doc) {
        if (counter++ === 0) {
            var headers = feature_source + "\t";
            selected_samples.forEach(function(sample_id) {
                headers += sample_id + "\t";
            });
            print(headers);
        }

        var cells = doc["id"] + "\t";

        var sample_values = doc["values"];
        selected_samples.forEach(function(sample_id) {
            if (sample_values[sample_id]) {
                cells += sample_values[sample_id] + "\t";
            } else {
                cells += "NA\t";
            }
        });

        print(cells);
    }
};

var query = { "source": feature_source };

// collects a limited set of samples
db["feature_matrix"].find(query).limit(record_count).forEach(collectFn(sample_count, selected_samples));

// outputs data for the selected samples
db["feature_matrix"].find(query).limit(record_count).forEach(outputFn(selected_samples));