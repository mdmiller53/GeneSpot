/*
- Extracts clinical variables from "feature_matrix" collection into GLOBAL lookup collection

Usage:

    mongo --host=$HOST $DB_NAME generate_clinical_variables_lookup.js --eval="var lookupsDbUri='hostname:port/LOOKUPS';"
 */

var lookupsDb = connect(lookupsDbUri);
var db_name = db["_name"];
print("[" + db_name + "]:script:started");

var group_variables_fn = function(doc) {
    var details = {
        "id": doc["id"],
        "label": doc["label"],
        "tumor_type": db_name,
        "source": doc["source"]
    };
    lookupsDb["all_clinical"].update({
        "id": doc["id"]
    }, {
        "$set": { "label": doc["label"] },
        "$push": { "features": details }
    }, true);
};

print("[" + db_name + "]:initial check=LOOKUPS:" + lookupsDb["all_clinical"].count());

print("[" + db_name + "]:update:started:CLIN");
db["feature_matrix"].find({ "source": "CLIN" }).forEach(group_variables_fn);
print("[" + db_name + "]:update:started:SAMP");
db["feature_matrix"].find({ "source": "SAMP" }).forEach(group_variables_fn);
print("[" + db_name + "]:update:completed");

var result = lookupsDb["all_clinical"].aggregate([ { "$unwind": "$features" }, { "$group": { "_id": "$features.tumor_type", "cnt": { "$sum": 1 } } } ]);
result["result"].forEach(printjson);
print("[" + db_name + "]:script:completed");
