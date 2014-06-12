/*
- Extracts clinical variables from "feature_matrix" collection into GLOBAL lookup collection

Usage:

    mongo --host=$HOST $DB_NAME generate_clinical_variables_lookup.js --eval="var lookupsDbUri='hostname:port/LOOKUPS';"
 */

var lookupsDb = connect(lookupsDbUri);

var appendGlobalCV = function(doc) {
    lookupsDb.clinical_variables.update({ "id": doc["id"] }, { "id": doc["id"], "label": doc["label"] }, true);
};

print("initial check=LOOKUPS:" + lookupsDb.clinical_variables.count());

db.feature_matrix.find({"source":"CLIN"},{"label": true, "id": true}).forEach(appendGlobalCV);
db.feature_matrix.find({"source":"SAMP"},{"label": true, "id": true}).forEach(appendGlobalCV);

print("final check=LOOKUPS:" + lookupsDb.clinical_variables.count());

print("completed");
