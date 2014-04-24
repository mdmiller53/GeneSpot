/*
- Extracts clinical variables from "feature_matrix" collection into GLOBAL lookup collection

Usage:

    mongo --host=$HOST $DB_NAME generate_sample_types_lookup.js --eval="var lookupsDbUri='hostname:port/LOOKUPS';"
 */

var query = { "id": "C:SAMP:TNtype:::::" };
var projection = { "_id": false };
var tumor_type = db["name"];

var lookupsDb = connect(lookupsDbUri);

print("initial check=" + tumor_type + ":" + db.feature_matrix.find(query, projection).count());
print("initial check=LOOKUPS:" + lookupsDb.sample_types.count());

var eachFn = function(doc) {
    doc["tumor_type"] = tumor_type;
    lookupsDb.sample_types.insert(doc);
};

db.feature_matrix.find(query, projection).forEach(eachFn);

print("final check=LOOKUPS:" + lookupsDb.sample_types.count());
print("completed");
