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
MonthlyTotalView = require './app/views/MonthlyTotalView.coffee'
PricingMapsCollection = require './app/collections/PricingMapsCollection.coffee'
ServersCollection = require './app/collections/ServersCollection.coffee'
ServicesCollection = require './app/collections/ServicesCollection.coffee'
ServiceModel = require './app/models/ServiceModel.coffee'


#--------------------------------------------------------
# Init
#--------------------------------------------------------

App =
  initialized: false

  init: ->
    _.extend(@, Backbone.Events)

    @monthlyTotalView = new MonthlyTotalView(app: @)
    @supportView = new SupportView(app: @)
    @pricingMaps = new PricingMapsCollection([], { datacenter: "united_states" })

    @pricingMaps.on "sync", =>
      @onPricingMapsSynced()


  onPricingMapsSynced: ->
    @initServers()
    @initHyperscaleServers()

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
      collection: @networkingServices
      el: "#networking-services"

    @networkingServices.on "change", =>
      @updateTotalPrice()

    @initialized = true
    @updateTotalPrice()

  initAdditionalServices: ->
    @additionalServices.initPricing(@pricingMaps)

    @additionalServicesView = new ServicesView
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
      collection: @serversCollection
      el: "#servers"
      pricingMap: @pricingMaps.forKey("server")

    # @serversView.addServer()

  initHyperscaleServers: ->
    @hyperscaleServersCollection = new ServersCollection

    @hyperscaleServersCollection.on "change remove add", =>
      @updateTotalPrice()

    @hyperscaleServersView = new ServersView
      collection: @hyperscaleServersCollection
      el: "#hyperscale-servers"
      pricingMap: @pricingMaps.forKey("server")
      hyperscale: true


  updateTotalPrice: ->
    return unless @initialized

    @totalPrice = @serversCollection.subtotal() +
                  @hyperscaleServersCollection.subtotal() +
                  @networkingServices.subtotal() +
                  @additionalServices.subtotal() +
                  @bandwidthServices.subtotal()

    @oSSubtotal = @serversCollection.oSSubtotal() + @hyperscaleServersCollection.oSSubtotal()

    @totalPriceWithSupport = @totalPrice + @supportView.updateSubtotal()

    @trigger("totalPriceUpdated")


  setPricingMap: (datacenter) ->

    # Create new pricing map based on new database pricing info
    @pricingMaps = new PricingMapsCollection([], { datacenter: datacenter })
    @pricingMaps.on "sync", =>

      # Update pricing map stored on the views (impacts new models)
      @hyperscaleServersView.options.pricingMap = @pricingMaps.forKey("server")
      @serversView.options.pricingMap = @pricingMaps.forKey("server")

      # Update pricing map stored on collections (impacts existing models)
      @serversCollection.initPricing(@pricingMaps)
      @hyperscaleServersCollection.initPricing(@pricingMaps)
      @networkingServices.initPricing(@pricingMaps)
      @additionalServices.initPricing(@pricingMaps)
      @bandwidthServices.initPricing(@pricingMaps)

#--------------------------------------------------------
# DOM Ready
#--------------------------------------------------------

$ ->
  App.init()
