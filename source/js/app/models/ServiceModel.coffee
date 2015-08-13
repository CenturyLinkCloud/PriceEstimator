ServiceModel = Backbone.Model.extend

  defaults:
    title: ""
    description: ""
    input: "select"
    quantity: 0
    disabled: false

  initPricing: (pricingMap) ->
    if pricingMap?
      @.set "pricing", pricingMap.get('price')
      @.set "disabled", pricingMap.get('disabled')
      @.set "hasSetupFee", pricingMap.get('hasSetupFee')
    else
      @.set "pricing", 0
      @.set "disabled", true
      @.set "hasSetupFee", false

  parse: (data) ->
    return data

  totalPricePerMonth: ->
    price = @.get("pricing")
    quantity = @.get("quantity")
    return price * quantity


module.exports = ServiceModel
