BaremetalView = require './BaremetalView.coffee'
BaremetalModel = require '../models/BaremetalModel.coffee'

BaremetalConfigsView = Backbone.View.extend

  events:
    "click .add-button": "addConfig"

  initialize: (options) ->
    @options = options || {}

    @app = @options.app

    @collection.on "add", (model, collection, options) =>
      @onConfigAdded(model)

    @collection.on "remove", (model, collection, options) =>
      @onDeploymentRemoved(model)

    @collection.on "change", =>
      @updateSubtotal()

    @app.on "currencyChange", =>
      @updateSubtotal()

    @collection.on "datacenterUpdate", =>
      @checkPricingMap()
      @updateSubtotal()

    @checkPricingMap()

    @baremetalViews = []

    $('.has-tooltip', @$el).tooltip()

  checkPricingMap: () ->
    if _.isEmpty(@options.pricingMap.get("options").config)
      @$el.addClass("disabled")
      @collection.removeAll()
      return false
    else
      @$el.removeClass("disabled")
      return true

  addConfig: (e) ->
    e.preventDefault() if e
    @collection.add(pricingMap: @options.pricingMap)

  onConfigAdded: (model) ->
    baremetalView = new BaremetalView(model: model, app: @app, parentView: @)
    @baremetalViews[model.cid] = baremetalView
    $(".table", @$el).append baremetalView.render().el
    @updateSubtotal()

  onDeploymentRemoved: (model) ->
    @baremetalViews[model.cid].close() if @baremetalViews[model.cid]
    @updateSubtotal()

  updateSubtotal: ->
    subTotal = @collection.subtotal() * @app.currency.rate
    newSubtotal = accounting.formatMoney(subTotal,
      symbol: @app.currency.symbol
    )
    $(".subtotal", @$el).html newSubtotal

module.exports = BaremetalConfigsView
