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

    @addServices()
    @updateSubtotal()

  addServices: ->
    @collection.each (service) =>
      disabled = service.get('disabled')
      serviceView = new ServiceView(model: service, disabled: disabled ,app: @app)
      $(".services", @$el).append serviceView.render().el  
  
  updateSubtotal: ->
    newSubtotal = accounting.formatMoney(@collection.subtotal(),
      symbol: @app.currency.symbol
    )
    $(".subtotal", @$el).html newSubtotal

module.exports = ServicesView
