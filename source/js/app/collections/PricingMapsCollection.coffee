PricingModel = require '../models/PricingMapModel.coffee'
Config = require '../Config.coffee'

DEFAULT_SERVER_DATA = require '../data/server.coffee'

HOURS_IN_MONTH = 720

PricingMapsCollection = Backbone.Collection.extend
  model: PricingModel

  initialize: (models, options) ->
    @currencyId = options.currency
    @app = options.app
    @url = options.url
    @currency = options.currency
    @fetch()


  parse: (data) ->
    return @_parsePricingData(data)

  forKey: (type) ->
    _.first @where("type": type)

  _parsePricingData: (data) ->
    output = []
    additional_services = []
    software_licenses = []
    server =
      type: "server"
      options:
        os:
          linux: 0
          redhat: 0.04
          windows: 0.04
          "redhat-managed": "disabled"
          "windows-managed": "disabled"
        storage:
          standard: 0.15
          premium: 0.5
          "hyperscale": "disabled"
    baremetal =
      type: 'baremetal'
      options:
        config: {}
        os: {}

    _.each data, (section) =>
      if section.name is "Software"
        _.each section.products, (product) =>
          software_price = product.hourly #* @currency.rate
          item =
            name: product.name
            price: software_price
          software_licenses.push(item)
      if section.products?
        _.each section.products, (product) =>
          if _.has(product,'key')
            ids = product.key.split(":")
            if ids[0] is 'server'
              if ids[1] is 'os'
                price = product.hourly || 0
                server.options[ids[1]][ids[2]] = price #* @currency.rate
              else if ids[1] is 'storage'
                price = product.hourly * HOURS_IN_MONTH
                server.options[ids[1]][ids[2]] = price #* @currency.rate
              else
                price = product.hourly || product.monthly
                server.options[ids[1]] = price #* @currency.rate
            else if ids[0] is 'networking-services'
              if ids[1] is 'shared-load-balancer'
                price = product.hourly * HOURS_IN_MONTH
                #price *= @currency.rate
              else if ids[1] is 'dedicated-load-balancer-200' or ids[1] is 'dedicated-load-balancer-1000'
                price = product.monthly
                #price *= @currency.rate
              else
                price = product.monthly
                #price *= @currency.rate
              service =
                type: ids[1]
                price: price
                hasSetupFee: product.setupFee?
              additional_services.push(service)
            else if ids[0] is 'managed-apps'
              price = product.hourly
              server.options[ids[1]] = price #* @currency.rate
            else if ids[0] is 'networking'
              if ids[1] is 'bandwidth'
                price = product.monthly #* @currency.rate
                service =
                  type: 'bandwidth'
                  price: price
                  hasSetupFee: product.setupFee?
                additional_services.push(service)
              else if ids[1] is 'object-storage'
                price = product.monthly #* @currency.rate
                enabled = ids[2]? and ids[2] is 'enabled'
                service =
                  type: 'object-storage'
                  price: price
                  disabled: !enabled
                  hasSetupFee: product.setupFee?
                additional_services.push(service)
            else if ids[0] is 'ips'
              price = product.hourly #* @currency.rate
              service =
                type: 'ips'
                price: price
              additional_services.push(service)
            else if ids[0] is 'appfog'
              price = product.hourly #* @currency.rate
              service =
                type: 'appfog'
                price: price
              additional_services.push(service)
            else if ids[0] is 'baremetal'
              # baremetal['config']['1'] = product
              baremetal.options[ids[1]][ids[2]] = product

    server.options["software"] = software_licenses
    output.push(server)
    output.push(baremetal)
    _.each additional_services, (ser) -> output.push(ser)
    return output

module.exports = PricingMapsCollection
