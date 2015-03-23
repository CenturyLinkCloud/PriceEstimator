ServiceModel = Backbone.Model.extend

  defaults:
    title: ""
    description: ""
    input: "select"
    quantity: 0
    disabled: false

  initPricing: (pricingMap) ->
    @.set "pricing", pricingMap.get('price')
    @.set "disabled", pricingMap.get('disabled')

  totalPricePerMonth: ->
    @.get("pricing") * @.get("quantity")


module.exports = ServiceModel