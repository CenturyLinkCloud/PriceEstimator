#########################################################
# Title:  Tier 3 Pricing Calculator
# Author: matt@wintr.us @ WINTR
#########################################################


#--------------------------------------------------------
# Imports
#--------------------------------------------------------

Config = require './app/Config.coffee'
ServersView = require './app/views/ServersView.coffee'
SupportView = require './app/views/SupportView.coffee'
ServicesView = require './app/views/ServicesView.coffee'
AppfogsView = require './app/views/AppfogsView.coffee'
BaremetalConfigsView = require './app/views/BaremetalConfigsView.coffee'
MonthlyTotalView = require './app/views/MonthlyTotalView.coffee'
PricingMapsCollection = require './app/collections/PricingMapsCollection.coffee'
ServersCollection = require './app/collections/ServersCollection.coffee'
ServicesCollection = require './app/collections/ServicesCollection.coffee'
AppfogCollection = require './app/collections/AppfogCollection.coffee'
BaremetalCollection = require './app/collections/BaremetalCollection.coffee'
Utils = require('./app/Utils.coffee')
Q = require 'q'

#--------------------------------------------------------
# Init
#--------------------------------------------------------

App =
  initialized: false

  init: ->
    _.extend(@, Backbone.Events)

    # expose app for digital apps to update programmatically
    window.estimatorApp = @

    datacenter = Utils.getUrlParameterFromHash("datacenter")
    datasource = Utils.getUrlParameterFromHash("datasource")
    currencyId = Utils.getUrlParameterFromHash("currency") || Config.DEFAULT_CURRENCY.id

    dc = datacenter || "VA1"
    ds = datasource || "va1"

    @currency = @currencyData['USD'][currencyId]
    @currentDatacenter = dc

    @monthlyTotalView = new MonthlyTotalView
      app: @
      datacenter: dc
      datasource: ds
      currency: @currency

    @supportView = new SupportView
      app: @

    @pricingMaps = new PricingMapsCollection [],
      app: @
      datacenter: dc
      datasource: ds
      currency: @currency
      url: Config.PRICING_ROOT_PATH + "#{ds}.json"

    @pricingMaps.on "sync", =>
      @onPricingMapsSynced()

    @.on "currencyChange", =>
      @updateTotalPrice()


  onPricingMapsSynced: ->
    @initServers()
    @initHyperscaleServers()
    @initAppfogServices()
    @initBaremetalConfigs()

    @networkingServices = new ServicesCollection
      collectionUrl: "json/networking-services.json"

    @additionalServices = new ServicesCollection
      collectionUrl: "json/additional-services.json"

    @bandwidthServices = new ServicesCollection
      collectionUrl: "json/bandwidth.json"

    @networkingServices.on "sync", =>
      @initNetworkServices()

    @additionalServices.on "sync", =>
      @initAdditionalServices()

    @bandwidthServices.on "sync", =>
      @initBandwidthServices()


  initNetworkServices: ->
    @networkingServices.initPricing(@pricingMaps)

    @networkingServicesView = new ServicesView
      app: @
      collection: @networkingServices
      el: "#networking-services"

    @networkingServices.on "change", =>
      @updateTotalPrice()

    @initialized = true
    @updateTotalPrice()

  initAdditionalServices: ->
    @additionalServices.initPricing(@pricingMaps)

    @additionalServicesView = new ServicesView
      app: @
      collection: @additionalServices
      el: "#additional-services"

    @additionalServices.on "change", =>
      @updateTotalPrice()

    @initialized = true
    @updateTotalPrice()

    $(".main-container").addClass("visible")
    $(".spinner").hide()

  initBandwidthServices: ->
    @bandwidthServices.initPricing(@pricingMaps)

    @bandwidthServicesView = new ServicesView
      app: @
      collection: @bandwidthServices
      el: "#bandwidth"

    @bandwidthServices.on "change", =>
      @updateTotalPrice()

    @initialized = true
    @updateTotalPrice()

  initServers: ->
    @serversCollection = new ServersCollection

    @serversCollection.on "change remove add", =>
      @updateTotalPrice()

    @serversView = new ServersView
      app: @
      collection: @serversCollection
      el: "#servers"
      pricingMap: @pricingMaps.forKey("server")

  initHyperscaleServers: ->
    @hyperscaleServersCollection = new ServersCollection
    @hyperscaleServersCollection.on "change remove add", =>
      @updateTotalPrice()

    @hyperscaleServersView = new ServersView
      app: @
      collection: @hyperscaleServersCollection
      el: "#hyperscale-servers"
      pricingMap: @pricingMaps.forKey("server")
      hyperscale: true

  initAppfogServices: ->
    @appfogServicesCollection = new AppfogCollection
    @appfogServicesCollection.on "change remove add", =>
      @updateTotalPrice()

    @appfogsView = new AppfogsView
      app: @
      collection: @appfogServicesCollection
      el: "#appfog-services"
      pricingMap: @pricingMaps.forKey("appfog")

  initBaremetalConfigs: ->
    @baremetalCollection = new BaremetalCollection
    @baremetalCollection.on "change remove add", =>
      @updateTotalPrice()

    @BaremetalConfigsView = new BaremetalConfigsView
      app: @
      collection: @baremetalCollection
      el: "#baremetal-servers"
      pricingMap: @pricingMaps.forKey("baremetal")

  updateTotalPrice: ->
    return unless @initialized

    @totalPrice = @serversCollection.subtotal() +
                  @hyperscaleServersCollection.subtotal() +
                  @appfogServicesCollection.subtotal() +
                  @baremetalCollection.subtotal() +
                  @networkingServices.subtotal() +
                  @additionalServices.subtotal() +
                  @bandwidthServices.subtotal()

    @oSSubtotal = @serversCollection.oSSubtotal() + @hyperscaleServersCollection.oSSubtotal()

    @managedTotal = @serversCollection.managedTotal()

    @totalPriceWithSupport = @totalPrice + @supportView.updateSubtotal()

    @trigger("totalPriceUpdated")


  setPricingMap: (dc,ds) ->
    # Create new pricing map based on new database pricing info
    @pricingMaps = new PricingMapsCollection [],
      app: @
      datacenter: dc
      datasource: ds
      currency: @currency
      url: Config.PRICING_ROOT_PATH + "#{ds}.json"

    @pricingMaps.on "sync", =>

    # Update pricing map stored on the views (impacts new models)
      @hyperscaleServersView.options.pricingMap = @pricingMaps.forKey("server")
      @appfogsView.options.pricingMap = @pricingMaps.forKey("appfog")
      @BaremetalConfigsView.options.pricingMap = @pricingMaps.forKey("baremetal")
      @serversView.options.pricingMap = @pricingMaps.forKey("server")

      # Update pricing map stored on collections (impacts existing models)
      @serversCollection.initPricing(@pricingMaps)
      @hyperscaleServersCollection.initPricing(@pricingMaps)
      @appfogServicesCollection.initPricing(@pricingMaps.forKey("appfog"))
      @baremetalCollection.initPricing(@pricingMaps.forKey("baremetal"))
      @networkingServices.initPricing(@pricingMaps)
      @additionalServices.initPricing(@pricingMaps)
      @bandwidthServices.initPricing(@pricingMaps)



#--------------------------------------------------------
# DOM Ready
#--------------------------------------------------------
cb = Q.defer()

$ ->
  Config.init(App, cb).then ->
    App.init()
