IpsModel = Backbone.Model.extend
  HOURS_PER_DAY: "hours_per_day"
  HOURS_PER_WEEK: "hours_per_week"
  HOURS_PER_MONTH: "hours_per_month"
  PERCENTAGE_OF_MONTH: "percentage_of_month"

  HOURS_IN_MONTH: 720
  DAYS_IN_MONTH: 30.41666667
  WEEKS_IN_MONTH: 4.345238095

  defaults:
    quantity: 1
    memory: 1024
    usage: 100
    usagePeriod: 'percentage_of_month'

  initialize: ->
    @initPricing()

  parse: (data) ->
    return data

  initPricing: ->
    pricingMap = @.get("pricingMap")
    if pricingMap
      pricing = pricingMap.attributes.price
    @.set("pricing", pricing or 0)

  updatePricing: (pricingMap) ->
    @.set("pricingMap", pricingMap)
    if pricingMap
      pricing = pricingMap.attributes.price
    @.set("pricing", pricing or 0)

  totalPricePerMonth: ->
    price = @.get("pricing")
    quantity = @.get("quantity")
    return @priceForMonth(price * quantity)

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


module.exports = IpsModel
