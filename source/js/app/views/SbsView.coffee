SbsView = Backbone.View.extend

  tagName: "tr"
  className: "table-row"

  events:
    "keypress .number": "ensureNumber"
    "click .remove-button": "removeSbs"
    "change select[name]": "onFormChanged"
    "change input[name]": "onFormChanged"
    "input input[name]": "onFormChanged"
    "keyup input[name]": "onFormChanged"
    "keypress input:not([name])": "ensureNumber"
    "input input:not([name])": "onSliderTextChanged"

  initialize: (options) ->
    @options = options || {}

    @app = @options.app

    @appViews = []

    @listenTo @model, 'change', (model) =>
      @onModelChange(model)

    @app.on "currencyChange", =>
      @onModelChange(@model)

  render: ->
    template = require("../templates/sbs.haml")
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

  removeSbs: (e) ->
    e.preventDefault()
    @model.destroy()

  ensureNumber: (e) ->
    charCode = (if (e.which) then e.which else e.keyCode)
    return not (charCode > 31 and (charCode < 48 or charCode > 57))

  onSliderTextChanged: (e) ->
    $this = $(e.currentTarget)
    name = $this.data("name")
    value = $this.val()
    return if value is ""

    data = Backbone.Syphon.serialize(@)
    data.storage = value
    @model.set(data)

    $("[name=#{name}]", @$el).val(value).change()

  onFormChanged: (e) ->
    e.preventDefault()
    data = Backbone.Syphon.serialize(@)
    @model.set(data)

  onModelChange: (model) ->
    total = model.totalPricePerMonth() * @app.currency.rate
    newTotal = accounting.formatMoney(total,
      symbol: @app.currency.symbol
    )
    $(".price", @$el).html newTotal

    $(".retentionPeriod", @$el).html(model.get("retentionPeriod"))
    $(".storage", @$el).html(model.get("storage"))
    $(".dataAddRate", @$el).html(model.get("dataAddRate"))
    $(".dataDeleteRate", @$el).html(model.get("dataDeleteRate"))
    $(".restore", @$el).html(model.get("restore"))

    $(".retention-period-text-input", @$el).val(model.get("retentionPeriod"))
    $(".storage-text-input", @$el).val(model.get("storage"))
    $(".add-rate-text-input", @$el).val(model.get("dataAddRate"))
    $(".delete-rate-text-input", @$el).val(model.get("dataDeleteRate"))
    $(".restore-text-input", @$el).val(model.get("restore"))

    @$el.attr("id", @model.cid)

    _.each @appViews, (appView) =>
      appView.updateQuantityAndPrice()

    @options.parentView.collection.trigger 'change'


module.exports = SbsView
