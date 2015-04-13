ServiceModel = require '../models/ServiceModel.coffee'

ServicesCollection = Backbone.Collection.extend
  model: ServiceModel

  url: ->
    return @.options.collectionUrl

  initialize: (options) ->
    @options = options || {}
    @fetch()

  initPricing: (pricingMaps) ->
    @.each (service) =>
      pricingMap = pricingMaps.forKey service.get("key")
      service.initPricing(pricingMap)

  subtotal: ->
    _.reduce @models, (memo, service) ->
      memo + service.totalPricePerMonth()
    , 0

module.exports = ServicesCollection