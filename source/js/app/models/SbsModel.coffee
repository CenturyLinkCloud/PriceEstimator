SbsModel = Backbone.Model.extend

  HOURS_PER_DAY: "hours_per_day"
  HOURS_PER_WEEK: "hours_per_week"
  HOURS_PER_MONTH: "hours_per_month"
  PERCENTAGE_OF_MONTH: "percentage_of_month"

  HOURS_IN_MONTH: 720
  DAYS_IN_MONTH: 30.41666667
  WEEKS_IN_MONTH: 4.345238095

  defaults:
    retentionPeriod: 3
    storage: 1
    dataAddRate: 1
    dataDeleteRate: 1
    restore: 0

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

  totalPricePerMonth: ->
    retentionPeriod = @.get("retentionPeriod")
    storage = @.get("storage") * 1.0
    restore = @.get("restore") * 1.0
    dataAddRate = @.get("dataAddRate") * 0.01
    dataDeleteRate = @.get("dataDeleteRate") * 0.01
    retainedData = []
    storagePerDay = []
    day = 1
    while day <= @DAYS_IN_MONTH
      addedData = storage * dataAddRate
      deletedData = storage * dataDeleteRate
      droppedRetainedData = 0
      retainedData.push deletedData
      if retainedData.length > retentionPeriod
        droppedRetainedData = retainedData.shift()
      storage += (addedData - droppedRetainedData)
      if storage < 0
        storage = 0
      storagePerDay.push storage
      day += 1

    totalStorage = storagePerDay.reduce (t, s) -> t + s
    averageStorage = totalStorage / storagePerDay.length
    totalBackups = averageStorage * @.get("pricing").storage["sbs-backups"]
    totalRestore = restore * @.get("pricing").storage["sbs-restore"]
    return totalBackups + totalRestore

module.exports = SbsModel
