Config = require '../Config.coffee'

MonthlyTotalView = Backbone.View.extend

  el: "#monthly-total"

  events:
    "change .datacenter": "changeDatacenter"
    "change .currency": "changeCurrency"

  initialize: (options) ->
    @options = options || {}

    @app = @options.app

    @app.on "totalPriceUpdated", =>
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

    $.getJSON Config.CURRENCY_FILE_PATH, (currencies) =>
      $.each currencies["USD"], (index, currency) =>
        label = currency.id
        rate = currency.rate
        symbol = currency.symbol
        selected = if options.currency is label then "selected" else ""
        $option = $("<option value='#{label}' #{selected}>#{label}</option>")
            .attr('data-currency-symbol', symbol)
            .attr('data-currency-rate', rate)
        $(".currency", @$el).append($option)

    $(window).scroll => @positionHeader()

  updateTotal: ->
    newTotal = accounting.formatMoney(@app.totalPriceWithSupport,
      symbol: @app.currency.symbol
    )
    $(".price", @$el).html newTotal

  positionHeader: ->
    if $(window).scrollTop() > 289
      @$el.css("position", "fixed")
    else
      @$el.css("position", "absolute")

  changeDatacenter: (e) ->
    # @app.setPricingMap $(e.target).val()
    $target = $(e.target)
    $currencies = $(".currency", @$el)
    currency = $currencies.val() || Config.DEFAULT_CURRENCY.id
    href = window.top.location.href
    href = href.replace(/\?datacenter=.*/, "")
    $selected = $target.find('option:selected')
    datasource = $selected.attr('data-pricing-map') || 'default'
    href = "#{href}?datacenter=#{$target.val()}&datasource=#{datasource}&currency=#{currency}"
    return window.top.location.href = href

  changeCurrency: (e) ->
    $datacenters = $(".datacenter", @$el)
    datacenter = $datacenters.val()
    $selected_datacenter = $datacenters.find('option:selected')
    datasource = $selected_datacenter.attr('data-pricing-map') || 'default'
    $target = $(e.currentTarget)
    currency = $target.val() || Config.DEFAULT_CURRENCY.id
    href = window.top.location.href
    href = href.replace(/\?datacenter=.*/, "")
    href = "#{href}?datacenter=#{datacenter}&datasource=#{datasource}&currency=#{currency}"
    return window.top.location.href = href


module.exports = MonthlyTotalView
