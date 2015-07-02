AppfogView = Backbone.View.extend

  tagName: "tr"
  className: "table-row"

  events:
    "click .remove-button": "removeDeployment"
    "change select": "onFormChanged"
    "keypress .number": "ensureNumber"
    "change select[name]": "onFormChanged"
    "change input[name]": "onFormChanged"
    "input input[name]": "onFormChanged"
    "keyup input[name]": "onFormChanged"
    "keypress input:not([name])": "ensureNumber"
    "input input:not([name])": "onSliderTextChanged"

  initialize: (options) ->
    @options = options || {}

    @app = @options.app

    @model.on "change", (model) =>
      @onModelChange(model)

    @app.on "currencyChange", =>
      @onModelChange(@model)

  render: ->
    template = require("../templates/appfog.haml")
    @$el.html template(model: @model, app: @app)
    @$el.attr("id", @model.cid)

    _.defer =>
      $('.range-slider', @$el).rangeslider
        polyfill: false
      $('.range-slider', @$el).css("opacity", 1)

    return @

  close: ->
    @remove()
    @unbind()
    @$el.remove()

  removeDeployment: (e) ->
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
    $(".quantity", @$el).html(model.get("quantity"))
    $(".memory", @$el).html(model.get("memory"))

    $(".quantity-text-input", @$el).val(model.get("quantity"))
    $(".memory-text-input", @$el).val(model.get("memory"))

    if model.get("memory") > 0
      @$el.addClass("active")
    else
      @$el.removeClass("active")

  ensureNumber: (e) ->
    charCode = (if (e.which) then e.which else e.keyCode)
    return not (charCode > 31 and (charCode < 48 or charCode > 57))

  onSliderTextChanged: (e) ->
    $this = $(e.currentTarget)
    name = $this.data("name")
    value = $this.val()
    return if value is ""

    data = Backbone.Syphon.serialize(@)
    data[name] = value
    @model.set(data)

    $("[name=#{name}]", @$el).val(value).change()


module.exports = AppfogView
