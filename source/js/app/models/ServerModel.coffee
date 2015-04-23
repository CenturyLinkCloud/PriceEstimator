ServerModel = Backbone.Model.extend

  HOURS_PER_DAY: "hours_per_day"
  HOURS_PER_WEEK: "hours_per_week"
  HOURS_PER_MONTH: "hours_per_month"
  PERCENTAGE_OF_MONTH: "percentage_of_month"

  HOURS_IN_MONTH: 730
  DAYS_IN_MONTH: 30.41666667
  WEEKS_IN_MONTH: 4.345238095

  defaults:
    type: "standard"
    os: "linux"
    cpu: 1
    memory: 1
    storage: 1
    quantity: 1
    usagePeriod: "percentage_of_month"
    usage: 100
    managed: false
    managedApps: []

  initialize: ->
    @initPricing()
    @.set("managedApps", [])

  parse: (data) ->
    # console.log 'Server Model', data
    return data

  initPricing: ->
    pricing = @.get("pricingMap").attributes.options
    @.set("pricing", pricing)

  updatePricing: (pricingMap) ->
    @.set("pricing", pricingMap.attributes.options)

  totalCpuPerHour: ->
    @.get("cpu") * @.get("pricing").cpu

  totalMemoryPerHour: ->
    @.get("memory") * @.get("pricing").memory

  totalOSPerHour: ->
    os = @.get("os")
    # os = "#{os}-managed" if @.get("managed")
    @.get("pricing").os[os] * @.get("cpu")

  managedBasePricePerHour: ->
    if @.get("managed")
      os = @.get("os")
      osPrice = @.get("pricing").os["#{os}-managed"]
      return osPrice
    else
      return 0

  managedBasePricePerMonth: ->
    return @priceForMonth(@managedBasePricePerHour())

  utilityPricePerHourPerInstance: ->
    @totalCpuPerHour() + @totalMemoryPerHour() + @totalOSPerHour() + @managedBasePricePerHour()

  utilityPricePerHourTotal: ->
    @utilityPricePerHourPerInstance() * @.get("quantity")

  storagePricePerMonth: ->
    type = @.get("type")
    @.get("storage") * @.get("pricing").storage[type] * @.get("quantity")

  managedAppPricePerMonth: (managedAppKey, instances, softwareId) ->
    softwarePricing = @.get('pricing').software
    software_selection = _.findWhere(softwarePricing, {name: softwareId})
    appSoftwareHourlyPrice = if software_selection? then software_selection.price else 0
    appSoftwareHourlyPrice *= @.get("cpu") || 1
    appPerHour = @.get("pricing")[managedAppKey]
    return ((@priceForMonth(appPerHour) + @priceForMonth(appSoftwareHourlyPrice)) * @.get("quantity")) * instances

  managedAppsPricePerMonth: ->
    apps = @.get("managedApps")
    total = 0
    _.each apps, (app) =>
      total += @managedAppPricePerMonth(app.key, app.instances, app.softwareId)
    return total

  totalOSPricePerMonth: ->
    @priceForMonth(@totalOSPerHour()) * @.get("quantity")

  totalPricePerMonth: ->
    utilityPerMonth = 0
    utilityPerMonth = @priceForMonth(@utilityPricePerHourTotal())
    total = utilityPerMonth + @storagePricePerMonth()
    return total

  totalPricePerMonthWithApps: ->
    total = @totalPricePerMonth + @managedAppsPricePerMonth()
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

  addManagedApp: (key, name) ->
    apps = @.get("managedApps")
    exists = false
    _.each apps, (app) ->
      if app.key is key
        exists = true
    if exists is false
      if key is 'ms-sql'
        apps.push {"key": key, "name": name, "instances": 1, "softwareId": "Microsoft SQL Server Standard Edition"}
      else
        apps.push {"key": key, "name": name, "instances": 1, "softwareId": ""}
      @.set("managedApps", apps)
      @.trigger "change", @
      @.trigger "change:managedApps", @

  updateManagedAppIntances: (key, quantity, softwareId) ->
    apps = @.get("managedApps")
    _.each apps, (app) ->
      if app.key is key
        app.instances = quantity
        app.softwareId = softwareId
    @.set("managedApps", apps)
    @.trigger "change:managedApps", @

module.exports = ServerModel
