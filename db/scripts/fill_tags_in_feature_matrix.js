var query = {
    "tags": {
        "$exists": false
    }
};

var updateTags = function(d) {
    var tags = [];
    if ("gene" in d) tags.push(d["gene"]);
    if ("locus" in d) tags.push(d["locus"]);
    if ("microRNA" in d) tags.push(d["microRNA"]);
    if ("accession_number" in d) tags.push(d["accession_number"]);
    if ("probe" in d) tags.push(d["probe"]);
    if ("antibody" in d) tags.push(d["antibody"]);
    if ("protein" in d) tags.push(d["protein"]);

    if (tags.length <= 0) return;

    db.feature_matrix.update(
        { "_id": d["_id"] },
        {
            "$push": {
                "tags": {
                    "$each": tags
                }
            }
        }
    );
};

print ("before:" + db + ":" + db.feature_matrix.find(query).count());
db.feature_matrix.find(query).forEach(updateTags);
print ("after:" + db + ":" + db.feature_matrix.find(query).count());


var incompleteQuery = { "source": { "$exists": false }, "id": { "$exists": false } };
print ("incomplete.before:" + db + ":" + db.feature_matrix.find(incompleteQuery, {"values":false,"_id":false}).count());
db.feature_matrix.remove(incompleteQuery);
print ("incomplete.after:" + db + ":" + db.feature_matrix.find(incompleteQuery, {"values":false,"_id":false}).count());