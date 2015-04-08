(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Config;

Config = {
  NAME: "",
  CLC_PRICING_URL_ROOT: "/prices/",
  CLC_DATACENTERS_LIST: "/prices/data-center-prices.json",
  DEFAULT_CURRENCY: {
    id: "USD",
    rate: 1.0,
    symbol: "$"
  },
  CURRENCY_FILE_PATH: "./currency/exchange-rates.json"
};

module.exports = Config;


},{}],2:[function(require,module,exports){
var Utils;

Utils = {
  getUrlParameter: function(sParam) {
    var i, sPageURL, sParameterName, sURLVariables;
    sPageURL = window.location.search.substring(1);
    sURLVariables = sPageURL.split('&');
    i = 0;
    while (i < sURLVariables.length) {
      sParameterName = sURLVariables[i].split('=');
      if (sParameterName[0] === sParam) {
        return sParameterName[1];
      }
      i++;
    }
  }
};

module.exports = Utils;


},{}],3:[function(require,module,exports){
var Config, DEFAULT_SERVER_DATA, HOURS_IN_MONTH, PricingMapsCollection, PricingModel;

PricingModel = require('../models/PricingMapModel.coffee');

Config = require('../Config.coffee');

DEFAULT_SERVER_DATA = require('../data/server.coffee');

HOURS_IN_MONTH = 730;

PricingMapsCollection = Backbone.Collection.extend({
  model: PricingModel,
  initialize: function(models, options) {
    window.currentDatacenter = options.datacenter;
    window.currentDatasource = options.datasource;
    this.currencyId = options.currency;
    this.app = options.app;
    this.url = options.url;
    return $.ajax({
      url: Config.CURRENCY_FILE_PATH,
      type: "GET",
      success: (function(_this) {
        return function(data) {
          _this.currency = data[Config.DEFAULT_CURRENCY.id][options.currency];
          _this.app.currency = window.currency = _this.currency;
          return _this.fetch();
        };
      })(this),
      error: (function(_this) {
        return function(error) {
          _this.currency = Config.DEFAULT_CURRENCY;
          _this.app.currency = window.currency = _this.currency;
          return _this.fetch();
        };
      })(this)
    });
  },
  parse: function(data) {
    return this._parsePricingData(data);
  },
  forKey: function(type) {
    return _.first(this.where({
      "type": type
    }));
  },
  _parsePricingData: function(data) {
    var additional_services, output, server, software_licenses;
    output = [];
    additional_services = [];
    software_licenses = [];
    server = _.clone(DEFAULT_SERVER_DATA);
    _.each(data, (function(_this) {
      return function(section) {
        if (section.name === "Software") {
          _.each(section.products, function(product) {
            var item, software_price;
            software_price = product.hourly * _this.currency.rate;
            item = {
              name: product.name,
              price: software_price
            };
            return software_licenses.push(item);
          });
        }
        if (section.products != null) {
          return _.each(section.products, function(product) {
            var enabled, ids, price, service;
            if (_.has(product, 'key')) {
              ids = product.key.split(":");
              if (ids[0] === 'server') {
                if (ids[1] === 'os') {
                  price = product.hourly || 0;
                  return server.options[ids[1]][ids[2]] = price * _this.currency.rate;
                } else if (ids[1] === 'storage') {
                  price = product.hourly * HOURS_IN_MONTH;
                  return server.options[ids[1]][ids[2]] = price * _this.currency.rate;
                } else {
                  price = product.hourly || product.monthly;
                  return server.options[ids[1]] = price * _this.currency.rate;
                }
              } else if (ids[0] === 'networking-services') {
                if (ids[1] === 'shared-load-balancer') {
                  price = product.monthly || product.hourly * HOURS_IN_MONTH;
                  price *= _this.currency.rate;
                } else {
                  price = product.monthly;
                  price *= _this.currency.rate;
                }
                service = {
                  type: ids[1],
                  price: price
                };
                return additional_services.push(service);
              } else if (ids[0] === 'managed-apps') {
                price = product.hourly;
                return server.options[ids[1]] = price * _this.currency.rate;
              } else if (ids[0] === 'networking') {
                if (ids[1] === 'bandwidth') {
                  price = product.monthly * _this.currency.rate;
                  service = {
                    type: 'bandwidth',
                    price: price
                  };
                  return additional_services.push(service);
                } else if (ids[1] === 'object-storage') {
                  price = product.monthly * _this.currency.rate;
                  enabled = (ids[2] != null) && ids[2] === 'enabled';
                  service = {
                    type: 'object-storage',
                    price: price,
                    disabled: !enabled
                  };
                  return additional_services.push(service);
                }
              }
            }
          });
        }
      };
    })(this));
    server.options["software"] = software_licenses;
    output.push(server);
    _.each(additional_services, function(ser) {
      return output.push(ser);
    });
    return output;
  }
});

module.exports = PricingMapsCollection;


},{"../Config.coffee":1,"../data/server.coffee":6,"../models/PricingMapModel.coffee":7}],4:[function(require,module,exports){
var ServerModel, ServersCollection;

ServerModel = require('../models/ServerModel.coffee');

ServersCollection = Backbone.Collection.extend({
  model: ServerModel,
  parse: function(data) {
    return data;
  },
  subtotal: function() {
    return _.reduce(this.models, function(memo, server) {
      return memo + server.totalPricePerMonth() + server.managedAppsPricePerMonth();
    }, 0);
  },
  oSSubtotal: function() {
    return _.reduce(this.models, function(memo, server) {
      return memo + server.totalOSPricePerMonth();
    }, 0);
  },
  initPricing: function(pricingMaps) {
    return this.each((function(_this) {
      return function(server) {
        var pricingMap;
        pricingMap = pricingMaps.forKey("server");
        return server.updatePricing(pricingMap);
      };
    })(this));
  }
});

module.exports = ServersCollection;


},{"../models/ServerModel.coffee":8}],5:[function(require,module,exports){
var ServiceModel, ServicesCollection;

ServiceModel = require('../models/ServiceModel.coffee');

ServicesCollection = Backbone.Collection.extend({
  model: ServiceModel,
  url: function() {
    return this.options.collectionUrl;
  },
  initialize: function(options) {
    this.options = options || {};
    return this.fetch();
  },
  initPricing: function(pricingMaps) {
    return this.each((function(_this) {
      return function(service) {
        var pricingMap;
        pricingMap = pricingMaps.forKey(service.get("key"));
        return service.initPricing(pricingMap);
      };
    })(this));
  },
  subtotal: function() {
    return _.reduce(this.models, function(memo, service) {
      return memo + service.totalPricePerMonth();
    }, 0);
  }
});

module.exports = ServicesCollection;


},{"../models/ServiceModel.coffee":9}],6:[function(require,module,exports){
module.exports = {
  type: "server",
  options: {
    os: {
      linux: 0,
      redhat: 0.04,
      windows: 0.04,
      "redhat-managed": "disabled",
      "windows-managed": "disabled"
    },
    storage: {
      standard: 0.15,
      premium: 0.5,
      "hyperscale": "disabled"
    }
  }
};


},{}],7:[function(require,module,exports){
var PricingMapModel;

PricingMapModel = Backbone.Model.extend({
  initialize: function() {},
  parse: function(data) {
    return data;
  }
});

module.exports = PricingMapModel;


},{}],8:[function(require,module,exports){
var ServerModel;

ServerModel = Backbone.Model.extend({
  HOURS_PER_DAY: "hours_per_day",
  HOURS_PER_WEEK: "hours_per_week",
  HOURS_PER_MONTH: "hours_per_month",
  PERCENTAGE_OF_MONTH: "percentage_of_month",
  HOURS_IN_MONTH: 730,
  DAYS_IN_MONTH: 30.41666667,
  WEEKS_IN_MONTH: 4.345238095,
  defaults: {
    type: "standard",
    os: "linux",
    cpu: 1,
    memory: 1,
    storage: 1,
    quantity: 1,
    usagePeriod: "percentage_of_month",
    usage: 100,
    managed: false,
    managedApps: []
  },
  initialize: function() {
    this.initPricing();
    return this.set("managedApps", []);
  },
  parse: function(data) {
    return data;
  },
  initPricing: function() {
    var pricing;
    pricing = this.get("pricingMap").attributes.options;
    return this.set("pricing", pricing);
  },
  updatePricing: function(pricingMap) {
    return this.set("pricing", pricingMap.attributes.options);
  },
  totalCpuPerHour: function() {
    return this.get("cpu") * this.get("pricing").cpu;
  },
  totalMemoryPerHour: function() {
    return this.get("memory") * this.get("pricing").memory;
  },
  totalOSPerHour: function() {
    var os;
    os = this.get("os");
    return this.get("pricing").os[os] * this.get("cpu");
  },
  managedBasePricePerHour: function() {
    var os, osPrice;
    if (this.get("managed")) {
      os = this.get("os");
      osPrice = this.get("pricing").os["" + os + "-managed"];
      return osPrice;
    } else {
      return 0;
    }
  },
  utilityPricePerHourPerInstance: function() {
    return this.totalCpuPerHour() + this.totalMemoryPerHour() + this.totalOSPerHour() + this.managedBasePricePerHour();
  },
  utilityPricePerHourTotal: function() {
    return this.utilityPricePerHourPerInstance() * this.get("quantity");
  },
  storagePricePerMonth: function() {
    var type;
    type = this.get("type");
    return this.get("storage") * this.get("pricing").storage[type] * this.get("quantity");
  },
  managedAppPricePerMonth: function(managedAppKey, instances, softwareId) {
    var appPerHour, appSoftwareHourlyPrice, softwarePricing, software_selection;
    softwarePricing = this.get('pricing').software;
    software_selection = _.findWhere(softwarePricing, {
      name: softwareId
    });
    appSoftwareHourlyPrice = software_selection != null ? software_selection.price : 0;
    appSoftwareHourlyPrice *= this.get("cpu") || 1;
    appPerHour = this.get("pricing")[managedAppKey];
    return ((this.priceForMonth(appPerHour) + this.priceForMonth(appSoftwareHourlyPrice)) * this.get("quantity")) * instances;
  },
  managedAppsPricePerMonth: function() {
    var apps, total;
    apps = this.get("managedApps");
    total = 0;
    _.each(apps, (function(_this) {
      return function(app) {
        return total += _this.managedAppPricePerMonth(app.key, app.instances, app.softwareId);
      };
    })(this));
    return total;
  },
  totalOSPricePerMonth: function() {
    return this.priceForMonth(this.totalOSPerHour()) * this.get("quantity");
  },
  totalPricePerMonth: function() {
    var total, utilityPerMonth;
    utilityPerMonth = 0;
    utilityPerMonth = this.priceForMonth(this.utilityPricePerHourTotal());
    total = utilityPerMonth + this.storagePricePerMonth();
    return total;
  },
  totalPricePerMonthWithApps: function() {
    var total;
    total = this.totalPricePerMonth + this.managedAppsPricePerMonth();
    return total;
  },
  priceForMonth: function(hourlyPrice) {
    switch (this.get("usagePeriod")) {
      case this.HOURS_PER_DAY:
        return hourlyPrice * this.get("usage") * this.DAYS_IN_MONTH;
      case this.HOURS_PER_WEEK:
        return hourlyPrice * this.get("usage") * this.WEEKS_IN_MONTH;
      case this.HOURS_PER_MONTH:
        return hourlyPrice * this.get("usage");
      case this.PERCENTAGE_OF_MONTH:
        return this.get("usage") / 100 * this.HOURS_IN_MONTH * hourlyPrice;
    }
  },
  addManagedApp: function(key, name) {
    var apps, exists;
    apps = this.get("managedApps");
    exists = false;
    _.each(apps, function(app) {
      if (app.key === key) {
        return exists = true;
      }
    });
    if (exists === false) {
      if (key === 'ms-sql') {
        apps.push({
          "key": key,
          "name": name,
          "instances": 1,
          "softwareId": "Microsoft SQL Server Standard Edition"
        });
      } else {
        apps.push({
          "key": key,
          "name": name,
          "instances": 1,
          "softwareId": ""
        });
      }
      this.set("managedApps", apps);
      this.trigger("change", this);
      return this.trigger("change:managedApps", this);
    }
  },
  updateManagedAppIntances: function(key, quantity, softwareId) {
    var apps;
    apps = this.get("managedApps");
    _.each(apps, function(app) {
      if (app.key === key) {
        app.instances = quantity;
        return app.softwareId = softwareId;
      }
    });
    this.set("managedApps", apps);
    return this.trigger("change:managedApps", this);
  }
});

module.exports = ServerModel;


},{}],9:[function(require,module,exports){
var ServiceModel;

ServiceModel = Backbone.Model.extend({
  defaults: {
    title: "",
    description: "",
    input: "select",
    quantity: 0,
    disabled: false
  },
  initPricing: function(pricingMap) {
    this.set("pricing", pricingMap.get('price'));
    return this.set("disabled", pricingMap.get('disabled'));
  },
  parse: function(data) {
    return data;
  },
  totalPricePerMonth: function() {
    return this.get("pricing") * this.get("quantity");
  }
});

module.exports = ServiceModel;


},{}],10:[function(require,module,exports){
module.exports = function(options) {
return (function() {
var $c, $e, $o;

$e = function(text, escape) {
  return ("" + text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/\//g, '&#47;').replace(/"/g, '&quot;');
};

$c = function(text) {
  switch (text) {
    case null:
    case void 0:
      return '';
    case true:
    case false:
      return '' + text;
    default:
      return text;
  }
};

$o = [];

$o.push("<td class='add-managed-app-cell table-cell' colspan='" + ($e($c(this.colspan))) + "'>\n  <div class='add-managed-button'>\n    <span class='plus'></span>\n    managed application \n    <span class='down-arrow'></span>\n    <div class='managed-app-options'>\n      <a class='redhat-app' href='#' data-key='apache' data-name='Apache HTTP Server'>Apache HTTP Server</a>\n      <a class='redhat-app' href='#' data-key='cloudera-cdh5-basic' data-name='Cloudera CDH5 Basic'>Cloudera CDH5 Basic</a>\n      <a class='redhat-app' href='#' data-key='cloudera-cdh5-basic-hbase' data-name='Cloudera CDH5 Basic + HBase'>Cloudera CDH5 Basic + HBase</a>\n      <a class='redhat-app' href='#' data-key='cloudera-enterprise-data-hub' data-name='Cloudera Enterprise Data Hub'>Cloudera Enterprise Data Hub</a>\n      <a class='redhat-app' href='#' data-key='mysql' data-name='MySQL'>MySQL</a>\n      <a class='redhat-app' href='#' data-key='mysql-replication-master-master' data-name='MySQL Replication (Master/Master)'>MySQL Replication (Master/Master)</a>\n      <a class='redhat-app' href='#' data-key='mysql-replication-master-slave' data-name='MySQL Replication (Master/Slave)'>MySQL Replication (Master/Slave)</a>\n      <a class='redhat-app' href='#' data-key='tomcat' data-name='Tomcat'>Tomcat</a>\n      <a class='windows-app' href='#' data-key='active-directory' data-name='Active Directory'>Active Directory</a>\n      <a class='windows-app' href='#' data-key='ms-sql' data-name='MS SQL'>MS SQL</a>\n      <a class='windows-app' href='#' data-key='iis' data-name='MS IIS'>MS IIS</a>\n      <!-- %a{:href => \"#\", data: {key: \"ssl\", name: \"GeoTrust Quick SSL Certificate\"}} GeoTrust Quick SSL Certificate -->\n    </div>\n  </div>\n</td>");

return $o.join("\n").replace(/\s(\w+)='true'/mg, ' $1').replace(/\s(\w+)='false'/mg, '').replace(/\s(?:id|class)=(['"])(\1)/mg, "");

}).call(options)
};
},{}],11:[function(require,module,exports){
module.exports = function(options) {
return (function() {
var $c, $e, $o, soft, _i, _len, _ref;

$e = function(text, escape) {
  return ("" + text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/\//g, '&#47;').replace(/"/g, '&quot;');
};

$c = function(text) {
  switch (text) {
    case null:
    case void 0:
      return '';
    case true:
    case false:
      return '' + text;
    default:
      return text;
  }
};

$o = [];

$o.push("<td class='managed-app-quantity-cell table-cell' colspan='1'>\n  <span class='managed-app-quantity'></span>\n</td>\n<td class='managed-app-usage-cell table-cell' colspan='2'>");

if (this.app.key === "mysql" || this.app.key === "ms-sql") {
  $o.push("  x\n  <input class='number' name='usage' value='" + ($e($c(1))) + "' type='text'>\n  instance(s) / server");
} else {
  $o.push("  &nbsp;");
}

$o.push("</td>");

if (this.app.key === "ms-sql") {
  $o.push("<td class='managed-app-cell table-cell' colspan='" + ($e($c(this.colspan))) + "'>\n  Managed " + this.app.name + " \n  <br>\n    <small>\n      <span class='managed-app-subnote managed-app-subnote--select'>with MS SQL Server Standard Edition License (per vCPU)</span>\n    </small>\n  <br>\n  <select class='hidden software' name='softwareId'>");
  _ref = this.software_options;
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    soft = _ref[_i];
    if (soft.name === this.app.softwareId) {
      $o.push("    <option value='" + ($e($c(soft.name))) + "' selected>" + ($e($c(soft.name))) + "</option>");
    } else {
      $o.push("    <option value='" + ($e($c(soft.name))) + "'>" + ($e($c(soft.name))) + "</option>");
    }
  }
  $o.push("  </select>\n</td>");
} else {
  $o.push("<td class='managed-app-cell table-cell' colspan='" + ($e($c(this.colspan))) + "'>\n  Managed " + this.app.name + "\n</td>");
}

$o.push("<td class='price-cell table-cell' colspan='1'>\n  <span class='price'></span>\n  <a class='remove-button' href='#' data-key='" + ($e($c(this.app.key))) + "'>X</a>\n</td>");

return $o.join("\n").replace(/\s(\w+)='true'/mg, ' $1').replace(/\s(\w+)='false'/mg, '').replace(/\s(?:id|class)=(['"])(\1)/mg, "");

}).call(options)
};
},{}],12:[function(require,module,exports){
module.exports = function(options) {
return (function() {
var $c, $e, $o;

$e = function(text, escape) {
  return ("" + text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/\//g, '&#47;').replace(/"/g, '&quot;');
};

$c = function(text) {
  switch (text) {
    case null:
    case void 0:
      return '';
    case true:
    case false:
      return '' + text;
    default:
      return text;
  }
};

$o = [];

$o.push("<td class='quantity-cell table-cell'>\n  <input class='number' name='quantity' value='" + ($e($c(this.model.get("quantity")))) + "' type='text'>\n</td>\n<td class='table-cell usage-cell'>\n  <input class='number' name='usage' value='" + ($e($c(this.model.get("usage")))) + "' type='text'>\n  <select name='usagePeriod'>\n    <option value='hours_per_month' selected='" + ($e($c(this.model.get('usagePeriod') === 'hours_per_month'))) + "'>hrs / month</option>\n    <option value='percentage_of_month' selected='" + ($e($c(this.model.get('usagePeriod') === 'percentage_of_month'))) + "'>% / month</option>\n    <option value='hours_per_week' selected='" + ($e($c(this.model.get('usagePeriod') === 'hours_per_week'))) + "'>hrs / week</option>\n    <option value='hours_per_day' selected='" + ($e($c(this.model.get('usagePeriod') === 'hours_per_day'))) + "'>hrs / day</option>\n  </select>\n</td>");

if (this.model.get("type") === "hyperscale") {
  $o.push("<input type='hidden' value='hyperscale'>");
} else {
  $o.push("<td class='table-cell type-cell'>\n  <select name='type'>\n    <option value='standard' selected='" + ($e($c(this.model.get('type') === 'standard'))) + "'>standard</option>\n    <option value='premium' selected='" + ($e($c(this.model.get('type') === 'premium'))) + "'>premium</option>\n  </select>\n</td>");
}

$o.push("<td class='os-cell table-cell'>\n  <select name='os'>\n    <option value='linux' selected='" + ($e($c(this.model.get('os') === 'linux'))) + "'>Linux</option>\n    <option value='redhat' selected='" + ($e($c(this.model.get('os') === 'redhat'))) + "'>Red Hat</option>\n    <option value='windows' selected='" + ($e($c(this.model.get('os') === 'windows'))) + "'>Windows</option>\n  </select>\n</td>\n<td class='" + (['table-cell', 'managed-cell', "" + ($e($c(this.disabledClass)))].sort().join(' ').replace(/^\s+|\s+$/g, '')) + "'>\n  <input class='managed-check' type='checkbox' name='managed'>\n</td>\n<td class='cpu-cell range-cell table-cell'>\n  <input class='cpu-text-input' data-name='cpu'>\n  <input class='range-slider' name='cpu' type='range' min='" + ($e($c(1))) + "' max='" + ($e($c(16))) + "' value='" + ($e($c(this.model.get("cpu")))) + "'>\n</td>\n<td class='memory-cell range-cell table-cell'>\n  <input class='memory-text-input' data-name='memory'>\n  <input class='range-slider' name='memory' type='range' min='" + ($e($c(1))) + "' max='" + ($e($c(128))) + "' value='" + ($e($c(this.model.get("memory")))) + "'>\n</td>\n<td class='range-cell storage-cell table-cell'>\n  <input class='storage-text-input' data-name='storage'>");

if (this.model.get("type") === "hyperscale") {
  $o.push("  <input class='range-slider' name='storage' type='range' min='" + ($e($c(1))) + "' max='" + ($e($c(1024))) + "' step='" + ($e($c(1))) + "' value='" + ($e($c(this.model.get("storage")))) + "'>");
} else {
  $o.push("  <input class='range-slider' name='storage' type='range' min='" + ($e($c(1))) + "' max='" + ($e($c(4000))) + "' step='" + ($e($c(1))) + "' value='" + ($e($c(this.model.get("storage")))) + "'>");
}

$o.push("</td>\n<td class='price-cell table-cell'>\n  <span class='price'>");

$o.push("    " + $e($c(accounting.formatMoney(this.model.totalPricePerMonth(), {
  "symbol": this.app.currency.symbol
}))));

$o.push("  </span>\n  <a class='remove-button' href='#'>X</a>\n</td>");

return $o.join("\n").replace(/\s(\w+)='true'/mg, ' $1').replace(/\s(\w+)='false'/mg, '').replace(/\s(?:id|class)=(['"])(\1)/mg, "");

}).call(options)
};
},{}],13:[function(require,module,exports){
module.exports = function(options) {
return (function() {
var $c, $e, $o;

$e = function(text, escape) {
  return ("" + text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/\//g, '&#47;').replace(/"/g, '&quot;');
};

$c = function(text) {
  switch (text) {
    case null:
    case void 0:
      return '';
    case true:
    case false:
      return '' + text;
    default:
      return text;
  }
};

$o = [];

$o.push("<form>\n  <div class='service__info'>\n    <h4>" + ($e($c(this.model.get("title")))) + "</h4>");

if (this.model.get("description")) {
  $o.push("    <div class='service__description'>\n      <p>");
  $o.push("        " + $e($c(this.model.get("description"))));
  if (this.model.get("link")) {
    $o.push("        <br>\n        <a href='" + ($e($c(this.model.get("link")))) + "' target='_blank'>more info</a>");
  }
  $o.push("      </p>\n    </div>");
}

$o.push("  </div>\n  <div class='" + (['service__inputs', "" + ($e($c(this.model.get("input"))))].sort().join(' ').replace(/^\s+|\s+$/g, '')) + "'>");

if (this.model.get("input") === "slider") {
  $o.push("    <div class='quantity-wrapper'>\n      <span class='quantity'>");
  $o.push("        " + $e($c(this.model.get("quantity"))));
  $o.push("      </span>\n      GB\n    </div>\n    <input class='range-slider' type='range' name='quantity' min='" + ($e($c(0))) + "' max='" + ($e($c(10000))) + "' value='" + ($e($c(this.model.get("quantity")))) + "'>");
} else {
  $o.push("    <span class='select'></span>\n    QTY\n      <select name='quantity'>\n        <option>0</option>\n        <option>1</option>\n        <option>2</option>\n        <option>3</option>\n        <option>4</option>\n        <option>5</option>\n      </select>\n      x\n      <span class='cost'>");
  $o.push("        " + $e($c(accounting.formatMoney(this.model.get("pricing"), {
    "symbol": this.app.currency.symbol
  }))));
  $o.push("      </span>");
}

$o.push("    <span class='price'>");

$o.push("      " + $e($c(accounting.formatMoney(this.model.totalPricePerMonth, {
  "symbol": this.app.currency.symbol
}))));

$o.push("    </span>\n  </div>\n</form>");

return $o.join("\n").replace(/\s(\w+)='true'/mg, ' $1').replace(/\s(\w+)='false'/mg, '').replace(/\s(?:id|class)=(['"])(\1)/mg, "");

}).call(options)
};
},{}],14:[function(require,module,exports){
var AddManagedAppView;

AddManagedAppView = Backbone.View.extend({
  tagName: "tr",
  className: "table-row add-managed-app-row is-managed",
  render: function() {
    var colspan, template;
    template = require("../templates/addManagedApp.haml");
    colspan = this.model.get("type") === "hyperscale" ? 8 : 9;
    this.$el.html(template({
      os: this.model.get("os"),
      colspan: colspan
    }));
    this.$el.addClass("managed-app-add-button-for-server_" + this.model.cid);
    this.updateOptions();
    return this;
  },
  events: function() {
    return {
      "click a": "addManagedApp"
    };
  },
  addManagedApp: function(e) {
    var key, name;
    e.preventDefault();
    key = $(e.currentTarget).data("key");
    name = $(e.currentTarget).data("name");
    return this.model.addManagedApp(key, name);
  },
  updateOptions: function() {
    if (this.model.get("os") === "windows") {
      $(".redhat-app", this.$el).hide();
      return $(".windows-app", this.$el).css("display", "block");
    } else {
      $(".redhat-app", this.$el).css("display", "block");
      return $(".windows-app", this.$el).hide();
    }
  }
});

module.exports = AddManagedAppView;


},{"../templates/addManagedApp.haml":10}],15:[function(require,module,exports){
var ManagedAppView;

ManagedAppView = Backbone.View.extend({
  tagName: "tr",
  className: "table-row managed-app-row is-managed",
  events: function() {
    return {
      "click .remove-button": "onRemoveClick",
      "change input": "onFormChanged",
      "change select": "onFormChanged",
      "input input": "onFormChanged",
      "keyup input": "onFormChanged",
      "keypress input": "ensureNumber"
    };
  },
  initialize: function(options) {
    return this.options = options || {};
  },
  render: function() {
    var colspan, template;
    template = require("../templates/managedApp.haml");
    colspan = this.model.get("type") === "hyperscale" ? 4 : 5;
    this.$el.html(template({
      app: this.options.app,
      colspan: colspan,
      mainApp: this.options.mainApp,
      software_options: this.model.attributes.pricing.software
    }));
    this.$el.addClass("managed-row-for-server_" + this.model.cid);
    this.updateQuantityAndPrice();
    return this;
  },
  onRemoveClick: function(e) {
    var apps, key;
    e.preventDefault();
    key = $(e.currentTarget).data("key");
    apps = this.model.get("managedApps");
    apps = _.reject(apps, function(app) {
      return app.key === key;
    });
    return this.model.set("managedApps", apps);
  },
  updateQuantityAndPrice: function() {
    var instances, price, quantity;
    quantity = this.model.get("quantity");
    price = this.model.managedAppPricePerMonth(this.options.app.key, this.options.app.instances, this.options.app.softwareId);
    instances = this.options.app.instances || 1;
    $(".managed-app-quantity", this.$el).html(quantity);
    $(".price", this.$el).html(accounting.formatMoney(price), {
      symbol: this.options.mainApp.currency.symbol
    });
    return $("input[name=usage]", this.$el).val(instances);
  },
  onFormChanged: function() {
    var instances, softwareId;
    softwareId = $("select[name=softwareId]", this.$el).val();
    instances = $("input[name=usage]", this.$el).val() || 1;
    return this.model.updateManagedAppIntances(this.options.app.key, instances, softwareId);
  },
  ensureNumber: function(e) {
    var charCode;
    charCode = (e.which ? e.which : e.keyCode);
    return !(charCode > 31 && (charCode < 48 || charCode > 57));
  }
});

module.exports = ManagedAppView;


},{"../templates/managedApp.haml":11}],16:[function(require,module,exports){
var Config, MonthlyTotalView;

Config = require('../Config.coffee');

MonthlyTotalView = Backbone.View.extend({
  el: "#monthly-total",
  events: {
    "change .datacenter": "changeDatacenter",
    "change .currency": "changeCurrency"
  },
  initialize: function(options) {
    var mediaQueryList;
    this.options = options || {};
    this.app = this.options.app;
    this.app.on("totalPriceUpdated", (function(_this) {
      return function() {
        return _this.updateTotal();
      };
    })(this));
    $.getJSON(Config.CLC_DATACENTERS_LIST, (function(_this) {
      return function(data) {
        return $.each(data, function(index, location) {
          var $option, alias, label, pricingSheetHref, selected;
          label = location.name.replace("_", " ");
          pricingSheetHref = location.links[0].href.replace("/prices/", "").replace(".json", "");
          alias = location.alias.toUpperCase();
          selected = options.datacenter === alias ? "selected" : "";
          $option = $("<option value='" + alias + "' " + selected + ">" + label + " - " + alias + "</option>").attr('data-pricing-map', pricingSheetHref);
          return $(".datacenter", _this.$el).append($option);
        });
      };
    })(this));
    $.getJSON(Config.CURRENCY_FILE_PATH, (function(_this) {
      return function(currencies) {
        return $.each(currencies["USD"], function(index, currency) {
          var $option, label, rate, selected, symbol;
          label = currency.id;
          rate = currency.rate;
          symbol = currency.symbol;
          selected = options.currency === label ? "selected" : "";
          $option = $("<option value='" + label + "' " + selected + ">" + label + "</option>").attr('data-currency-symbol', symbol).attr('data-currency-rate', rate);
          return $(".currency", _this.$el).append($option);
        });
      };
    })(this));
    mediaQueryList = window.matchMedia('print');
    mediaQueryList.addListener((function(_this) {
      return function(mql) {
        if (mql.matches) {
          return $('.green-section').clone().addClass('clone').css('position', 'relative').attr('id', '').appendTo('.page-form');
        } else {
          return $('.green-section.clone').remove();
        }
      };
    })(this));
    $(window.top).scroll((function(_this) {
      return function() {
        return _this.positionHeader();
      };
    })(this));
    $(".estimator-print", this.$el).on('click', function(e) {
      e.preventDefault();
      return window.print();
    });
    this.commandKey = false;
    $(document, '#estimator').on('keyup', (function(_this) {
      return function(e) {
        if (e.which === 91 || e.which === 93) {
          return _this.commandKey = false;
        }
      };
    })(this));
    return $(document, '#estimator').on('keydown', (function(_this) {
      return function(e) {
        if (e.which === 91 || e.which === 93) {
          _this.commandKey = true;
        }
        if (e.ctrlKey && e.which === 80) {
          e.preventDefault();
          window.print();
          return false;
        } else if (_this.commandKey && e.which === 80) {
          e.preventDefault();
          window.print();
          return false;
        }
      };
    })(this));
  },
  updateTotal: function() {
    var newTotal;
    newTotal = accounting.formatMoney(this.app.totalPriceWithSupport, {
      symbol: this.app.currency.symbol
    });
    return $(".price", this.$el).html(newTotal);
  },
  positionHeader: function() {
    if ($(window).scrollTop() > 289) {
      return this.$el.css("position", "fixed");
    } else {
      return this.$el.css("position", "absolute");
    }
  },
  changeDatacenter: function(e) {
    var $currencies, $selected, $target, currency, datasource, href;
    $target = $(e.target);
    $currencies = $(".currency", this.$el);
    currency = $currencies.val() || Config.DEFAULT_CURRENCY.id;
    href = window.top.location.href;
    href = href.replace(/\?datacenter=.*/, "");
    $selected = $target.find('option:selected');
    datasource = $selected.attr('data-pricing-map') || 'default';
    href = "" + href + "?datacenter=" + ($target.val()) + "&datasource=" + datasource + "&currency=" + currency;
    return window.top.location.href = href;
  },
  changeCurrency: function(e) {
    var $datacenters, $selected_datacenter, $target, currency, datacenter, datasource, href;
    $datacenters = $(".datacenter", this.$el);
    datacenter = $datacenters.val();
    $selected_datacenter = $datacenters.find('option:selected');
    datasource = $selected_datacenter.attr('data-pricing-map') || 'default';
    $target = $(e.currentTarget);
    currency = $target.val() || Config.DEFAULT_CURRENCY.id;
    href = window.top.location.href;
    href = href.replace(/\?datacenter=.*/, "");
    href = "" + href + "?datacenter=" + datacenter + "&datasource=" + datasource + "&currency=" + currency;
    return window.top.location.href = href;
  }
});

module.exports = MonthlyTotalView;


},{"../Config.coffee":1}],17:[function(require,module,exports){
var AddManagedAppView, ManagedAppView, ServerView;

AddManagedAppView = require('./AddManagedAppView.coffee');

ManagedAppView = require('./ManagedAppView.coffee');

ServerView = Backbone.View.extend({
  tagName: "tr",
  className: "table-row",
  events: {
    "keypress .number": "ensureNumber",
    "click .remove-button": "removeServer",
    "click .managed-check": "onManagedCheckboxChanged",
    "change select[name]": "onFormChanged",
    "change input[name]": "onFormChanged",
    "input input[name]": "onFormChanged",
    "keyup input[name]": "onFormChanged",
    "keypress input:not([name])": "ensureNumber",
    "input input:not([name])": "onSliderTextChanged"
  },
  initialize: function(options) {
    this.options = options || {};
    this.app = this.options.app;
    this.appViews = [];
    this.listenTo(this.model, 'change', (function(_this) {
      return function(model) {
        return _this.onModelChange(model);
      };
    })(this));
    return this.listenTo(this.model, 'change:managedApps', (function(_this) {
      return function(model) {
        return _this.onManagedChanged(model);
      };
    })(this));
  },
  render: function() {
    var disabledClass, managedDisabled, template;
    template = require("../templates/server.haml");
    managedDisabled = this.model.get("pricingMap").get("options").os["redhat-managed"] === "disabled";
    disabledClass = "";
    if (managedDisabled) {
      disabledClass = "disabled";
    }
    this.$el.html(template({
      model: this.model,
      app: this.app,
      disabledClass: disabledClass
    }));
    this.$el.attr("id", this.model.cid);
    _.defer((function(_this) {
      return function() {
        $('.range-slider', _this.$el).rangeslider({
          polyfill: false
        });
        return $('.range-slider', _this.$el).css("opacity", 1);
      };
    })(this));
    return this;
  },
  close: function() {
    this.remove();
    this.unbind();
    if (this.addManagedAppView) {
      this.addManagedAppView.remove();
    }
    return this.removeAllManagedApps();
  },
  removeServer: function(e) {
    e.preventDefault();
    return this.model.destroy();
  },
  ensureNumber: function(e) {
    var charCode;
    charCode = (e.which ? e.which : e.keyCode);
    return !(charCode > 31 && (charCode < 48 || charCode > 57));
  },
  onSliderTextChanged: function(e) {
    var $this, data, name, value;
    $this = $(e.currentTarget);
    name = $this.data("name");
    value = $this.val();
    if (value === "") {
      return;
    }
    data = Backbone.Syphon.serialize(this);
    data.storage = value;
    this.model.set(data);
    return $("[name=" + name + "]", this.$el).val(value).change();
  },
  onFormChanged: function(e) {
    var data;
    e.preventDefault();
    data = Backbone.Syphon.serialize(this);
    return this.model.set(data);
  },
  onManagedCheckboxChanged: function(e) {
    var $check;
    $check = $(e.currentTarget);
    if ($check.is(":checked")) {
      return this.addMangedApps();
    } else {
      return this.removeAllManagedAppsAndAddButton();
    }
  },
  addMangedApps: function() {
    this.addManagedAppView = new AddManagedAppView({
      model: this.model
    });
    return this.$el.after(this.addManagedAppView.render().el);
  },
  removeAllManagedApps: function() {
    _.each(this.appViews, function(appView) {
      return appView.remove();
    });
    return this.appViews = [];
  },
  removeAllManagedAppsAndAddButton: function() {
    this.$el.removeClass("is-managed");
    this.model.set("managedApps", []);
    if (this.addManagedAppView) {
      this.addManagedAppView.remove();
    }
    return this.removeAllManagedApps();
  },
  onManagedChanged: function(model) {
    var managedApps;
    this.removeAllManagedApps();
    managedApps = model.get("managedApps");
    return _.each(managedApps, (function(_this) {
      return function(app) {
        var managedAppView;
        managedAppView = new ManagedAppView({
          model: model,
          app: app,
          mainApp: _this.app
        });
        _this.appViews.push(managedAppView);
        _this.addManagedAppView.$el.before(managedAppView.render().el);
        return _this.onModelChange(model);
      };
    })(this));
  },
  onModelChange: function(model) {
    var newTotal;
    newTotal = accounting.formatMoney(model.totalPricePerMonth(), {
      symbol: this.app.currency.symbol
    });
    $(".price", this.$el).html(newTotal);
    $(".cpu", this.$el).html(model.get("cpu"));
    $(".memory", this.$el).html(model.get("memory"));
    $(".storage", this.$el).html(model.get("storage"));
    $(".storage-text-input", this.$el).val(model.get("storage"));
    $(".cpu-text-input", this.$el).val(model.get("cpu"));
    $(".memory-text-input", this.$el).val(model.get("memory"));
    if (model.get("os") === "linux") {
      model.set("managed", false);
      $(".managed-check", this.$el).attr("disabled", true);
      $(".managed-check", this.$el).attr("checked", false);
      this.removeAllManagedAppsAndAddButton();
    } else {
      $(".managed-check", this.$el).attr("disabled", false);
    }
    _.each(this.appViews, (function(_this) {
      return function(appView) {
        return appView.updateQuantityAndPrice();
      };
    })(this));
    if (this.addManagedAppView) {
      this.addManagedAppView.updateOptions();
    }
    return this.options.parentView.collection.trigger('change');
  }
});

module.exports = ServerView;


},{"../templates/server.haml":12,"./AddManagedAppView.coffee":14,"./ManagedAppView.coffee":15}],18:[function(require,module,exports){
var ServerModel, ServerView, ServersView;

ServerView = require('./ServerView.coffee');

ServerModel = require('../models/ServerModel.coffee');

ServersView = Backbone.View.extend({
  events: {
    "click .add-button": "addServer"
  },
  initialize: function(options) {
    this.options = options || {};
    this.app = this.options.app;
    this.collection.on("add", (function(_this) {
      return function(model, collection, options) {
        return _this.onServerAdded(model);
      };
    })(this));
    this.collection.on("remove", (function(_this) {
      return function(model, collection, options) {
        return _this.onServerRemoved(model);
      };
    })(this));
    this.collection.on("change", (function(_this) {
      return function() {
        return _this.updateSubtotal();
      };
    })(this));
    this.updateSubtotal();
    this.serverViews = [];
    if (this.options.hyperscale) {
      if (this.options.pricingMap.get("options").storage.hyperscale === "disabled") {
        this.$el.addClass("disabled");
      }
    }
    return $('.has-tooltip', this.$el).tooltip();
  },
  addServer: function(e) {
    var type;
    if (e) {
      e.preventDefault();
    }
    type = this.options.hyperscale === true ? "hyperscale" : "standard";
    return this.collection.add({
      pricingMap: this.options.pricingMap,
      type: type
    });
  },
  onServerAdded: function(model) {
    var serverView;
    serverView = new ServerView({
      model: model,
      app: this.app,
      parentView: this
    });
    this.serverViews[model.cid] = serverView;
    $(".table", this.$el).append(serverView.render().el);
    return this.updateSubtotal();
  },
  onServerRemoved: function(model) {
    this.serverViews[model.cid].close();
    return this.updateSubtotal();
  },
  updateSubtotal: function() {
    var newSubtotal;
    newSubtotal = accounting.formatMoney(this.collection.subtotal(), {
      symbol: this.app.currency.symbol
    });
    return $(".subtotal", this.$el).html(newSubtotal);
  }
});

module.exports = ServersView;


},{"../models/ServerModel.coffee":8,"./ServerView.coffee":17}],19:[function(require,module,exports){
var ServiceView;

ServiceView = Backbone.View.extend({
  className: "service",
  events: {
    "change select": "onFormChanged",
    "change input": "onFormChanged",
    "input input": "onFormChanged"
  },
  initialize: function(options) {
    this.options = options || {};
    this.app = this.options.app;
    return this.model.on("change", (function(_this) {
      return function(model) {
        return _this.onModelChange(model);
      };
    })(this));
  },
  render: function() {
    var template;
    template = require("../templates/service.haml");
    this.$el.html(template({
      model: this.model,
      app: this.app
    }));
    this.$el.attr("id", this.model.cid);
    this.$el.addClass(this.model.get("key"));
    if (this.options.disabled) {
      this.$el.addClass("disabled");
    }
    _.defer((function(_this) {
      return function() {
        $('.range-slider', _this.$el).rangeslider({
          polyfill: false
        });
        return $('.range-slider', _this.$el).css("opacity", 1);
      };
    })(this));
    return this;
  },
  onFormChanged: function(e) {
    var data;
    e.preventDefault();
    data = Backbone.Syphon.serialize(this);
    return this.model.set(data);
  },
  onModelChange: function(model) {
    var newCost, newPrice;
    newCost = accounting.formatMoney(model.get("pricing"), {
      symbol: this.app.currency.symbol
    });
    newPrice = accounting.formatMoney(model.totalPricePerMonth(), {
      symbol: this.app.currency.symbol
    });
    $(".cost", this.$el).html(newCost);
    $(".price", this.$el).html(newPrice);
    $(".quantity", this.$el).html(model.get("quantity"));
    if (model.get("quantity") > 0) {
      return this.$el.addClass("active");
    } else {
      return this.$el.removeClass("active");
    }
  }
});

module.exports = ServiceView;


},{"../templates/service.haml":13}],20:[function(require,module,exports){
var ServiceModel, ServiceView, ServicesView;

ServiceView = require('./ServiceView.coffee');

ServiceModel = require('../models/ServiceModel.coffee');

ServicesView = Backbone.View.extend({
  initialize: function(options) {
    this.options = options || {};
    this.app = this.options.app;
    this.collection.on("reset", (function(_this) {
      return function(model, collection, options) {
        _this.$el.html("");
        return _this.addServices();
      };
    })(this));
    this.collection.on("change", (function(_this) {
      return function() {
        return _this.updateSubtotal();
      };
    })(this));
    this.addServices();
    return this.updateSubtotal();
  },
  addServices: function() {
    return this.collection.each((function(_this) {
      return function(service) {
        var disabled, serviceView;
        disabled = service.get('disabled');
        serviceView = new ServiceView({
          model: service,
          disabled: disabled,
          app: _this.app
        });
        return $(".services", _this.$el).append(serviceView.render().el);
      };
    })(this));
  },
  updateSubtotal: function() {
    var newSubtotal;
    newSubtotal = accounting.formatMoney(this.collection.subtotal(), {
      symbol: this.app.currency.symbol
    });
    return $(".subtotal", this.$el).html(newSubtotal);
  }
});

module.exports = ServicesView;


},{"../models/ServiceModel.coffee":9,"./ServiceView.coffee":19}],21:[function(require,module,exports){
var SupportView;

SupportView = Backbone.View.extend({
  el: "#support",
  events: {
    "click .support-select": "onSupportSelectClick",
    "click .support-select a": "onSupportSelectInnerLinkClick"
  },
  initialize: function(options) {
    this.options = options || {};
    return this.selectPlan("developer");
  },
  onSupportSelectClick: function(e) {
    var $this, plan;
    e.preventDefault();
    e.stopPropagation();
    $this = $(e.currentTarget);
    plan = $this.data("plan");
    this.selectPlan(plan);
    return this.options.app.updateTotalPrice();
  },
  onSupportSelectInnerLinkClick: function(e) {
    return e.stopPropagation();
  },
  selectPlan: function(plan) {
    this.currentPlan = plan;
    $(".support-select").removeClass("selected");
    $(".support-select .status-label").html("Select");
    $(".support-select[data-plan=" + plan + "]").addClass("selected");
    $(".support-select[data-plan=" + plan + "] .status-label").html("Selected");
    return this.updateSubtotal();
  },
  calculateSupportBill: function() {
    var amount, multipliers, percentages, ranges, total;
    if (this.currentPlan === "developer") {
      return 0;
    }
    amount = this.options.app.totalPrice - this.options.app.oSSubtotal || 0;
    ranges = [10000, 80000, 250000, 1000000];
    percentages = [.1, .07, .05, .03];
    multipliers = _.map(ranges, function(range, index) {
      var previousRange;
      previousRange = ranges[index - 1] || null;
      if (index === 0 && amount < range) {
        return [amount, percentages[index]];
      }
      if (previousRange > amount) {
        return null;
      } else if (amount < range) {
        return [amount - previousRange, percentages[index]];
      } else {
        return [range - previousRange, percentages[index]];
      }
    });
    total = 0;
    _.map(multipliers, function(range) {
      if (range) {
        return total = total + (range[0] * range[1]);
      }
    });
    return total;
  },
  updateSubtotal: function() {
    var newSubtotal;
    this.supportPrice = this.calculateSupportBill();
    newSubtotal = accounting.formatMoney(this.supportPrice, {
      symbol: this.options.app.currency.symbol
    });
    $(".subtotal", this.$el).html(newSubtotal);
    return this.supportPrice;
  }
});

module.exports = SupportView;


},{}],22:[function(require,module,exports){
var App, Config, MonthlyTotalView, PRICES_URL_ROOT, PricingMapsCollection, ServersCollection, ServersView, ServiceModel, ServicesCollection, ServicesView, SupportView, Utils;

Config = require('./app/Config.coffee');

ServersView = require('./app/views/ServersView.coffee');

SupportView = require('./app/views/SupportView.coffee');

ServicesView = require('./app/views/ServicesView.coffee');

MonthlyTotalView = require('./app/views/MonthlyTotalView.coffee');

PricingMapsCollection = require('./app/collections/PricingMapsCollection.coffee');

ServersCollection = require('./app/collections/ServersCollection.coffee');

ServicesCollection = require('./app/collections/ServicesCollection.coffee');

ServiceModel = require('./app/models/ServiceModel.coffee');

Utils = require('./app/Utils.coffee');

PRICES_URL_ROOT = Config.CLC_PRICING_URL_ROOT;

App = {
  initialized: false,
  currency: Config.DEFAULT_CURRENCY,
  init: function() {
    var currency, currencyId, datacenter, datasource, dc, ds;
    _.extend(this, Backbone.Events);
    datacenter = Utils.getUrlParameter("datacenter");
    datasource = Utils.getUrlParameter("datasource");
    currencyId = Utils.getUrlParameter("currency");
    dc = datacenter || "NY1";
    ds = datasource || "ny1";
    currency = currencyId || Config.DEFAULT_CURRENCY.id;
    this.monthlyTotalView = new MonthlyTotalView({
      app: this,
      datacenter: dc,
      datasource: ds,
      currency: currency
    });
    this.supportView = new SupportView({
      app: this
    });
    this.pricingMaps = new PricingMapsCollection([], {
      app: this,
      datacenter: dc,
      datasource: ds,
      currency: currency,
      url: PRICES_URL_ROOT + ("" + ds + ".json")
    });
    return this.pricingMaps.on("sync", (function(_this) {
      return function() {
        return _this.onPricingMapsSynced();
      };
    })(this));
  },
  onPricingMapsSynced: function() {
    this.initServers();
    this.initHyperscaleServers();
    this.networkingServices = new ServicesCollection({
      collectionUrl: "json/networking-services.json"
    });
    this.additionalServices = new ServicesCollection({
      collectionUrl: "json/additional-services.json"
    });
    this.bandwidthServices = new ServicesCollection({
      collectionUrl: "json/bandwidth.json"
    });
    this.networkingServices.on("sync", (function(_this) {
      return function() {
        return _this.initNetworkServices();
      };
    })(this));
    this.additionalServices.on("sync", (function(_this) {
      return function() {
        return _this.initAdditionalServices();
      };
    })(this));
    return this.bandwidthServices.on("sync", (function(_this) {
      return function() {
        return _this.initBandwidthServices();
      };
    })(this));
  },
  initNetworkServices: function() {
    this.networkingServices.initPricing(this.pricingMaps);
    this.networkingServicesView = new ServicesView({
      app: this,
      collection: this.networkingServices,
      el: "#networking-services"
    });
    this.networkingServices.on("change", (function(_this) {
      return function() {
        return _this.updateTotalPrice();
      };
    })(this));
    this.initialized = true;
    return this.updateTotalPrice();
  },
  initAdditionalServices: function() {
    this.additionalServices.initPricing(this.pricingMaps);
    this.additionalServicesView = new ServicesView({
      app: this,
      collection: this.additionalServices,
      el: "#additional-services"
    });
    this.additionalServices.on("change", (function(_this) {
      return function() {
        return _this.updateTotalPrice();
      };
    })(this));
    this.on('currencyUpdated', (function(_this) {
      return function() {
        return _this.additionalServices.initPricing(_this.pricingMaps);
      };
    })(this));
    this.initialized = true;
    this.updateTotalPrice();
    $(".main-container").addClass("visible");
    return $(".spinner").hide();
  },
  initBandwidthServices: function() {
    this.bandwidthServices.initPricing(this.pricingMaps);
    this.bandwidthServicesView = new ServicesView({
      app: this,
      collection: this.bandwidthServices,
      el: "#bandwidth"
    });
    this.bandwidthServices.on("change", (function(_this) {
      return function() {
        return _this.updateTotalPrice();
      };
    })(this));
    this.initialized = true;
    return this.updateTotalPrice();
  },
  initServers: function() {
    this.serversCollection = new ServersCollection;
    this.serversCollection.on("change remove add", (function(_this) {
      return function() {
        return _this.updateTotalPrice();
      };
    })(this));
    return this.serversView = new ServersView({
      app: this,
      collection: this.serversCollection,
      el: "#servers",
      pricingMap: this.pricingMaps.forKey("server")
    });
  },
  initHyperscaleServers: function() {
    this.hyperscaleServersCollection = new ServersCollection;
    this.hyperscaleServersCollection.on("change remove add", (function(_this) {
      return function() {
        return _this.updateTotalPrice();
      };
    })(this));
    return this.hyperscaleServersView = new ServersView({
      app: this,
      collection: this.hyperscaleServersCollection,
      el: "#hyperscale-servers",
      pricingMap: this.pricingMaps.forKey("server"),
      hyperscale: true
    });
  },
  updateTotalPrice: function() {
    if (!this.initialized) {
      return;
    }
    this.totalPrice = this.serversCollection.subtotal() + this.hyperscaleServersCollection.subtotal() + this.networkingServices.subtotal() + this.additionalServices.subtotal() + this.bandwidthServices.subtotal();
    this.oSSubtotal = this.serversCollection.oSSubtotal() + this.hyperscaleServersCollection.oSSubtotal();
    this.totalPriceWithSupport = this.totalPrice + this.supportView.updateSubtotal();
    return this.trigger("totalPriceUpdated");
  },
  setPricingMap: function(datacenter) {
    this.pricingMaps = new PricingMapsCollection([], {
      datacenter: datacenter
    });
    return this.pricingMaps.on("sync", (function(_this) {
      return function() {
        _this.hyperscaleServersView.options.pricingMap = _this.pricingMaps.forKey("server");
        _this.serversView.options.pricingMap = _this.pricingMaps.forKey("server");
        _this.serversCollection.initPricing(_this.pricingMaps);
        _this.hyperscaleServersCollection.initPricing(_this.pricingMaps);
        _this.networkingServices.initPricing(_this.pricingMaps);
        _this.additionalServices.initPricing(_this.pricingMaps);
        return _this.bandwidthServices.initPricing(_this.pricingMaps);
      };
    })(this));
  }
};

$(function() {
  return App.init();
});


},{"./app/Config.coffee":1,"./app/Utils.coffee":2,"./app/collections/PricingMapsCollection.coffee":3,"./app/collections/ServersCollection.coffee":4,"./app/collections/ServicesCollection.coffee":5,"./app/models/ServiceModel.coffee":9,"./app/views/MonthlyTotalView.coffee":16,"./app/views/ServersView.coffee":18,"./app/views/ServicesView.coffee":20,"./app/views/SupportView.coffee":21}]},{},[22])