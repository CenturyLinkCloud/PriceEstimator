PricingModel = require '../models/PricingMapModel.coffee'

PricingMapsCollection = Backbone.Collection.extend
  model: PricingModel
  url: "json/pricing.json"

  initialize: ->
    @fetch()

  forKey: (type) ->
    _.first @where("type": type)

module.exports = PricingMapsCollection