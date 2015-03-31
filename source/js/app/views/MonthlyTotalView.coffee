MonthlyTotalView = Backbone.View.extend

  el: "#monthly-total"

  events:
    "change .datacenter": "changeDatacenter"

  initialize: (options) ->
    @options = options || {};

    @options.app.on "totalPriceUpdated", =>
      @updateTotal()

    $.getJSON "/prices/data-center-prices.json", (data) =>
      $.each data, (index, location) =>
        label = location.name.replace("_", " ")
        pricingSheetHref = location.links[0].href
          .replace "/prices/", ""
          .replace ".json", ""
        alias = location.alias.toUpperCase()
        selected = if options.datacenter is alias then "selected" else ""
        $option = $("<option value='#{alias}' #{selected}>#{label} - #{alias}</option>")
          .attr('data-pricing-map', pricingSheetHref)
        $(".datacenter", @$el).append($option)

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
    $target = $(e.target)
    href = window.top.location.href
    href = href.replace(/\?datacenter=.*/, "")
    $selected = $target.find('option:selected')
    datasource = $selected.attr('data-pricing-map') || 'default'
    href = "#{href}?datacenter=#{$target.val()}&datasource=#{datasource}"
    window.top.location.href = href

module.exports = MonthlyTotalView
