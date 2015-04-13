ManagedAppView = Backbone.View.extend
  
  tagName: "tr"
  className: "table-row managed-app-row is-managed"

  events: ->
    "click .remove-button" : "onRemoveClick"
    "change input": "onFormChanged"
    "change select": "onFormChanged"
    "input input": "onFormChanged"
    "keyup input": "onFormChanged"
    "keypress input": "ensureNumber"

  initialize: (options) ->
    @options = options || {}

  render: ->
    template = require("../templates/managedApp.haml")
    colspan = if @model.get("type") is "hyperscale" then 4 else 5
    @$el.html template(app: @options.app, colspan: colspan, mainApp: @options.mainApp, software_options: @model.attributes.pricing.software)
    @$el.addClass("managed-row-for-server_#{@model.cid}")
    @updateQuantityAndPrice()
    return @

  onRemoveClick: (e) ->
    e.preventDefault()
    key = $(e.currentTarget).data("key")
    apps = @model.get("managedApps")
    apps = _.reject apps, (app) ->
      return app.key == key
    @model.set("managedApps", apps)

  updateQuantityAndPrice: ->
    quantity = @model.get("quantity")
    price = @model.managedAppPricePerMonth(@options.app.key, @options.app.instances, @options.app.softwareId)
    instances = @options.app.instances || 1
    $(".managed-app-quantity", @$el).html(quantity)
    $(".price", @$el).html(accounting.formatMoney(price),
      symbol: @options.mainApp.currency.symbol
    )
    $("input[name=usage]", @$el).val instances

  onFormChanged: ->
    softwareId = $("select[name=softwareId]", @$el).val()
    instances = $("input[name=usage]", @$el).val() || 1
    @model.updateManagedAppIntances(@options.app.key, instances, softwareId)

  ensureNumber: (e) ->
    charCode = (if (e.which) then e.which else e.keyCode)
    return not (charCode > 31 and (charCode < 48 or charCode > 57))

module.exports = ManagedAppView
