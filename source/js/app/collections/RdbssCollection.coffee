RdbsModel = require '../models/RdbsModel.coffee'

RdbssCollection = Backbone.Collection.extend
  model: RdbsModel

  parse: (data) ->
    return data

  subtotal: ->
    _.reduce @models, (memo, rdbs) ->
      memo + rdbs.totalPricePerMonth() + rdbs.managedAppsPricePerMonth()
    , 0

  oSSubtotal: ->
    _.reduce @models, (memo, rdbs) ->
      memo + rdbs.totalOSPricePerMonth()
    , 0

  managedTotal: ->
    _.reduce @models, (memo, rdbs) ->
      memo + rdbs.managedAppsPricePerMonth() + rdbs.managedBasePricePerMonth()
    , 0

  removeAll: ->
    @each (rdbs) =>
      rdbs.destroy()

  initPricing: (pricingMaps) ->
    @each (rdbs) =>
      pricingMap = pricingMaps.forKey("rdbs")
      rdbs.updatePricing pricingMap
    @trigger 'datacenterUpdate'

module.exports = RdbssCollection
