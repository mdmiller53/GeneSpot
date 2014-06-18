var exists = { "$exists": true };
var not_exists = { "$exists": false };

var cnt_gexp_exists = db.feature_matrix.find({ "gene": exists, "source":"GEXP" }).count();
var cnt_gexp_not_exists = db.feature_matrix.find({ "gene": not_exists, "source":"GEXP" }).count();

var cnt_gnab_exists = db.feature_matrix.find({ "gene": exists, "source":"GNAB" }).count();
var cnt_gnab_not_exists = db.feature_matrix.find({ "gene": not_exists, "source":"GNAB" }).count();

var cnt_rppa_antibody_exists = db.feature_matrix.find({ "antibody": exists, "source":"RPPA" }).count();
var cnt_rppa_antibody_not_exists = db.feature_matrix.find({ "antibody": not_exists, "source":"RPPA" }).count();

var cnt_rppa_exists = db.feature_matrix.find({ "refGenes": exists, "source":"RPPA" }).count();
var cnt_rppa_not_exists = db.feature_matrix.find({ "refGenes": not_exists, "source":"RPPA" }).count();

var cnt_meth_probe_exists = db.feature_matrix.find({ "probe": exists, "source":"METH" }).count();
var cnt_meth_probe_not_exists = db.feature_matrix.find({ "probe": not_exists, "source":"METH" }).count();

var cnt_meth_exists = db.feature_matrix.find({ "refGenes": exists, "source":"METH" }).count();
var cnt_meth_not_exists = db.feature_matrix.find({ "refGenes": not_exists, "source":"METH" }).count();

var cnt_mirn_exists = db.feature_matrix.find({ "microRNA": exists, "source":"MIRN" }).count();
var cnt_mirn_not_exists = db.feature_matrix.find({ "microRNA": not_exists, "source":"MIRN" }).count();

var cnt_cnvr_exists = db.feature_matrix.find({ "refGenes": exists, "source":"CNVR" }).count();
var cnt_cnvr_not_exists = db.feature_matrix.find({ "refGenes": not_exists, "source":"CNVR" }).count();

var cnt_tags_exists = db.feature_matrix.find({ "tags": exists }).count();
var cnt_tags_not_exists = db.feature_matrix.find({ "tags": not_exists }).count();

var cnt_label_exists = db.feature_matrix.find({ "label": exists }).count();
var cnt_label_not_exists = db.feature_matrix.find({ "label": not_exists }).count();

print("<db>:<source>:<field> ['count exists'/'count not exists']");
print(db + ":GEXP:gene     [" + cnt_gexp_exists + "/" + cnt_gexp_not_exists + "]");
print(db + ":GNAB:gene     [" + cnt_gnab_exists + "/" + cnt_gnab_not_exists + "]");
print(db + ":RPPA:antibody [" + cnt_rppa_antibody_exists + "/" + cnt_rppa_antibody_not_exists + "]");
print(db + ":RPPA:refGenes [" + cnt_rppa_exists + "/" + cnt_rppa_not_exists + "]");
print(db + ":METH:probe    [" + cnt_meth_probe_exists + "/" + cnt_meth_probe_not_exists + "]");
print(db + ":METH:refGenes [" + cnt_meth_exists + "/" + cnt_meth_not_exists + "]");
print(db + ":MIRN:microRNA [" + cnt_mirn_exists + "/" + cnt_mirn_not_exists + "]");
print(db + ":CNVR:refGenes [" + cnt_cnvr_exists + "/" + cnt_cnvr_not_exists + "]");
print(db + ":*:tags        [" + cnt_tags_exists + "/" + cnt_tags_not_exists + "]");
print(db + ":*:label       [" + cnt_label_exists + "/" + cnt_label_not_exists + "]");