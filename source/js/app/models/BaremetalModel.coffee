BaremetalModel = Backbone.Model.extend
  HOURS_IN_MONTH: 720

  defaults:
    quantity: 1
    config: 1
    os: 1

  initialize: ->
    @initPricing()

  parse: (data) ->
    return data

  initPricing: ->
    pricingMap = @.get("pricingMap")
    if pricingMap
      pricing = pricingMap.attributes.options
    @.set("pricing", pricing or {})

  updatePricing: (pricingMap) ->
    @.set("pricingMap", pricingMap)
    if pricingMap
      pricing = pricingMap.attributes.options
    @.set("pricing", pricing or 0)

  totalPricePerMonth: ->
    pricingMap = @.get("pricing")
    if !pricingMap or _.isEmpty(pricingMap.config)
      return 0
    else
      quantity = @.get("quantity")
      selectedConfig = @.get("config")
      selectedOs = @.get("os")

      configProduct = pricingMap.config[selectedConfig]
      configPrice = @priceForMonth(configProduct.hourly * quantity)

      osProduct = pricingMap.os[selectedOs]
      sockets = configProduct.sockets
      osPrice = @priceForMonth(osProduct.hourly * quantity * sockets)

      return configPrice + osPrice

  priceForMonth: (hourlyPrice) ->
    return hourlyPrice * @HOURS_IN_MONTH


module.exports = BaremetalModel
