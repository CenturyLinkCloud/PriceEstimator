ServerModel = require '../models/ServerModel.coffee'

ServersCollection = Backbone.Collection.extend
  model: ServerModel

  parse: (data) ->
    # console.log 'Servers Collection', data
    return data

  subtotal: ->
    _.reduce @models, (memo, server) ->
      memo + server.totalPricePerMonth() + server.managedAppsPricePerMonth()
    , 0

  oSSubtotal: ->
    _.reduce @models, (memo, server) ->
      memo + server.totalOSPricePerMonth()
    , 0

  initPricing: (pricingMaps) ->
    @each (server) =>
      pricingMap = pricingMaps.forKey("server")
      server.updatePricing pricingMap

module.exports = ServersCollection