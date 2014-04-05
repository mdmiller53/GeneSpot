/*
- Extracts clinical variables from "feature_matrix" collection into GLOBAL lookup collection

Usage:

    mongo --host=$HOST $DB_NAME generate_clinical_variables_lookup.js
 */

var appendGlobalCV = function(doc) {
    // upsert to avoid duplicates!
    db.getSiblingDB("LOOKUPS").clinical_variables.update({ "id": doc["id"] }, { "id": doc["id"], "label": doc["label"] }, true);
}

db.feature_matrix.find({"source":"CLIN"},{"label": true, "id": true}).forEach(appendGlobalCV);

print("completed");
