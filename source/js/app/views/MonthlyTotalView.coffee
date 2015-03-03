MonthlyTotalView = Backbone.View.extend

  el: "#monthly-total"

  events:
    "change .datacenter": "changeDatacenter"

  initialize: (options) ->
    @options = options || {};

    @options.app.on "totalPriceUpdated", =>
      @updateTotal()

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
