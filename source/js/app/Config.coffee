Config = 
  NAME: ""
  CLC_PRICING_URL_ROOT: "/prices/"
  CLC_DATACENTERS_LIST: "/prices/data-center-prices.json"
  DEFAULT_CURRENCY:
    id: "USD"
    rate: 1.0
    symbol: "$"
  CURRENCY_FILE_PATH: "./currency/exchange-rates.json"

  init: (_callback) ->
    $.getJSON('./json/data-config.json', (data) =>
      config = data
      @CLC_PRICING_URL_ROOT = config.pricingRootPath
      @CLC_DATACENTERS_LIST = config.datacentersFile
      @DEFAULT_CURRENCY = config.defaultCurrency
      @CURRENCY_FILE_PATH = config.currencyFile
      @SUPPORT_PRICING = config.supportPricingFile
      return _callback.init()
    )
  

module.exports = Config