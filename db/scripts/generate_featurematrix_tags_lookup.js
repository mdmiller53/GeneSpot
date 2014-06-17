/*
- Extracts tags from "feature_matrix" collection into GLOBAL lookup collection

Usage:

    mongo --host=$HOST $DB_NAME generate_featurematrix_tags_lookup.js --eval="var lookupsDbUri='hostname:port/LOOKUPS';"
 */

print("script:started");
var lookupsDb = connect(lookupsDbUri);
var db_name = db["_name"];

print("initial check=LOOKUPS:" + lookupsDb.all_tags.count());

print("update:started");
db.feature_matrix.find(
    {
        "$and": [
            { "tags": { "$exists": true } },
            { "tags": { "$nin": ["NO_MATCH"] } }
        ]
    },
    {
        "tags": true,
        "id": true
    }
).forEach(function (doc) {
    if (!doc) return;
    var tags = doc["tags"] || [];
    if (tags.length <= 0) return;

    for (var i = 0; i < tags.length; i++) {
        var tag = tags[i];
        if (tag) {
            var details = { "id": doc["id"], "tumor_type": db_name };
            lookupsDb["all_tags"].update({ "tag": tag }, { "$push": { "features": details } }, true);
        }
    }
});

print("update:completed");

print("final check=LOOKUPS:" + lookupsDb.all_tags.count());
print("script:completed");
