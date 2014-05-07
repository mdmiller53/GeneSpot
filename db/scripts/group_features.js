var RESERVED_DBS = ["LOOKUPS", "local", "admin", "test", "undefined"];
var results = {
    "name": "Features",
    "isExcluded": true,
    "children": []
};

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

    var counts = db.feature_matrix.aggregate({ "$group": { "_id": "$source", "size": { "$sum": 1 } } });
    if (counts["ok"] === 1) {
        counts["result"].forEach(function(cnt) {
            db_results["children"].push({ "name": cnt["_id"], "size": cnt["size"] });
        });
    }
});
printjson(results);