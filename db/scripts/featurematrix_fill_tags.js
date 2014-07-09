var query = {
    "source": {
        "$in": [ "GEXP", "GNAB", "RPPA", "METH", "MIRN", "CNVR" ]
    }
};

var update_tags = function(d) {
    var tags = [];

    // RPPA
    if ("refGenes" in d) tags = d["refGenes"];
    if ("antibody" in d) tags.push(d["antibody"]);
    if ("protein" in d) tags.push(d["protein"]);

    // GNAB, GEXP
    if ("gene" in d) tags.push(d["gene"]);

    // CNVR
    if ("locus" in d) tags.push(d["locus"]);

    // MIRN
    if ("microRNA" in d) tags.push(d["microRNA"]);
    if ("accession_number" in d) tags.push(d["accession_number"]);

    // METH
    if ("probe" in d) tags.push(d["probe"]);

    if (tags.length <= 0) tags.push("NO_MATCH");

    db["feature_matrix"].update({ "_id": d["_id"] }, { "$set": { "tags": tags } } );
};

db["feature_matrix"].find(query).forEach(update_tags);