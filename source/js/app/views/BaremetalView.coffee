BaremetalView = Backbone.View.extend

  tagName: "tr"
  className: "table-row"

  events:
    "click .remove-button": "removeConfig"
    "keypress .number": "ensureNumber"
    "change select": "onFormChanged"
    "change input[name]": "onFormChanged"
    "input input[name]": "onFormChanged"
    "keyup input[name]": "onFormChanged"

  initialize: (options) ->
    @options = options || {}

    @app = @options.app

    @model.on "change", (model) =>
      @onModelChange(model)

    @app.on "currencyChange", =>
      @onModelChange(@model)

  render: ->
    template = require("../templates/baremetal.haml")
    @$el.html template(model: @model, app: @app)
    @$el.attr("id", @model.cid)

    return @

  close: ->
    @remove()
    @unbind()
    @$el.remove()

  removeConfig: (e) ->
    e.preventDefault()
    @model.destroy()

  onFormChanged: (e) ->
    e.preventDefault()
    data = Backbone.Syphon.serialize(@)
    @model.set(data)

  onModelChange: (model) ->
    @$el.removeClass("disabled")
    newPrice = accounting.formatMoney(model.totalPricePerMonth() * @app.currency.rate,
      symbol: @app.currency.symbol
    )
    $(".price", @$el).html(newPrice)
    if model.get("quantity") > 0
      @$el.addClass("active")
    else
      @$el.removeClass("active")

  ensureNumber: (e) ->
    charCode = (if (e.which) then e.which else e.keyCode)
    return not (charCode > 31 and (charCode < 48 or charCode > 57))

module.exports = BaremetalView
