IpsModel = require '../models/IpsModel.coffee'

IpsCollection = Backbone.Collection.extend
  model: IpsModel

  parse: (data) ->
    return data

  initPricing: (pricingMap) ->
    @.each (ips) =>
      ips.updatePricing(pricingMap)
    @trigger 'datacenterUpdate'

  subtotal: ->
    _.reduce @models, (memo, ips) ->
      memo + ips.totalPricePerMonth()
    , 0

  removeAll: ->
    @each (ips) =>
      ips.destroy()

module.exports = IpsCollection
