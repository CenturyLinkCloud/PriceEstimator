PricingModel = require '../models/PricingMapModel.coffee'

PricingMapsCollection = Backbone.Collection.extend
  model: PricingModel

  initialize: (models, options) ->
    window.currentDatacenter = options.datacenter
    @url = "/prices/default.json"
    # @url = "json/pricing/" + options.datacenter + ".json"
    @fetch()

  parse: (data) ->
    output = []
    server = 
      type: "server"
      options:
        os:
          linux: 0
          redhat: 0
          windows: 0
          "redhat-managed": "disabled"
          "windows-managed": "disabled"
        storage:
          standard: 0
          premium: 0
          hyperscale: "disabled"
        "iis": 0.21,
        "active-directory": 0.275,
        "ms-sql": 0.48,
        "apache": 0.21,
        "cloudera-cdh5-basic": 0.62,
        "cloudera-cdh5-basic-hbase": 0.96,
        "cloudera-enterprise-data-hub": 1.23,
        "tomcat": 0.83,
        "mysql": 0.76,
        "mysql-replication-master-master": 0.5556,
        "mysql-replication-master-slave": 0.3472,
        "ssl": 84
    additional = []

    _.each data, (section) ->
      if section.products?
        _.each section.products, (product) ->
          if _.has(product,'id')
            ids = product.id.split(":")
            if ids[0] is 'server'
              if ids[1] is 'os' or ids[1] is 'storage'
                server.options[ids[1]][ids[2]] = product.hourly || 0
              else
                server.options[ids[1]] = product.hourly || product.monthly
            else if ids[0] is 'networking-services'
              price = product.hourly || product.monthly
              service = 
                type: ids[1]
                price: price
              additional.push(service)
    output.push(server)
    additional.push({type: 'bandwidth', price: 0.05})
    additional.push({type: 'object-storage', price: 0.15, disabled: true})
    _.each(additional, (ser) ->
      output.push(ser)
    )
    console.log output
    return output





  forKey: (type) ->
    _.first @where("type": type)

module.exports = PricingMapsCollection