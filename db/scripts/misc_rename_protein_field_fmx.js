var proteinQuery = {
    "source": "RPPA",
    "protein": {
        "$exists": true
    },
    "antibody": {
        "$exists": false
    }
};

var antibodyQuery = {
    "source": "RPPA",
    "antibody": {
        "$exists": true
    }
};

console.log("antibody:" + db.feature_matrix.find(antibodyQuery).count());
console.log("proteins:" + db.feature_matrix.find(proteinQuery).count());

db.feature_matrix.find(proteinQuery).forEach(function (d) {
    db.feature_matrix.update(
        {
            "_id": d["_id"]
        },
        {
            "$rename": {
                "protein": "antibody"
            }
        }
    );
});

console.log("antibody:" + db.feature_matrix.find(antibodyQuery).count());
console.log("proteins:" + db.feature_matrix.find(proteinQuery).count());
