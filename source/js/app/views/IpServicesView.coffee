IpsView = require './IpsView.coffee'
IpsModel = require '../models/IpsModel.coffee'

IpServicesView = Backbone.View.extend

  events:
    "click .add-button": "addService"

  initialize: (options) ->
    @options = options || {}

    @app = @options.app

    @collection.on "add", (model, collection, options) =>
      @onServiceAdded(model)

    @collection.on "remove", (model, collection, options) =>
      @onServiceRemoved(model)

    @collection.on "change", =>
      @updateSubtotal()

    @app.on "currencyChange", =>
      @updateSubtotal()

    @collection.on "datacenterUpdate", =>
      @checkPricingMap()
      @updateSubtotal()

    @checkPricingMap()

    @ipsViews = []

    $('.has-tooltip', @$el).tooltip()

  checkPricingMap: () ->
    if !@options.pricingMap
      @$el.addClass("disabled")
      @collection.removeAll()
      return false
    else
      @$el.removeClass("disabled")
      return true

  addService: (e) ->
    e.preventDefault() if e
    @collection.add(pricingMap: @options.pricingMap)

  onServiceAdded: (model) ->
    ipsView = new IpsView(model: model, app: @app, parentView: @)
    @ipsViews[model.cid] = ipsView
    $(".table", @$el).append ipsView.render().el
    @updateSubtotal()

  onServiceRemoved: (model) ->
    @ipsViews[model.cid].close() if @ipsViews[model.cid]
    @updateSubtotal()

  updateSubtotal: ->
    subTotal = @collection.subtotal() * @app.currency.rate
    newSubtotal = accounting.formatMoney(subTotal,
      symbol: @app.currency.symbol
    )
    $(".subtotal", @$el).html newSubtotal

module.exports = IpServicesView
