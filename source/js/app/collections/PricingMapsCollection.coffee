PricingModel = require '../models/PricingMapModel.coffee'

DEFAULT_SERVER_DATA = 
  "type": "server"
  "options":
    "os":
      "linux": 0
      "redhat": 0.04
      "windows": 0.04
      "redhat-managed": "disabled"
      "windows-managed": "disabled"
    "storage":
      "standard": 0.15
      "premium": 0.5
      "hyperscale": "disabled"

HOURS_IN_MONTH = 730


PricingMapsCollection = Backbone.Collection.extend
  model: PricingModel

  initialize: (models, options) ->
    window.currentDatacenter = options.datacenter
    window.currentDatasource = options.datasource
    @url = "/prices/#{options.datasource}.json"
    #@url = "/prices/#{options.datacenter.toLowerCase()}.json"
    #@url = "json/pricing/" + options.datacenter + ".json"
    @fetch()

  parse: (data) ->
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
                server.options[ids[1]][ids[2]] = product.hourly || 0
              else if ids[1] is 'storage'
                server.options[ids[1]][ids[2]] = product.hourly * HOURS_IN_MONTH
              else
                server.options[ids[1]] = product.hourly || product.monthly
            else if ids[0] is 'networking-services'
              if ids[1] is 'shared-load-balancer'
                price = product.monthly || product.hourly * HOURS_IN_MONTH
              else
                price = product.monthly
              service = 
                type: ids[1]
                price: price
              additional_services.push(service)
            else if ids[0] is 'managed-apps'
              server.options[ids[1]] = product.hourly

    output.push(server)

    additional_services.push({type: 'bandwidth', price: 0.05})

    additional_services.push({type: 'object-storage', price: 0.15, disabled: true})

    _.each additional_services, (ser) -> output.push(ser)

    console.log output

    return output

  forKey: (type) ->
    _.first @where("type": type)

module.exports = PricingMapsCollection