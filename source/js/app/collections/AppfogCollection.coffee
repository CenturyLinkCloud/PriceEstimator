AppfogModel = require '../models/AppfogModel.coffee'

AppfogCollection = Backbone.Collection.extend
  model: AppfogModel

  parse: (data) ->
    return data

  initPricing: (pricingMap) ->
    @.each (appfog) =>
      appfog.updatePricing(pricingMap)
    @trigger 'datacenterUpdate'

  subtotal: ->
    _.reduce @models, (memo, appfog) ->
      memo + appfog.totalPricePerMonth()
    , 0

  removeAll: ->
    @each (appfog) =>
      appfog.destroy()

module.exports = AppfogCollection
