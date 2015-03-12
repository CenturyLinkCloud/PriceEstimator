ServiceView = Backbone.View.extend

  className: "service"

  events:
    "change select": "onFormChanged"
    "change input": "onFormChanged"
    "input input": "onFormChanged"

  initialize: ->
    @model.on "change", (model) =>
      @onModelChange(model)

  render: ->
    template = require("../templates/service.haml")
    @$el.html template(model: @model)
    @$el.attr("id", @model.cid)
    @$el.addClass(@model.get("key"))

    _.defer =>
      $('.range-slider', @$el).rangeslider
        polyfill: false
      $('.range-slider', @$el).css("opacity", 1)

    return @

  onFormChanged: (e) ->
    e.preventDefault()
    data = Backbone.Syphon.serialize(@)
    @model.set(data)

  onModelChange: (model) ->
    $(".cost", @$el).html(accounting.formatMoney(model.get("pricing")))
    $(".price", @$el).html(accounting.formatMoney(model.totalPricePerMonth()))
    $(".quantity", @$el).html(model.get("quantity"))
    if model.get("quantity") > 0
      @$el.addClass("active")
    else
      @$el.removeClass("active")

module.exports = ServiceView
