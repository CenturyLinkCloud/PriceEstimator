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

    $.getJSON Config.DATACENTERS_URL, (data) =>
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

    $.each @app.currencyData['USD'], (index, currency) =>
      label = currency.id
      rate = currency.rate
      symbol = currency.symbol
      selected = if options.currency.id is label then "selected" else ""
      $option = $("<option value='#{label}' #{selected}>#{label}(#{symbol})</option>")
          .attr('data-currency-symbol', symbol)
          .attr('data-currency-rate', rate)
      $(".currency", @$el).append($option)

    mediaQueryList = window.matchMedia('print')
    mediaQueryList.addListener (mql) =>
      if mql.matches  
        $('.green-section').clone()
          .addClass('clone')
          .css('position', 'relative')
          .attr('id','')
          .appendTo('.page-form')
      else
        $('.green-section.clone').remove()

    $(window.top).scroll => @positionHeader()
    
    $(".estimator-print", @$el).on 'click', (e) ->
      e.preventDefault()
      window.print()

    @commandKey = false
    $(document, '#estimator').on 'keyup', (e) =>
      if e.which is 91 or e.which is 93
        @commandKey = false

    $(document, '#estimator').on 'keydown', (e) =>
      if e.which is 91 or e.which is 93
        @commandKey = true
      if e.ctrlKey && e.which is 80
        e.preventDefault()
        window.print()
        return false
      else if @commandKey and e.which is 80
        e.preventDefault()
        window.print()
        return false

  updateTotal: ->
    total = @app.totalPriceWithSupport * @app.currency.rate
    newTotal = accounting.formatMoney(total,
      symbol: @app.currency.symbol
    )
    $(".price", @$el).html newTotal

  positionHeader: ->
    if $(window).scrollTop() > 289
      @$el.css("position", "fixed") 
    else
      @$el.css("position", "absolute")

  changeDatacenter: (e) ->
    $target = $(e.target)
    $currencies = $(".currency", @$el)
    currency = $currencies.val() || Config.DEFAULT_CURRENCY.id
    @app.trigger "datacenterChange"
    $selected = $target.find('option:selected')
    datasource = $selected.attr('data-pricing-map') || 'default'
    window.location.hash = "datacenter=#{$target.val()}&datasource=#{datasource}&currency=#{currency}"

    return @app.setPricingMap $target.val(), datasource

  changeCurrency: (e) ->
    $target = $(e.currentTarget)
    currency_id = $target.val() || Config.DEFAULT_CURRENCY.id
    @app.currency = @app.currencyData['USD'][currency_id]
    @app.trigger "currencyChange"
    $selected = $(".datacenter", @$el).find('option:selected')
    datacenter = $selected.val()
    datasource = $selected.attr('data-pricing-map') || 'default'
    window.location.hash = "datacenter=#{datacenter}&datasource=#{datasource}&currency=#{currency_id}"
    return false


module.exports = MonthlyTotalView
