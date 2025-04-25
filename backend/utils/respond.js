function success(res, data = {}, code = 200) {
    return res.status(code).json({ success: true, data });
  }
  
  function fail(res, error = 'Unknown Error', code = 500) {
    return res.status(code).json({ success: false, error });
  }
  
  module.exports = { success, fail };
  