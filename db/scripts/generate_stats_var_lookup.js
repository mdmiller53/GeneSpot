/*
  usage: mongo <host>:<port>/<db> fn_2_ffn_clin.js 
*/
function getCounts(values) {
  var retVal = {};
  retVal["total"] = 0;
  retVal["valid"] = 0;
  
  for (var key in values) {
    retVal["total"] += 1;
    if (values[key] != 'NA') {
      retVal["valid"]++;
    }
  }

  return retVal;
}

function getStats(type, values) {
  var count = 0;
  var retVal = [{}, {}, {}];
  retVal[0]["total"] = 0;
  retVal[0]["valid"] = 0;
  
  retVal[2]["max"] = Number.MIN_VALUE;
  retVal[2]["min"] = Number.MAX_VALUE;
  retVal[2]["mean"] = 0;
  retVal[2]["median"] = new Array();
  
  for (var key in values) {
    retVal[0]["total"]++;
    if (values[key] != 'NA') {
      retVal[0]["valid"]++;
    }

    if (values[key] in retVal[1]) {
      retVal[1][values[key]]++;
    } else {
      count++;
      retVal[1][values[key]] = 1;
    }
    
    if ("N" == type && "NA" != values[key]) {
      if (retVal[2]["max"] < values[key]) {
        retVal[2]["max"] = values[key];
      }
      if (retVal[2]["min"] > values[key]) {
        retVal[2]["min"] = values[key];
      }
      retVal[2]["mean"] += values[key];
      retval[2]["median"].push(values[key]);
    }
  }

  if (!((("C" == type || "B" == type) && count > 0) || (count > 0 && count < 21))) {
    retVal[1] = null;
  }
  
  if ("N" != type || 0 == retVal[0]["valid"]) {
    retVal[2] = null;
  } else {
    retVal[2]["mean"] = retVal[2]["mean"] / retVal[0]["valid"];
    
    retVal[2]["stddev"] = 0;
    for (var key in values) {
      if (values[key] != 'NA') {
        retVal[2]["stddev"] += Math.pow((values[key] - retVal[2]["mean"]), 2);
      }
    }
    retVal[2]["stddev"] = Math.sqrt(retVal[2]["stddev"] / retVal[0]["valid"]);
    
    retVal[2]["median"].sort(function(a, b){return a-b});
    retVal[2]["mad"] = retVal[2]["median"];
    var half = Math.floor(retVal[2]["median"].length/2);
    if(retVal[2]["median"].length % 2)
        retVal[2]["median"] = retVal[2]["median"][half];    
    else
        retVal[2]["median"] = (retVal[2]["median"][half-1] + retVal[2]["median"][half]) / 2.0;

    for (i = 0; i < retVal[2]["mad"].length; i++) {
        retVal[2]["mad"][i] = Math.abs(retVal[2]["mad"][i] - retVal[2]["median"]);
    retVal[2]["mad"].sort(function(a, b){return a-b});
    var half = Math.floor(retVal[2]["mad"].length/2);
    if(retVal[2]["mad"].length % 2)
        retVal[2]["mad"] = retVal[2]["mad"][half];    
    else
        retVal[2]["mad"] = (retVal[2]["mad"][half-1] + retVal[2]["mad"][half]) / 2.0;
    }
    
  }
  
  return retVal;
};

print('start: ' + new Date());
var count = 0;
db.getSiblingDB("skcm_stats_lookup_test").dropDatabase();
db.getSiblingDB("skcm_stats_lookup_test").fm_stats.ensureIndex({"id": 1}, {unique: true});
db.feature_matrix.find().forEach(
  function(doc) {
    if (0 == (count++ % 4096)) {
      print("processing record " + count + " " + new Date());
    }
    
    sibDB = db.getSiblingDB("skcm_stats_lookup_test");
    var stats = getStats(doc["type"], doc["values"]);
    var entry = {
      "id":doc["id"],
      "counts":stats[0]
    }
    sibDB.fm_stats.insert(entry);
    
    var cats = stats[1];
    if (null != cats) {
      sibDB.fm_stats.update({"id":doc["id"]}, {$set: {"categories":cats}})
    }
    
    var numeric = stats[2];
    if (null != numeric) {
      sibDB.fm_stats.update({"id":doc["id"]}, {$set: {"numeric":numeric}})
    }
  }
)
print('end: ' + new Date());

