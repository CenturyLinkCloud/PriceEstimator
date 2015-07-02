BaremetalModel = require '../models/BaremetalModel.coffee'

BaremetalCollection = Backbone.Collection.extend
  model: BaremetalModel

  parse: (data) ->
    return data

  initPricing: (pricingMap) ->
    @.each (baremetal) =>
      baremetal.updatePricing(pricingMap)
    @trigger 'datacenterUpdate'

  subtotal: ->
    _.reduce @models, (memo, baremetal) ->
      memo + baremetal.totalPricePerMonth()
    , 0

  removeAll: ->
    @each (baremetal) =>
      baremetal.destroy()

module.exports = BaremetalCollection
