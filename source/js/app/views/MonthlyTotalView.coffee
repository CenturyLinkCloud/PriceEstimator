MonthlyTotalView = Backbone.View.extend

  el: "#monthly-total"

  events:
    "change .datacenter": "changeDatacenter"

  initialize: (options) ->
    @options = options || {};

    @options.app.on "totalPriceUpdated", =>
      @updateTotal()

    $.getJSON "json/pricing/index.json", (data) ->
      console.log data
      $.each data, ->
        label = @replace("_", " ")
        $(".datacenter", @$el).append("<option value='" + @ + "'>" + label + "</option>")

    $(window).scroll => @positionHeader()

  updateTotal: ->
    $(".price", @$el).html accounting.formatMoney(@options.app.totalPriceWithSupport)

  positionHeader: ->
    if $(window).scrollTop() > 289
      @$el.css("position", "fixed")
    else
      @$el.css("position", "absolute")

  changeDatacenter: (e) ->
    @options.app.setPricingMap $(e.target).val()

module.exports = MonthlyTotalView
