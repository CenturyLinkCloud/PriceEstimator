RdbsModel = Backbone.Model.extend

  HOURS_PER_DAY: "hours_per_day"
  HOURS_PER_WEEK: "hours_per_week"
  HOURS_PER_MONTH: "hours_per_month"
  PERCENTAGE_OF_MONTH: "percentage_of_month"

  HOURS_IN_MONTH: 720
  DAYS_IN_MONTH: 30.41666667
  WEEKS_IN_MONTH: 4.345238095

  defaults:
    type: "single"
    cpu: 1
    memory: 1
    storage: 1
    quantity: 1
    usagePeriod: "percentage_of_month"
    usage: 100

  initialize: ->
    @initPricing()

  parse: (data) ->
    return data

  initPricing: ->
    pricing = @.get("pricingMap").attributes.options
    @.set("pricing", pricing)

  updatePricing: (pricingMap) ->
    @.set("pricingMap", pricingMap)
    if @.get("pricingMap")
      pricing = @.get("pricingMap").attributes.options
      @.set("pricing", pricing)

  totalCpuPerHour: ->
    type = @.get("type")
    @.get("cpu") * @.get("pricing").cpu[type]

  totalMemoryPerHour: ->
    type = @.get("type")
    @.get("memory") * @.get("pricing").memory[type]

  utilityPricePerHourPerInstance: ->
    @totalCpuPerHour() + @totalMemoryPerHour()

  utilityPricePerHourTotal: ->
    @utilityPricePerHourPerInstance() * @.get("quantity")

  storagePricePerMonth: ->
    type = @.get("type")
    @.get("storage") * @.get("pricing").storage[type] * @.get("quantity")

  totalPricePerMonth: ->
    utilityPerMonth = 0
    utilityPerMonth = @priceForMonth(@utilityPricePerHourTotal())
    total = utilityPerMonth + @storagePricePerMonth()
    return total

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

module.exports = RdbsModel
