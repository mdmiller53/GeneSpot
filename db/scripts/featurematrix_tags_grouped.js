/*
- Reads from "feature_tags" collection in LOOKUPS database
- Writes to map reduce output to "feature_tags_grouped" collection

Usage:

    mongo --host=$HOST $DB_NAME featurematrix_tags_grouped.js

Example of the type of features targeted for aggregation by this script. Must be run on each tumor_type feature matrix independently.
{
    "_id" : ObjectId("53a0a595044458b47fe9b0a9"),
    "tag" : "10p15.1",
    "feature_id" : "C:CNVR:10p15.1:chr10:5610350:5628570::BLCA-TP_Gistic_ROI_d_amp",
    "source" : "CNVR",
    "db_name" : "BLCA"
}
 */

var result = db.feature_tags.aggregate([
    {
        "$group": {
            "_id": "$tag",
            "tumor_types": {
                "$addToSet": "$db_name"
            }
        }
    }
]);
print("aggregate completed");

result["result"].forEach(function(d) {
    db.feature_tags_grouped.insert({
        "tag": d["_id"],
        "tumor_types": d["tumor_types"]
    });
});
print("insert completed");

print("feature_tags_grouped:" + db.feature_tags_grouped.count());
