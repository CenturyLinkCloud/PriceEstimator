PricingModel = require '../models/PricingMapModel.coffee'

DEFAULT_SERVER_DATA = require '../data/server.coffee'

HOURS_IN_MONTH = 730

PricingMapsCollection = Backbone.Collection.extend
  model: PricingModel

  initialize: (models, options) ->
    window.currentDatacenter = options.datacenter
    window.currentDatasource = options.datasource
    @currencyId = options.currency
    @app = options.app
    @url = options.url
    $.ajax
      url: "/prices/exchange-rates.json"
      type: "GET"
      success: (data) =>
        @currency = data["USD"][options.currency]
        @app.currency = window.currency = @currency
        return @fetch()
      error: (error) =>
        @currency = 
          rate: 1.0
          id: "USD"
          symbol: "$"
        @app.currency = window.currency = @currency
        return @fetch()


  parse: (data) ->
    return @_parsePricingData(data)

  forKey: (type) ->
    _.first @where("type": type)

  _parsePricingData: (data) ->
    output = []
    additional_services = []
    server = _.clone(DEFAULT_SERVER_DATA)
    _.each data, (section) ->
      if section.products?
        _.each section.products, (product) ->
          if _.has(product,'key')
            ids = product.key.split(":")
            if ids[0] is 'server'
              if ids[1] is 'os'
                price = product.hourly || 0
                server.options[ids[1]][ids[2]] = price * @currency.rate
              else if ids[1] is 'storage'
                price = product.hourly * HOURS_IN_MONTH
                server.options[ids[1]][ids[2]] = price * @currency.rate
              else
                price = product.hourly || product.monthly
                server.options[ids[1]] = price * @currency.rate
            else if ids[0] is 'networking-services'
              if ids[1] is 'shared-load-balancer'
                price = product.monthly || product.hourly * HOURS_IN_MONTH
                price *= @currency.rate
              else
                price = product.monthly
                price *= @currency.rate
              service = 
                type: ids[1]
                price: price
              additional_services.push(service)
            else if ids[0] is 'managed-apps'
              price = product.hourly
              server.options[ids[1]] = price * @currency.rate
            else if ids[0] is 'networking'
              if ids[1] is 'bandwidth'
                price = product.monthly * @currency.rate
                service =
                  type: 'bandwidth'
                  price: price
                additional_services.push(service)
              else if ids[1] is 'object-storage'
                price = product.monthly * @currency.rate
                enabled = ids[2]? and ids[2] is 'enabled'
                service =
                  type: 'object-storage'
                  price: price
                  disabled: !enabled
                additional_services.push(service)

    output.push(server)

    # additional_services.push({type: 'bandwidth', price: 0.05})
    # additional_services.push({type: 'object-storage', price: 0.15, disabled: true})

    _.each additional_services, (ser) -> output.push(ser)
    return output

module.exports = PricingMapsCollection