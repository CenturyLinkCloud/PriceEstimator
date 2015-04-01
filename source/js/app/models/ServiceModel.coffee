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

  parse: (data) ->
    return data

  totalPricePerMonth: ->
    @.get("pricing") * @.get("quantity")


module.exports = ServiceModel