Utils = 
  getUrlParameter: (sParam) ->
    sPageURL = window.location.search.substring(1)
    sURLVariables = sPageURL.split('&')
    i = 0
    while i < sURLVariables.length
      sParameterName = sURLVariables[i].split('=')
      if sParameterName[0] == sParam
        return sParameterName[1]
      i++
    return
  getUrlParameterFromHash: (sParam) ->
    sPageURL = window.location.hash.substring(1)
    sURLVariables = sPageURL.split('&')
    i = 0
    while i < sURLVariables.length
      sParameterName = sURLVariables[i].split('=')
      if sParameterName[0] == sParam
        console.log sParameterName[1]
        return sParameterName[1]
      i++
    return
  

module.exports = Utils