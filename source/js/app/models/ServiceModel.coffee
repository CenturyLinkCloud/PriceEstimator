ServiceModel = Backbone.Model.extend

  defaults:
    title: ""
    description: ""
    input: "select"
    quantity: 0
    
  initialize: ->

  initPricing: (pricingMap) ->
    @.set "pricing", pricingMap.get('price')

  totalPricePerMonth: ->
    @.get("pricing") * @.get("quantity")
      

module.exports = ServiceModel