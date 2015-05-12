ServiceView = require './ServiceView.coffee'
ServiceModel = require '../models/ServiceModel.coffee'

ServicesView = Backbone.View.extend

  initialize: (options) ->
    @options = options || {}

    @app = @options.app

    @collection.on "reset", (model, collection, options) =>
      @$el.html("")
      @addServices()
      
    @collection.on "change", =>
      @updateSubtotal()

    @app.on "currencyChange", =>
      @updateSubtotal()

    @addServices()
    @updateSubtotal()

  addServices: ->
    @collection.each (service) =>
      disabled = service.get('disabled')
      serviceView = new ServiceView(model: service, disabled: disabled ,app: @app)
      $(".services", @$el).append serviceView.render().el  
  
  updateSubtotal: ->
    subTotal = @collection.subtotal() * @app.currency.rate
    newSubtotal = accounting.formatMoney(subTotal,
      symbol: @app.currency.symbol
    )
    $(".subtotal", @$el).html newSubtotal

module.exports = ServicesView
