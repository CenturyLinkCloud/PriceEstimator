ServerModel = require '../models/ServerModel.coffee'

ServersCollection = Backbone.Collection.extend
  model: ServerModel

  parse: (data) ->
    return data

  subtotal: ->
    _.reduce @models, (memo, server) ->
      memo + server.totalPricePerMonth() + server.managedAppsPricePerMonth()
    , 0

  oSSubtotal: ->
    _.reduce @models, (memo, server) ->
      memo + server.totalOSPricePerMonth()
    , 0

  managedTotal: ->
    _.reduce @models, (memo, server) ->
      memo + server.managedAppsPricePerMonth() + server.managedBasePricePerMonth()
    , 0

  removeAll: ->
    @each (server) =>
      server.destroy()

  initPricing: (pricingMaps) ->
    @each (server) =>
      pricingMap = pricingMaps.forKey("server")
      server.updatePricing pricingMap
    @trigger 'datacenterUpdate'

module.exports = ServersCollection
