RdbsView = require './RdbsView.coffee'
RdbsModel = require '../models/RdbsModel.coffee'

RdbssView = Backbone.View.extend
  
  events:
    "click .add-button": "addRdbs"

  initialize: (options) ->
    @options = options || {}

    @app = @options.app

    @collection.on "add", (model, collection, options) =>
      @onRdbsAdded(model)

    @collection.on "remove", (model, collection, options) =>
      @onRdbsRemoved(model)

    @collection.on "change", =>
      @updateSubtotal()

    @app.on "currencyChange", =>
      @updateSubtotal()

    @collection.on "datacenterUpdate", =>
      @updateSubtotal()

    @updateSubtotal()

    @rdbsViews = []

    if @options.hyperscale
      if @options.pricingMap.get("options").storage.hyperscale is "disabled"
        @$el.addClass("disabled")

    $('.has-tooltip', @$el).tooltip()

  addRdbs: (e) ->
    console.log('RdbssView.addRdbs', @options.pricingMap)
    e.preventDefault() if e
    @collection.add(pricingMap: @options.pricingMap)

  onRdbsAdded: (model) ->
    rdbsView = new RdbsView(model: model, app: @app, parentView: @)
    @rdbsViews[model.cid] = rdbsView
    $(".table", @$el).append rdbsView.render().el
    @updateSubtotal()

  onRdbsRemoved: (model) ->
    @rdbsViews[model.cid].close()
    @updateSubtotal()

  updateSubtotal: ->
    subTotal = @collection.subtotal() * @app.currency.rate
    newSubtotal = accounting.formatMoney(subTotal,
      symbol: @app.currency.symbol
    )
    $(".subtotal", @$el).html newSubtotal

    if @options.hyperscale
      if @options.pricingMap.get("options").storage.hyperscale is "disabled"
        @$el.addClass("disabled")
        @collection.removeAll()
      else
        @$el.removeClass("disabled")

        


module.exports = RdbssView
