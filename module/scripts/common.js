const extract_ratio = function(ratio) {
  const width = 240;
  var height;
  if (ratio !== undefined) {
    const dim = ratio.split(':');
    height = width * parseInt(dim[1]) / parseInt(dim[0]);
  } else {
    height = 135;
  }

  return {width: width, height: height};
}

module.exports.extract_ratio = extract_ratio;