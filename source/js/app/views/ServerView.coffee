AddManagedAppView = require './AddManagedAppView.coffee'
ManagedAppView = require './ManagedAppView.coffee'

ServerView = Backbone.View.extend

  tagName: "tr"
  className: "table-row"

  events:
    "keypress .number": "ensureNumber"
    "click .remove-button": "removeServer"
    "click .managed-check": "onManagedCheckboxChanged"
    "change select[name]": "onFormChanged"
    "change input[name]": "onFormChanged"
    "input input[name]": "onFormChanged"
    "keyup input[name]": "onFormChanged"
    "keypress input:not([name])": "ensureNumber"
    "input input:not([name])": "onSliderTextChanged"

  initialize: (options) ->
    @options = options || {}

    @app = @options.app

    @appViews = []

    @listenTo @model, 'change', (model) =>
      @onModelChange(model)

    @listenTo @model, 'change:managedApps', (model) =>
      @onManagedChanged(model)

  render: ->
    template = require("../templates/server.haml")
    managedDisabled = @model.get("pricingMap").get("options").os["redhat-managed"] is "disabled"
    disabledClass = ""
    disabledClass = "disabled" if managedDisabled
    @$el.html template(model: @model, app: @app, disabledClass: disabledClass)
    @$el.attr("id", @model.cid)

    _.defer =>
      $('.range-slider', @$el).rangeslider
        polyfill: false
      $('.range-slider', @$el).css("opacity", 1)

    return @

  close: ->
    @remove()
    @unbind()
    @addManagedAppView.remove() if @addManagedAppView
    @removeAllManagedApps()

  removeServer: (e) ->
    e.preventDefault()
    @model.destroy()

  ensureNumber: (e) ->
    charCode = (if (e.which) then e.which else e.keyCode)
    return not (charCode > 31 and (charCode < 48 or charCode > 57))

  onSliderTextChanged: (e) ->
    $this = $(e.currentTarget)
    name = $this.data("name")
    value = $this.val()
    return if value is ""

    data = Backbone.Syphon.serialize(@)
    data.storage = value
    @model.set(data)

    $("[name=#{name}]", @$el).val(value).change()

  onFormChanged: (e) ->
    e.preventDefault()
    data = Backbone.Syphon.serialize(@)
    @model.set(data)

  onManagedCheckboxChanged: (e) ->
    $check = $(e.currentTarget)
    if $check.is(":checked")
      @addMangedApps()
    else
      @removeAllManagedAppsAndAddButton()

  addMangedApps: ->
    @addManagedAppView = new AddManagedAppView(model: @model)
    @$el.after(@addManagedAppView.render().el)

  removeAllManagedApps: ->
    _.each @appViews, (appView) ->
      appView.remove()
    @appViews = []

  removeAllManagedAppsAndAddButton: ->
    @$el.removeClass("is-managed")
    @model.set("managedApps", [])
    @addManagedAppView.remove() if @addManagedAppView
    @removeAllManagedApps()

  onManagedChanged: (model) ->
    @removeAllManagedApps()
    managedApps = model.get("managedApps")
    _.each managedApps, (app) =>
      managedAppView = new ManagedAppView(model: model, app: app, mainApp: @app)
      @appViews.push managedAppView
      @addManagedAppView.$el.before(managedAppView.render().el)
      @onModelChange(model)

  onModelChange: (model) ->
    newTotal = accounting.formatMoney(model.totalPricePerMonth(),
      symbol: @app.currency.symbol
    )
    $(".price", @$el).html newTotal

    $(".cpu", @$el).html(model.get("cpu"))
    $(".memory", @$el).html(model.get("memory"))
    $(".storage", @$el).html(model.get("storage"))

    $(".storage-text-input", @$el).val(model.get("storage"))
    $(".cpu-text-input", @$el).val(model.get("cpu"))
    $(".memory-text-input", @$el).val(model.get("memory"))

    if model.get("os") == "linux"
      model.set("managed", false)
      $(".managed-check", @$el).attr("disabled", true)
      $(".managed-check", @$el).attr("checked", false)
      @removeAllManagedAppsAndAddButton()
    else
      $(".managed-check", @$el).attr("disabled", false)

    _.each @appViews, (appView) =>
      appView.updateQuantityAndPrice()

    @addManagedAppView.updateOptions() if @addManagedAppView

    @options.parentView.collection.trigger 'change'


module.exports = ServerView
