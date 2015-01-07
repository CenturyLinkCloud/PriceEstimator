ServiceView = require './ServiceView.coffee'
ServiceModel = require '../models/ServiceModel.coffee'

ServicesView = Backbone.View.extend

  initialize: (options) ->
    @options = options || {};

    @collection.on "reset", (model, collection, options) =>
      @$el.html("")
      @addServices()
      
    @collection.on "change", =>
      @updateSubtotal()

    @addServices()
    @updateSubtotal()

  addServices: ->
    @collection.each (service) =>
      serviceView = new ServiceView(model: service)
      $(".services", @$el).append serviceView.render().el  
  
  updateSubtotal: ->
    $(".subtotal", @$el).html accounting.formatMoney(@collection.subtotal())

module.exports = ServicesView
