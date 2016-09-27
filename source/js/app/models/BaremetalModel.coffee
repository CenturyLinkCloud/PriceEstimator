BaremetalModel = Backbone.Model.extend
  HOURS_PER_DAY: "hours_per_day"
  HOURS_PER_WEEK: "hours_per_week"
  HOURS_PER_MONTH: "hours_per_month"
  PERCENTAGE_OF_MONTH: "percentage_of_month"

  HOURS_IN_MONTH: 720
  DAYS_IN_MONTH: 30.41666667
  WEEKS_IN_MONTH: 4.345238095

  defaults:
    quantity: 1
    config: 1
    os: 1
    usage: 100
    usagePeriod: 'percentage_of_month'

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
      if !configProduct
        selectedConfig = Object.keys(pricingMap.config)[0]
        configProduct = pricingMap.config[selectedConfig]

      if configProduct
        configPrice = @priceForMonth(configProduct.hourly * quantity)
        sockets = configProduct.sockets
      else
        configPrice = 0
        sockets = 0

      osProduct = pricingMap.os[selectedOs]
      osPrice = @priceForMonth(osProduct.hourly * quantity * sockets)

      return configPrice + osPrice

  priceForMonth: (hourlyPrice) ->
    switch @.get("usagePeriod")
      when @HOURS_PER_DAY
        return hourlyPrice * @.get("usage") * @DAYS_IN_MONTH
      when @HOURS_PER_WEEK
        return hourlyPrice * @.get("usage") * @WEEKS_IN_MONTH
      when @HOURS_PER_MONTH
        return hourlyPrice * @.get("usage")
      when @PERCENTAGE_OF_MONTH
        return @.get("usage") / 100 * @HOURS_IN_MONTH * hourlyPrice

module.exports = BaremetalModel
