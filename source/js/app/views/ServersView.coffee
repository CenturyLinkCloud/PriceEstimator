ServerView = require './ServerView.coffee'
ServerModel = require '../models/ServerModel.coffee'

ServersView = Backbone.View.extend
  
  events:
    "click .add-button": "addServer"

  initialize: (options) ->
    @options = options || {};

    @collection.on "add", (model, collection, options) =>
      @onServerAdded(model)

    @collection.on "remove", (model, collection, options) =>
      @onServerRemoved(model)

    @collection.on "change", =>
      @updateSubtotal()

    @updateSubtotal()

    @serverViews = []

    if @options.hyperscale
      if @options.pricingMap.get("options").storage.hyperscale is "disabled"
        @$el.addClass("disabled")

    $('.has-tooltip', @$el).tooltip()

  addServer: (e) ->
    e.preventDefault() if e
    type = if @options.hyperscale is true then "hyperscale" else "standard"
    @collection.add(pricingMap: @options.pricingMap, type: type)
  
  onServerAdded: (model) ->
    serverView = new ServerView(model: model)
    @serverViews[model.cid] = serverView
    $(".table", @$el).append serverView.render().el
    @updateSubtotal()

  onServerRemoved: (model) ->
    @serverViews[model.cid].close()
    @updateSubtotal()

  updateSubtotal: ->
    $(".subtotal", @$el).html accounting.formatMoney(@collection.subtotal())

module.exports = ServersView
