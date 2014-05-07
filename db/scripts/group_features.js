var RESERVED_DBS = ["LOOKUPS", "local", "admin", "test", "undefined"];
var results = {
    "name": "Features",
    "isExcluded": true,
    "children": []
};

var array_results = [];

var instance_databases = db.adminCommand("listDatabases")["databases"];
instance_databases.forEach(function(instance_database) {
    db_name = instance_database["name"];
    if (RESERVED_DBS.indexOf(db_name) >= 0) return;

    db = db.getSiblingDB(db_name);

    var db_results = {
        "name": db_name,
        "children": []
    };

    results["children"].push(db_results);

//    var counts = db.feature_matrix.aggregate({ "$group": { "_id": "$source", "size": { "$sum": 1 } } });
//    if (counts["ok"] === 1) {
//        counts["result"].forEach(function(cnt) {
//            db_results["children"].push({ "name": cnt["_id"], "size": cnt["size"] });
//            array_results.push("TCGA," + db_name + "," + cnt["_id"] + "," + cnt["size"]);
//        });
//    }

//    var printFn = function(doc) {
//        if (doc["source"] === "GNAB") {
//            if (doc["label"] === "code_potential_somatic" ) {
//                array_results.push("TCGA," + db_name + "," + doc["source"] + "," + doc["gene"] + ",12345");
//            }
//        } else {
//            array_results.push("TCGA," + db_name + "," + doc["source"] + "," + doc["gene"] + ",12345");
//        }
//    };
//    db.feature_matrix.find({"gene":"TP53"}).forEach(printFn);
//    db.feature_matrix.find({"gene":"RAD51"}).forEach(printFn);
//    db.feature_matrix.find({"gene":"AKT1"}).forEach(printFn);
//    db.feature_matrix.find({"gene":"DIABLO"}).forEach(printFn);
//    db.feature_matrix.find({"gene":"KRAS"}).forEach(printFn);

    db.feature_matrix.find({"source":"SAMP"}).forEach(function(doc) {
        if (doc["label"] === "p53_pathway_1") array_results.push("TCGA," + db_name + ",SAMP," + doc["label"] + ",1");
        if (doc["label"] === "tumor_necrosis_percent") array_results.push("TCGA," + db_name + ",SAMP," + doc["label"] + ",1");
        if (doc["label"] === "TNtype") array_results.push("TCGA," + db_name + ",SAMP," + doc["label"] + ",1");
        if (doc["label"] === "sampleType") array_results.push("TCGA," + db_name + ",SAMP," + doc["label"] + ",1");
        if (doc["label"] === "percent_necrosis") array_results.push("TCGA," + db_name + ",SAMP," + doc["label"] + ",1");
    });
});
// printjson(results);
print(array_results.join("\n"));