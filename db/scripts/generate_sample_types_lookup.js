/*
- Extracts clinical variables from "feature_matrix" collection into GLOBAL lookup collection

Usage:

    mongo --host=$HOST generate_clinical_variables_lookup.js --eval="var tumor_type='BLCA'"
 */

var query = { "id": "C:SAMP:TNtype:::::" };
var projection = { "_id": false };

var sourceDb = db.getSiblingDB(tumor_type);
var lookupsDb = db.getSiblingDB("LOOKUPS");

print("initial check=" + tumor_type + ":" + sourceDb.feature_matrix.find(query, projection).count());

var eachFn = function(doc) {
    doc["tumor_type"] = tumor_type;
    lookupsDb.sample_types.insert(doc);
};

sourceDb.feature_matrix.find(query, projection).forEach(eachFn);

print("completed");
