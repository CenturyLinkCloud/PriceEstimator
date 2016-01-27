RdbsModel = require '../models/RdbsModel.coffee'

RdbssCollection = Backbone.Collection.extend
  model: RdbsModel

  parse: (data) ->
    return data

  subtotal: ->
    _.reduce @models, (memo, rdbs) ->
      memo + rdbs.totalPricePerMonth()
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
