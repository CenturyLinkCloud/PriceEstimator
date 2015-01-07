ServerModel = require '../../source/js/app/models/ServerModel.coffee'
PricingMapsCollection = require '../../source/js/app/collections/PricingMapsCollection.coffee'

describe 'Server', ->
  
  it 'should exist', (done) =>    
    pricingMaps = new PricingMapsCollection()
    pricingMaps.on "sync", =>
      serverPricingMap =  pricingMaps.forKey "server"
      server = new ServerModel(pricingMap: serverPricingMap)
      expect(server).to.exist
      done()

  it 'should calculate CPU price per hour', (done) =>
    pricingMaps = new PricingMapsCollection()
    pricingMaps.on "sync", =>
      serverPricingMap =  pricingMaps.forKey "server"
      server = new ServerModel(pricingMap: serverPricingMap)
      expect(server.totalCpuPerHour()).to.equal(0.01)

      server.set("cpu", 2)
      expect(server.totalCpuPerHour()).to.equal(0.02)

      done()

  it 'should calculate memory price per hour', (done) =>
    pricingMaps = new PricingMapsCollection()
    pricingMaps.on "sync", =>
      serverPricingMap =  pricingMaps.forKey "server"
      server = new ServerModel(pricingMap: serverPricingMap)
      expect(server.totalMemoryPerHour()).to.equal(0.015)

      server.set("memory", 2)
      expect(server.totalMemoryPerHour()).to.equal(0.03)
      done()

  it 'should calculate os price per hour', (done) =>
    pricingMaps = new PricingMapsCollection()
    pricingMaps.on "sync", =>
      serverPricingMap =  pricingMaps.forKey "server"
      server = new ServerModel(pricingMap: serverPricingMap)
      
      expect(server.totalOSPerHour()).to.equal(0)
      
      server.set("os", "windows")
      expect(server.totalOSPerHour()).to.equal(0.04)
      
      server.set("os", "redhat")
      expect(server.totalOSPerHour()).to.equal(0.04)

      done()

  it 'should calculate utility price per hour per instance', (done) =>
    pricingMaps = new PricingMapsCollection()
    pricingMaps.on "sync", =>
      serverPricingMap =  pricingMaps.forKey "server"
      server = new ServerModel(pricingMap: serverPricingMap)
      expect(server.utilityPricePerHourPerInstance()).to.equal(0.025)
      done()

  it 'should calculate utility price per hour', (done) =>
    pricingMaps = new PricingMapsCollection()
    pricingMaps.on "sync", =>
      serverPricingMap =  pricingMaps.forKey "server"
      server = new ServerModel(pricingMap: serverPricingMap)
      server.set("quantity", 2)      
      expect(server.utilityPricePerHourTotal()).to.equal(0.05)
      done()

  it 'should calculate storage price per month', (done) =>
    pricingMaps = new PricingMapsCollection()
    pricingMaps.on "sync", =>
      serverPricingMap =  pricingMaps.forKey "server"
      server = new ServerModel(pricingMap: serverPricingMap)
      expect(server.storagePricePerMonth()).to.equal(0.15)
      server.set("storage", 200)
      server.set("type", "premium")
      expect(server.storagePricePerMonth()).to.equal(100)
      done()

  it 'should calculate total price per month', (done) =>
    pricingMaps = new PricingMapsCollection()
    pricingMaps.on "sync", =>
      serverPricingMap =  pricingMaps.forKey "server"
      server = new ServerModel(pricingMap: serverPricingMap)
      expect(server.totalPricePerMonth()).to.equal(18.15)
      done()
