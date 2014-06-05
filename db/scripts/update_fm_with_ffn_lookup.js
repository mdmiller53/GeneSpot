/*
  usage: mongo <host>:<port>/<db> update_fm_with_label_lookup.js --eval "var ftypes = ['RPPA', 'METH]"
*/
function replaceUnderscore(str) {
  return str.replace(/_/g, ' ');
}

var debugCLINCounts = [0, 0, 0, 0, 0, 0];
var twoReplace = "$3: $1 vs $2";
var oneReplace = "$2: $1";
//	In some cases, the string(s) in front of the “|” are not unique/specific enough and we will need to include the feature name after the “|” as follows
//	C:SAMP:I(A|X) ⇒ f(X) A
//	C:SAMP:I(A,B|X) ⇒ f(X) A vs B
var checks = [
//	cases where we have G1,G2,.. drop the “G” (redundant with the word “grade”)
//	B:CLIN:I(G1|neoplasm_histologic_grade)::::: => neoplasm histologic grade 1 
  [/I\(G([0-9]+),G([0-9]+)\|(.+)\)/m, twoReplace], 
//	B:CLIN:I(G1,G2|neoplasm_histologic_grade)::::: => neoplasm histologic grade 1 vs 2
  [/I\(G([0-9]+)\|(.+)\)/m, oneReplace], 
//	cases where we have C1,C2,... (these are cluster #s) -- drop the “C”
//	C:SAMP:I(C1,C2|X) ⇒ f(X) 1 vs 2
  [/I\(C([0-9]+),C([0-9]+)\|(.+)\)/m, twoReplace], 
//	C:SAMP:I(C1|X) ⇒ f(X) 1
  [/I\(C([0-9]+)\|(.+)\)/m, oneReplace], 
//	pathologic_T, pathologic_N, pathologic_M, WHO_class
  [/I\((.+),(.+)\|(.+)\)/m, twoReplace], 
  [/I\((.+)\|(.+)\)/m, oneReplace]
];
// I(All_Mets.v3)
var nobar = /I\(([^|]+)\)/
function getCLINorSAMPLabel(code) {
  for (var i = 0; i < checks.length; i++) {
    if (checks[i][0].test(code)) {
      debugCLINCounts[i]++;
      var retVal = code.replace(checks[i][0], checks[i][1]);
      return replaceUnderscore(retVal.substring(0, 1).toUpperCase() + retVal.substring(1));
    }
  }
  if (nobar.exec(code)) {
    code = code.replace(nobar, "In $1");
  }
  
  return replaceUnderscore(code.substring(0, 1).toUpperCase() + code.substring(1));
}

var getCLINLabel = function(doc) {
  return retVal = getCLINorSAMPLabel(doc["code"]);
}

var getSAMPLabel = function(doc) {
  return getCLINorSAMPLabel(doc["code"]);
}

/*
  from stackoverflow: http://stackoverflow.com/questions/1068284/format-numbers-in-javascript
*/
function addCommas(num) {
  var parts = (num + "").split("."),
    main = parts[0],
    len = main.length,
    output = "",
    i = len - 1;

  while(i >= 0) {
    output = main.charAt(i) + output;
    if ((len - i) % 3 === 0 && i > 0) {
      output = "," + output;
    }
    --i;
  }
  // put decimal part back
  if (parts.length > 1) {
    output += "." + parts[1];
  }
  return output;
}

function getLocation(doc) {
  return doc["chromosome"] + ':' + addCommas(doc["start"]) + '-' + addCommas(doc["end"])
}

var units = ['bp', 'kb', 'Mb', 'Gb']
function getLength(start, end) {
  var length = parseInt(end) - parseInt(start);
  for (i = 0; i < units.length - 1; i++) {
    if (1 > (parseFloat(length) / 1000)) {
      return Math.round(length) + units[i];
    }
    length /= 1000;
  }
  return Math.round(length) + units[units.length - 1];
}

function getFMTitle(index, fields, suffix) {
  var fm_title = fields[0];
  for (var i = 1; i < index; i++) {
    fm_title += ' ' + fields[i];
  }
  return fm_title + ': ' + suffix;
}

function getGisticArmString(fields) {
  return getFMTitle(fields.indexOf('GisticArm'), fields, 'Gistic Arm');
}

function getGisticString(fields) {
  var gindex = fields.indexOf('Gistic');
  return getFMTitle(gindex, fields, 'Gistic') + ' ' + fields[gindex + 1] + ' ' + fields[fields.length - 1];
}

var debugCNVRCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
var noloc_checks = [
// N:CNVR:Xq:chrX:60600000:155270560::SKCM-All_Lymph_Node_GisticArm_d
//    ⇒ Xq  (SKCM-All Lymph Node: Gistic Arm)
// N:CNVR:Xq28:chrX:150021680:150280252::SKCM-All_Regional_Metastases_Gistic_ROI_r_amp
//    ⇒ Xq28 (SKCM-All_Regional_Metastases: Gistic ROI amp)
  /^x([pq]([0-9]{1,2})?)$/i, 
// N:CNVR:10p:chr10:0:40200000::GBM-TP_GisticArm_d 
//    ⇒ 10p (GBM-TP: Gistic Arm)
  /^[0-9]{1,2}[pq]$/
];
var loc_checks = [
// N:CNVR:Xq22.2:chrX:60600000:155270560
//    ⇒ chrX:60,600,000-155,270,560 (95MB, Xq22.2)
  /^x([pq])/i, 
// N:CNVR:8q24:chr8:138862000:140900999::
//    ⇒ chr8:138,862,000-140,900,999 (2MB, 8q24)
  /^[0-9]{1,2}[pq]/, 
// N:CNVR:SRGAP2:chr1:158887000:158888999::
//    ⇒ chr1:158,887,000-158,888,999 (2kb, SRGAP2)
  /^[A-Z]/ 
];
var getCNVRLabel = function(doc) {
  for (var i = 0; i < noloc_checks.length; i++) {
    if (noloc_checks[i].test(doc["locus"])) {
      if (doc["code"]) {
        var fields = doc["code"].split('_');
        if (-1 < doc["code"].indexOf('GisticArm')) {
          debugCNVRCounts[3 * i]++;
          return replaceUnderscore(doc["locus"] + ' (' + getGisticArmString(fields) + ')');
        } else {
          debugCNVRCounts[3 * i + 1]++;
          return replaceUnderscore(doc["locus"] + ' (' + getGisticString(fields) + ')');
        }
      } else {
        debugCNVRCounts[3 * i + 2]++;
        var loc = getLocation(doc)
        length = getLength(doc["start"], doc["end"]);
        return replaceUnderscore(loc + ' (' + length + ', ' + doc["locus"] + ')');
      }
    }
  }
  
  for (var i = 0; i < loc_checks.length; i++) {
    if (loc_checks[i].test(doc["locus"])) {
      var loc = getLocation(doc)
      if (doc["code"]) {
        var fields = doc["code"].split('_');
        if (-1 < doc["code"].indexOf('GisticArm')) {
          debugCNVRCounts[3 * (i + 2)]++;
          return replaceUnderscore(loc + ' (' + getGisticArmString(fields) + ', ' + doc["locus"] + ')');
        } else {
          debugCNVRCounts[3 * (i + 2) + 1]++;
          return replaceUnderscore(loc + ' (' + getGisticString(fields) + ', ' + doc["locus"] + ')');
        }
      } else {
        debugCNVRCounts[3 * (i + 2) + 2]++;
        var length = getLength(doc["start"], doc["end"]);
        return replaceUnderscore(loc + '(' + length + ', ' + doc["locus"] + ')');
      }
    }
  }
  print("\n!!!!!" + doc["id"] + " didn't match any expression.  using default!!!!!\n");
  var loc = getLocation(doc);
  var length = getLength(doc["start"], doc["end"]);
  return replaceUnderscore(loc + '(' + length + ', ' + doc["locus"] + ')');
}

var of = /([0-9]+)of([0-9]+)/;
var getGEXPLabel = function(doc) {
  var retVal = doc["gene"];
  if (doc["platform"] != "micro-array") {
    var tag = doc["id"].split(':')[7];
    if (tag) {
      if (of.test(tag)) {
        tag = tag.replace(of, "$1 of $2");
      }
      retVal += ' (' + tag + ')';
    }
  }
  return replaceUnderscore(retVal);
}

var getMIRNLabel = function(doc) {
  return replaceUnderscore(doc["microRNA"] + ' (' + doc["accession_number"] + ')');
}

var mappings = new Object();
mappings['nonsilent_somatic'] = "Excluding Silent Mutations";
mappings['code_potential_somatic'] = "Protein Coding";
mappings['missense_somatic'] = "Missense";
mappings['mnf_somatic'] = "MNF";
mappings['mni_somatic'] = "MNI";
mappings['y_n_somatic'] = "All Mutations";
var getGNABLabel = function(doc) {
  var name = doc["gene"];
  var code = mappings[doc["code"]];
  if (!code) {
    code = doc["code"];
  }
  return replaceUnderscore(name + ' - ' + code);
}

var getMETHLabel = function(doc) {
  // TODO: get the list of genes (w/ corresponding distance from TSS?)
  var fields = doc["code"].split('_');
  var tf_loc = '';
  if (1 < fields.length) {
    tf_loc += fields[1];
    for (var i = 2; i < fields.length; i++) {
      tf_loc += ' ';
      tf_loc += fields[i];
    }
  }
  
  if (tf_loc) {
    return replaceUnderscore(doc["probe"] + ' (' + doc['id'].split(':')[2] + ', ' + tf_loc + ')');
  }
  else {
    return replaceUnderscore(doc["code"] + ' (' + doc['id'].split(':')[2] + ')');
  }
}

var endInfo = /^(.+)-[RMVCEG]-[A-Z]$/
var endInfo1 = /^(.+)-[RMVCEG]-NA$/
var endInfo2 = /^(.+)-[RMVCEG]$/
var noInfo = /(.+)\-NA/
var phosphor = /^(.+)[_\-]p([STY][0-9]+.*)$/
var getRPPALabel = function(doc) {
  // TODO: get the list of genes
  // remove any 'uninteresting' trailing strings
  var antibody =  doc["antibody"];
  var matchEndInfo = endInfo.exec(antibody);
  if (matchEndInfo) {
    antibody = matchEndInfo[1];
  }
  var matchEndInfo = endInfo1.exec(antibody);
  if (matchEndInfo) {
    antibody = matchEndInfo[1];
  }
  var matchEndInfo = endInfo2.exec(antibody);
  if (matchEndInfo) {
    antibody = matchEndInfo[1];
  }
  var matchNoInfo = noInfo.exec(antibody);
  if (matchNoInfo) {
    antibody = matchNoInfo[1];
  }
  
  var matchPhosphor = phosphor.exec(antibody);
  var phos = '';
  if (matchPhosphor) {
    antibody = matchPhosphor[1];
    phos = matchPhosphor[2];
  }
  
  var gene = doc["id"].split(':')[2];
  if (phos) {
    var pfields = phos.split('_');
    phos = pfields[0];
    for (var i = 1; i < pfields.length; i++) {
      phos += ', ' + pfields[i];
    }
    return replaceUnderscore(gene + ': ' + antibody + ' (' + phos + ')');
  } else {
    return replaceUnderscore(gene + ': ' + antibody);
  }
}

function processFFNForFType(fType, func) {
  var count = 0;
  db.feature_matrix.find({"source":fType}).forEach(
    function(doc) {
      if (0 == (count++ % 4096)) {
        print("processing record " + count + " " + new Date());
      }
    
      db.feature_matrix.update({"id":doc["id"]}, {$set: {"label":func(doc)}});
    }
  )
  print("total updates: " + count + " " + new Date())
}

var default_ftypes = ['CLIN', 'SAMP', 'CNVR', 'GEXP', 'MIRN', 'GNAB', 'METH', 'RPPA'];
//var ftypes = ['RPPA'];
var ftype2func = {
    'CLIN': getCLINLabel,
    'SAMP': getSAMPLabel,
    'CNVR': getCNVRLabel,
    'GEXP': getGEXPLabel,
    'MIRN': getMIRNLabel,
    'GNAB': getGNABLabel,
    'METH': getMETHLabel,
    'RPPA': getRPPALabel
  };

if (typeof ftypes == 'undefined') {
  print('using default array of feature types');
  var ftypes = default_ftypes;
}
db.feature_matrix.ensureIndex( {"id" : 1}, {unique: true});
for (var ii = 0; ii < ftypes.length; ii++) {
  print('start ' + ftypes[ii] + ': ' + new Date());
  processFFNForFType(ftypes[ii], ftype2func[ftypes[ii]]);
  print('end ' + ftypes[ii] + ': ' + new Date() + '\n');
}

print("'|' clinical/sample counts: " + debugCLINCounts.join(' '));
print("copy number counts: " + debugCNVRCounts.join(' '));
