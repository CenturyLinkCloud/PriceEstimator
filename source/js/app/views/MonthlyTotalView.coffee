MonthlyTotalView = Backbone.View.extend

  el: "#monthly-total"

  events:
    "change .datacenter": "changeDatacenter"

  initialize: (options) ->
    @options = options || {};

    @options.app.on "totalPriceUpdated", =>
      @updateTotal()

    $.getJSON "json/pricing/index.json", (data) =>
      $.each data, (index, location) =>
        label = location.replace("_", " ")
        selected = if options.datacenter is location then "selected" else ""
        $(".datacenter", @$el).append("<option value='#{location}' #{selected}>#{label}</option>")

    $(window).scroll => @positionHeader()

  updateTotal: ->
    $(".price", @$el).html accounting.formatMoney(@options.app.totalPriceWithSupport)

  positionHeader: ->
    if $(window).scrollTop() > 289
      @$el.css("position", "fixed")
    else
      @$el.css("position", "absolute")

  changeDatacenter: (e) ->
    # @options.app.setPricingMap $(e.target).val()
    href = window.location.href
    href = href.replace(/\?datacenter=.*/, "")
    href = "#{href}?datacenter=#{$(e.target).val()}"
    window.location.href = href

module.exports = MonthlyTotalView
