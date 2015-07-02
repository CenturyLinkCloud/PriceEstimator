AppfogView = require './AppfogView.coffee'
AppfogModel = require '../models/AppfogModel.coffee'

AppfogsView = Backbone.View.extend

  events:
    "click .add-button": "addDeployment"

  initialize: (options) ->
    @options = options || {}

    @app = @options.app

    @collection.on "add", (model, collection, options) =>
      @onDeploymentAdded(model)

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

    @appfogViews = []

    $('.has-tooltip', @$el).tooltip()

  checkPricingMap: () ->
    if !@options.pricingMap
      @$el.addClass("disabled")
      @collection.removeAll()
      return false
    else
      @$el.removeClass("disabled")
      return true

  addDeployment: (e) ->
    e.preventDefault() if e
    @collection.add(pricingMap: @options.pricingMap)

  onDeploymentAdded: (model) ->
    appfogView = new AppfogView(model: model, app: @app, parentView: @)
    @appfogViews[model.cid] = appfogView
    $(".table", @$el).append appfogView.render().el
    @updateSubtotal()

  onDeploymentRemoved: (model) ->
    @appfogViews[model.cid].close() if @appfogViews[model.cid]
    @updateSubtotal()

  updateSubtotal: ->
    subTotal = @collection.subtotal() * @app.currency.rate
    newSubtotal = accounting.formatMoney(subTotal,
      symbol: @app.currency.symbol
    )
    $(".subtotal", @$el).html newSubtotal

module.exports = AppfogsView
