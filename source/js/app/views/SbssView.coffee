SbsView = require './SbsView.coffee'
SbsModel = require '../models/SbsModel.coffee'

SbssView = Backbone.View.extend
  
  events:
    "click .add-button": "addSbs"

  initialize: (options) ->
    @options = options || {}

    @app = @options.app

    @collection.on "add", (model, collection, options) =>
      @onSbsAdded(model)

    @collection.on "remove", (model, collection, options) =>
      @onSbsRemoved(model)

    @collection.on "change", =>
      @updateSubtotal()

    @app.on "currencyChange", =>
      @updateSubtotal()

    @collection.on "datacenterUpdate", =>
      @checkPricingMap()
      @updateSubtotal()

    @checkPricingMap()
    @updateSubtotal()

    @sbsViews = []

    $('.has-tooltip', @$el).tooltip()

  checkPricingMap: () ->
    if !@options.pricingMap
      @$el.addClass("disabled")
      @collection.removeAll()
      return false
    else
      @$el.removeClass("disabled")
      return true

  addSbs: (e) ->
    e.preventDefault() if e
    @collection.add(pricingMap: @options.pricingMap)

  onSbsAdded: (model) ->
    sbsView = new SbsView(model: model, app: @app, parentView: @)
    @sbsViews[model.cid] = sbsView
    $(".table", @$el).append sbsView.render().el
    @updateSubtotal()

  onSbsRemoved: (model) ->
    @sbsViews[model.cid].close()
    @updateSubtotal()

  updateSubtotal: ->
    subTotal = @collection.subtotal() * @app.currency.rate
    newSubtotal = accounting.formatMoney(subTotal,
      symbol: @app.currency.symbol
    )
    $(".subtotal", @$el).html newSubtotal


module.exports = SbssView
