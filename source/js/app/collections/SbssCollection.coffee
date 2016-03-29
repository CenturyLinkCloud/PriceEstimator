SbsModel = require '../models/SbsModel.coffee'

SbssCollection = Backbone.Collection.extend
  model: SbsModel

  parse: (data) ->
    return data

  subtotal: ->
    _.reduce @models, (memo, sbs) ->
      memo + sbs.totalPricePerMonth()
    , 0

  removeAll: ->
    @each (sbs) =>
      sbs.destroy()

  initPricing: (pricingMaps) ->
    @each (sbs) =>
      pricingMap = pricingMaps.forKey("storage")
      sbs.updatePricing pricingMap
    @trigger 'datacenterUpdate'

module.exports = SbssCollection
