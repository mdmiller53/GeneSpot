/*
  usage: mongo <host>:<port>/<db> generate_stats_var_lookup.js 
*/
function median(values) {
    values.sort(function(a, b){return a-b});
    var half = Math.floor(values.length/2);
    if(values.length % 2)
        retVal = values[half];    
    else
        retVal = (values[half-1] + values[half]) / 2.0;
    return retVal;
}

function getStats(type, values) {
  var count = 0;
  var retVal = new Object();
  retVal["counts"] = new Object();
  retVal["counts"]["total"] = 0;
  retVal["counts"]["valid"] = 0;

  retVal["categories"] = new Object();
  
  retVal["numeric"] = new Object();
  retVal["numeric"]["max"] = -Number.MAX_VALUE;
  retVal["numeric"]["min"] = Number.MAX_VALUE;
  retVal["numeric"]["mean"] = 0;
  retVal["numeric"]["median"] = new Array();
  
  for (var key in values) {
    retVal["counts"]["total"]++;
    if (values[key] != 'NA') {
      retVal["counts"]["valid"]++;

      if (values[key] in retVal["categories"]) {
        retVal["categories"][values[key]]++;
      } else {
        count++;
        retVal["categories"][values[key]] = 1;
      }
    }
    
    if ("N" == type && "NA" != values[key]) {
      if (retVal["numeric"]["max"] < values[key]) {
        retVal["numeric"]["max"] = values[key];
      }
      if (retVal["numeric"]["min"] > values[key]) {
        retVal["numeric"]["min"] = values[key];
      }
      retVal["numeric"]["mean"] += values[key];
      retVal["numeric"]["median"].push(values[key]);
    }
  }
  
  if (!((("C" == type || "B" == type) && count > 0) || (count > 0 && count < 21))) {
    retVal["categories"] = null;
  }

  if ("N" != type || 0 == retVal["counts"]["valid"]) {
    retVal["numeric"] = null;
  } else {
    retVal["numeric"]["mean"] = retVal["numeric"]["mean"] / retVal["counts"]["valid"];
    
    retVal["numeric"]["stddev"] = 0;
    for (var key in values) {
      if (values[key] != 'NA') {
        retVal["numeric"]["stddev"] += Math.pow((values[key] - retVal["numeric"]["mean"]), 2);
      }
    }
    retVal["numeric"]["stddev"] = Math.sqrt(retVal["numeric"]["stddev"] / retVal["counts"]["valid"]);
    
    retVal["numeric"]["mad"] = retVal["numeric"]["median"];
    retVal["numeric"]["median"] = median(retVal["numeric"]["median"]);

    for (i = 0; i < retVal["numeric"]["mad"].length; i++) {
        retVal["numeric"]["mad"][i] = Math.abs(retVal["numeric"]["mad"][i] - retVal["numeric"]["median"]);
    }
    retVal["numeric"]["mad"] = median(retVal["numeric"]["mad"]);
  }
  return retVal;
};

print('start: ' + new Date());
var count = 0;
db.feature_matrix.find().forEach(
  function(doc) {
    if (0 == (count++ % 4096)) {
      print("processing record " + count + " " + new Date());
    }
    
    if (doc["raw_values"]) {
      var stats = getStats(doc["type"], doc["raw_values"]);
      db.feature_matrix.update({"id":doc["id"]}, {$set: {"raw_statistics.counts": stats["counts"]}});
      if (stats["categories"]) {
        db.feature_matrix.update({"id":doc["id"]}, {$set: {"raw_statistics.categories":stats["categories"]}})
      }
      if (stats["numeric"]) {
        db.feature_matrix.update({"id":doc["id"]}, {$set: {"raw_statistics.numeric":stats["numeric"]}})
      }
    }
    
    var stats = getStats(doc["type"], doc["values"]);
    db.feature_matrix.update({"id":doc["id"]}, {$set: {"statistics.counts": stats["counts"]}});
    if (stats["categories"]) {
      db.feature_matrix.update({"id":doc["id"]}, {$set: {"statistics.categories":stats["categories"]}})
    }
    if (stats["numeric"]) {
      db.feature_matrix.update({"id":doc["id"]}, {$set: {"statistics.numeric":stats["numeric"]}})
    }
  }
)
print('total count: ' + count);
print('end: ' + new Date());

