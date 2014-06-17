/*
- Reads from "feature_matrix" collection
- Aggregates tags and writes individual entries per tag to lookups database

Usage:

    mongo --host=$HOST $DB_NAME featurematrix_tags_lookup.js --eval="var lookupsDbUri='hostname:port/LOOKUPS';"

Example of the type of features targeted for aggregation by this script. Must be run on each tumor_type feature matrix independently.
{
    "_id" : ObjectId("52d484d43d8a1d038104f407"),
    "id" : "B:GNAB:A1BG:chr19:58858172:58874214:-:y_n_somatic",
    "strand" : "-",
    "tags" : [ "KLHDC9", "PFDN2", "ARHGAP30", "PVRL4", "SRGAP2", "1q23.3" ]
    "end" : 58874214,
    "start" : 58858172,
    "source" : "GNAB",
    "chr" : "19",
    "code" : "y_n_somatic",
    "type" : "B"
}
 */

var query = {
    "$and": [
        { "tags": { "$exists": true } },
        { "tags": { "$nin": ["NO_MATCH"] } }
    ]
};

var lookupsDb = connect(lookupsDbUri);
var db_name = db["_name"];

db.feature_matrix.find(query).forEach(function(d) {
    var feature_tags = d["tags"];
    if (feature_tags === undefined || feature_tags.length <= 0) return;

    var feature_id = d["id"];
    var source = d["source"];
    feature_tags.forEach(function(tag) {
        if (tag && tag != "") {
            lookupsDb["feature_tags"].insert({
                "tag": tag,
                "feature_id": feature_id,
                "source": source,
                "db_name": db_name
            });
        }
    });
});
