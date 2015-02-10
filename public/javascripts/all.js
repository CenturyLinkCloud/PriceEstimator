(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Config;

Config = {
  NAME: ""
};

module.exports = Config;


},{}],2:[function(require,module,exports){
var PricingMapsCollection, PricingModel;

PricingModel = require('../models/PricingMapModel.coffee');

PricingMapsCollection = Backbone.Collection.extend({
  model: PricingModel,
  url: "json/pricing.json",
  initialize: function() {
    return this.fetch();
  },
  forKey: function(type) {
    return _.first(this.where({
      "type": type
    }));
  }
});

module.exports = PricingMapsCollection;


},{"../models/PricingMapModel.coffee":5}],3:[function(require,module,exports){
var ServerModel, ServersCollection;

ServerModel = require('../models/ServerModel.coffee');

ServersCollection = Backbone.Collection.extend({
  model: ServerModel,
  subtotal: function() {
    return _.reduce(this.models, function(memo, server) {
      return memo + server.totalPricePerMonth() + server.managedAppsPricePerMonth();
    }, 0);
  },
  oSSubtotal: function() {
    return _.reduce(this.models, function(memo, server) {
      return memo + server.totalOSPricePerMonth();
    }, 0);
  }
});

module.exports = ServersCollection;


},{"../models/ServerModel.coffee":6}],4:[function(require,module,exports){
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


},{"../models/ServiceModel.coffee":7}],5:[function(require,module,exports){
var PricingMapModel;

PricingMapModel = Backbone.Model.extend({
  initialize: function() {}
});

module.exports = PricingMapModel;


},{}],6:[function(require,module,exports){
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
  initPricing: function() {
    var pricing;
    pricing = this.get("pricingMap").attributes.options;
    return this.set("pricing", pricing);
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
  managedAppPricePerMonth: function(managedAppKey, instances) {
    var appPerHour;
    appPerHour = this.get("pricing")[managedAppKey];
    return this.priceForMonth(appPerHour) * this.get("quantity") * instances;
  },
  managedAppsPricePerMonth: function() {
    var apps, total;
    apps = this.get("managedApps");
    total = 0;
    _.each(apps, (function(_this) {
      return function(app) {
        return total += _this.managedAppPricePerMonth(app.key, app.instances);
      };
    })(this));
    return total;
  },
  totalOSPricePerMonth: function() {
    return this.priceForMonth(this.totalOSPerHour()) * this.get("quantity");
  },
  totalPricePerMonth: function() {
    var utilityPerMonth;
    utilityPerMonth = 0;
    utilityPerMonth = this.priceForMonth(this.utilityPricePerHourTotal());
    return utilityPerMonth + this.storagePricePerMonth();
  },
  totalPricePerMonthWithApps: function() {
    return this.totalPricePerMonth + this.managedAppsPricePerMonth();
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
    var apps;
    apps = this.get("managedApps");
    apps.push({
      "key": key,
      "name": name,
      "instances": 1
    });
    this.set("managedApps", apps);
    this.trigger("change", this);
    return this.trigger("change:managedApps", this);
  },
  updateManagedAppIntances: function(key, quantity) {
    var apps;
    apps = this.get("managedApps");
    _.each(apps, function(app) {
      if (app.key === key) {
        return app.instances = quantity;
      }
    });
    this.set("managedApps", apps);
    return this.trigger("change:managedApps", this);
  }
});

module.exports = ServerModel;


},{}],7:[function(require,module,exports){
var ServiceModel;

ServiceModel = Backbone.Model.extend({
  defaults: {
    title: "",
    description: "",
    input: "select",
    quantity: 0
  },
  initialize: function() {},
  initPricing: function(pricingMap) {
    return this.set("pricing", pricingMap.get('price'));
  },
  totalPricePerMonth: function() {
    return this.get("pricing") * this.get("quantity");
  }
});

module.exports = ServiceModel;


},{}],8:[function(require,module,exports){
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

$o.push("<td class='add-managed-app-cell table-cell' colspan='" + ($e($c(this.colspan))) + "'>\n  <div class='add-managed-button'>\n    <span class='plus'></span>\n    managed application \n    <span class='down-arrow'></span>\n    <div class='managed-app-options'>\n      <a class='redhat-app' href='#' data-key='apache' data-name='Apache HTTP Server'>Apache HTTP Server</a>\n      <a class='redhat-app' href='#' data-key='cloudera-cdh5-basic' data-name='Cloudera CDH5 Basic'>Cloudera CDH5 Basic</a>\n      <a class='redhat-app' href='#' data-key='cloudera-cdh5-basic-hbase' data-name='Cloudera CDH5 Basic + HBase'>Cloudera CDH5 Basic + HBase</a>\n      <a class='redhat-app' href='#' data-key='mysql' data-name='MySQL'>MySQL</a>\n      <a class='redhat-app' href='#' data-key='mysql-replication-master-master' data-name='MySQL Replication (Master/Master)'>MySQL Replication (Master/Master)</a>\n      <a class='redhat-app' href='#' data-key='mysql-replication-master-slave' data-name='MySQL Replication (Master/Slave)'>MySQL Replication (Master/Slave)</a>\n      <a class='redhat-app' href='#' data-key='tomcat' data-name='Tomcat'>Tomcat</a>\n      <a class='windows-app' href='#' data-key='active-directory' data-name='Active Directory'>Active Directory</a>\n      <a class='windows-app' href='#' data-key='ms-sql' data-name='MS SQL'>MS SQL</a>\n      <a class='windows-app' href='#' data-key='iis' data-name='MS IIS'>MS IIS</a>\n      <!-- %a{:href => \"#\", data: {key: \"ssl\", name: \"GeoTrust Quick SSL Certificate\"}} GeoTrust Quick SSL Certificate -->\n    </div>\n  </div>\n</td>");

return $o.join("\n").replace(/\s(\w+)='true'/mg, ' $1').replace(/\s(\w+)='false'/mg, '').replace(/\s(?:id|class)=(['"])(\1)/mg, "");

}).call(options)
};
},{}],9:[function(require,module,exports){
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

$o.push("<td class='managed-app-quantity-cell table-cell' colspan='1'>\n  <span class='managed-app-quantity'></span>\n  <td class='managed-app-usage-cell table-cell' colspan='2'>");

if (this.app.key === "mysql" || this.app.key === "ms-sql") {
  $o.push("    x\n    <input class='number' name='usage' value='" + ($e($c(1))) + "' type='text'>\n    instance(s) / server");
} else {
  $o.push("    &nbsp;");
}

$o.push("  </td>\n</td>\n<td class='managed-app-cell table-cell' colspan='" + ($e($c(this.colspan))) + "'>\n  Managed " + this.app.name + "\n</td>\n<td class='price-cell table-cell' colspan='1'>\n  <span class='price'></span>\n  <a class='remove-button' href='#' data-key='" + ($e($c(this.app.key))) + "'>X</a>\n</td>");

return $o.join("\n").replace(/\s(\w+)='true'/mg, ' $1').replace(/\s(\w+)='false'/mg, '').replace(/\s(?:id|class)=(['"])(\1)/mg, "");

}).call(options)
};
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

$o.push("<td class='quantity-cell table-cell'>\n  <input class='number' name='quantity' value='" + ($e($c(this.model.get("quantity")))) + "' type='text'>\n</td>\n<td class='table-cell usage-cell'>\n  <input class='number' name='usage' value='" + ($e($c(this.model.get("usage")))) + "' type='text'>\n  <select name='usagePeriod'>\n    <option value='hours_per_month' selected='" + ($e($c(this.model.get('usagePeriod') === 'hours_per_month'))) + "'>hrs / month</option>\n    <option value='percentage_of_month' selected='" + ($e($c(this.model.get('usagePeriod') === 'percentage_of_month'))) + "'>% / month</option>\n    <option value='hours_per_week' selected='" + ($e($c(this.model.get('usagePeriod') === 'hours_per_week'))) + "'>hrs / week</option>\n    <option value='hours_per_day' selected='" + ($e($c(this.model.get('usagePeriod') === 'hours_per_day'))) + "'>hrs / day</option>\n  </select>\n</td>");

if (this.model.get("type") === "hyperscale") {
  $o.push("<input type='hidden' value='hyperscale'>");
} else {
  $o.push("<td class='table-cell type-cell'>\n  <select name='type'>\n    <option value='standard' selected='" + ($e($c(this.model.get('type') === 'standard'))) + "'>standard</option>\n    <option value='premium' selected='" + ($e($c(this.model.get('type') === 'premium'))) + "'>premium</option>\n  </select>\n</td>");
}

$o.push("<td class='os-cell table-cell'>\n  <select name='os'>\n    <option value='linux' selected='" + ($e($c(this.model.get('os') === 'linux'))) + "'>Linux</option>\n    <option value='redhat' selected='" + ($e($c(this.model.get('os') === 'redhat'))) + "'>Red Hat</option>\n    <option value='windows' selected='" + ($e($c(this.model.get('os') === 'windows'))) + "'>Windows</option>\n  </select>\n</td>\n<td class='managed-cell table-cell'>\n  <input class='managed-check' type='checkbox' name='managed'>\n</td>\n<td class='cpu-cell range-cell table-cell'>\n  <input class='cpu-text-input' data-name='cpu'>\n  <input class='range-slider' name='cpu' type='range' min='" + ($e($c(1))) + "' max='" + ($e($c(16))) + "' value='" + ($e($c(this.model.get("cpu")))) + "'>\n</td>\n<td class='memory-cell range-cell table-cell'>\n  <input class='memory-text-input' data-name='memory'>\n  <input class='range-slider' name='memory' type='range' min='" + ($e($c(1))) + "' max='" + ($e($c(128))) + "' value='" + ($e($c(this.model.get("memory")))) + "'>\n</td>\n<td class='range-cell storage-cell table-cell'>\n  <input class='storage-text-input' data-name='storage'>");

if (this.model.get("type") === "hyperscale") {
  $o.push("  <input class='range-slider' name='storage' type='range' min='" + ($e($c(1))) + "' max='" + ($e($c(1024))) + "' step='" + ($e($c(1))) + "' value='" + ($e($c(this.model.get("storage")))) + "'>");
} else {
  $o.push("  <input class='range-slider' name='storage' type='range' min='" + ($e($c(1))) + "' max='" + ($e($c(4000))) + "' step='" + ($e($c(1))) + "' value='" + ($e($c(this.model.get("storage")))) + "'>");
}

$o.push("</td>\n<td class='price-cell table-cell'>\n  <span class='price'>");

$o.push("    " + $e($c(accounting.formatMoney(this.model.totalPricePerMonth()))));

$o.push("  </span>\n  <a class='remove-button' href='#'>X</a>\n</td>");

return $o.join("\n").replace(/\s(\w+)='true'/mg, ' $1').replace(/\s(\w+)='false'/mg, '').replace(/\s(?:id|class)=(['"])(\1)/mg, "");

}).call(options)
};
},{}],11:[function(require,module,exports){
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
  $o.push("    <span class='select'></span>\n    QTY\n      <select name='quantity'>\n        <option>0</option>\n        <option>1</option>\n        <option>2</option>\n        <option>3</option>\n        <option>4</option>\n        <option>5</option>\n      </select>\n      x");
  $o.push("      " + $e($c(accounting.formatMoney(this.model.get("pricing")))));
}

$o.push("    <span class='price'>");

$o.push("      " + $e($c(accounting.formatMoney(this.model.totalPricePerMonth))));

$o.push("    </span>\n  </div>\n</form>");

return $o.join("\n").replace(/\s(\w+)='true'/mg, ' $1').replace(/\s(\w+)='false'/mg, '').replace(/\s(?:id|class)=(['"])(\1)/mg, "");

}).call(options)
};
},{}],12:[function(require,module,exports){
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


},{"../templates/addManagedApp.haml":8}],13:[function(require,module,exports){
var ManagedAppView;

ManagedAppView = Backbone.View.extend({
  tagName: "tr",
  className: "table-row managed-app-row is-managed",
  events: function() {
    return {
      "click .remove-button": "onRemoveClick",
      "change input": "onFormChanged",
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
      colspan: colspan
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
    price = this.model.managedAppPricePerMonth(this.options.app.key, this.options.app.instances);
    instances = this.options.app.instances || 1;
    $(".managed-app-quantity", this.$el).html(quantity);
    $(".price", this.$el).html(accounting.formatMoney(price));
    return $("input[name=usage]", this.$el).val(instances);
  },
  onFormChanged: function() {
    var instances;
    instances = $("input[name=usage]", this.$el).val();
    return this.model.updateManagedAppIntances(this.options.app.key, instances);
  },
  ensureNumber: function(e) {
    var charCode;
    charCode = (e.which ? e.which : e.keyCode);
    return !(charCode > 31 && (charCode < 48 || charCode > 57));
  }
});

module.exports = ManagedAppView;


},{"../templates/managedApp.haml":9}],14:[function(require,module,exports){
var MonthlyTotalView;

MonthlyTotalView = Backbone.View.extend({
  el: "#monthly-total",
  events: {
    "click .add-button": "addServer"
  },
  initialize: function(options) {
    this.options = options || {};
    this.options.app.on("totalPriceUpdated", (function(_this) {
      return function() {
        return _this.updateTotal();
      };
    })(this));
    return $(window).scroll((function(_this) {
      return function() {
        return _this.positionHeader();
      };
    })(this));
  },
  updateTotal: function() {
    return $(".price", this.$el).html(accounting.formatMoney(this.options.app.totalPriceWithSupport));
  },
  positionHeader: function() {
    if ($(window).scrollTop() > 289) {
      return this.$el.css("position", "fixed");
    } else {
      return this.$el.css("position", "absolute");
    }
  }
});

module.exports = MonthlyTotalView;


},{}],15:[function(require,module,exports){
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
  initialize: function() {
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
    var template;
    template = require("../templates/server.haml");
    this.$el.html(template({
      model: this.model
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
          app: app
        });
        _this.appViews.push(managedAppView);
        return _this.addManagedAppView.$el.before(managedAppView.render().el);
      };
    })(this));
  },
  onModelChange: function(model) {
    $(".price", this.$el).html(accounting.formatMoney(model.totalPricePerMonth()));
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
      return this.addManagedAppView.updateOptions();
    }
  }
});

module.exports = ServerView;


},{"../templates/server.haml":10,"./AddManagedAppView.coffee":12,"./ManagedAppView.coffee":13}],16:[function(require,module,exports){
var ServerModel, ServerView, ServersView;

ServerView = require('./ServerView.coffee');

ServerModel = require('../models/ServerModel.coffee');

ServersView = Backbone.View.extend({
  events: {
    "click .add-button": "addServer"
  },
  initialize: function(options) {
    this.options = options || {};
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
      model: model
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
    return $(".subtotal", this.$el).html(accounting.formatMoney(this.collection.subtotal()));
  }
});

module.exports = ServersView;


},{"../models/ServerModel.coffee":6,"./ServerView.coffee":15}],17:[function(require,module,exports){
var ServiceView;

ServiceView = Backbone.View.extend({
  className: "service",
  events: {
    "change select": "onFormChanged",
    "change input": "onFormChanged",
    "input input": "onFormChanged"
  },
  initialize: function() {
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
      model: this.model
    }));
    this.$el.attr("id", this.model.cid);
    this.$el.addClass(this.model.get("key"));
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
    $(".price", this.$el).html(accounting.formatMoney(model.totalPricePerMonth()));
    $(".quantity", this.$el).html(model.get("quantity"));
    if (model.get("quantity") > 0) {
      return this.$el.addClass("active");
    } else {
      return this.$el.removeClass("active");
    }
  }
});

module.exports = ServiceView;


},{"../templates/service.haml":11}],18:[function(require,module,exports){
var ServiceModel, ServiceView, ServicesView;

ServiceView = require('./ServiceView.coffee');

ServiceModel = require('../models/ServiceModel.coffee');

ServicesView = Backbone.View.extend({
  initialize: function(options) {
    this.options = options || {};
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
        var serviceView;
        serviceView = new ServiceView({
          model: service
        });
        return $(".services", _this.$el).append(serviceView.render().el);
      };
    })(this));
  },
  updateSubtotal: function() {
    return $(".subtotal", this.$el).html(accounting.formatMoney(this.collection.subtotal()));
  }
});

module.exports = ServicesView;


},{"../models/ServiceModel.coffee":7,"./ServiceView.coffee":17}],19:[function(require,module,exports){
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
    this.supportPrice = this.calculateSupportBill();
    $(".subtotal", this.$el).html(accounting.formatMoney(this.supportPrice));
    return this.supportPrice;
  }
});

module.exports = SupportView;


},{}],20:[function(require,module,exports){
var App, Config, MonthlyTotalView, PricingMapsCollection, ServersCollection, ServersView, ServiceModel, ServicesCollection, ServicesView, SupportView;

Config = require('./app/Config.coffee');

ServersView = require('./app/views/ServersView.coffee');

SupportView = require('./app/views/SupportView.coffee');

ServicesView = require('./app/views/ServicesView.coffee');

MonthlyTotalView = require('./app/views/MonthlyTotalView.coffee');

PricingMapsCollection = require('./app/collections/PricingMapsCollection.coffee');

ServersCollection = require('./app/collections/ServersCollection.coffee');

ServicesCollection = require('./app/collections/ServicesCollection.coffee');

ServiceModel = require('./app/models/ServiceModel.coffee');

App = {
  initialized: false,
  init: function() {
    _.extend(this, Backbone.Events);
    this.monthlyTotalView = new MonthlyTotalView({
      app: this
    });
    this.supportView = new SupportView({
      app: this
    });
    this.pricingMaps = new PricingMapsCollection();
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
      collection: this.additionalServices,
      el: "#additional-services"
    });
    this.additionalServices.on("change", (function(_this) {
      return function() {
        return _this.updateTotalPrice();
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
  }
};

$(function() {
  return App.init();
});


},{"./app/Config.coffee":1,"./app/collections/PricingMapsCollection.coffee":2,"./app/collections/ServersCollection.coffee":3,"./app/collections/ServicesCollection.coffee":4,"./app/models/ServiceModel.coffee":7,"./app/views/MonthlyTotalView.coffee":14,"./app/views/ServersView.coffee":16,"./app/views/ServicesView.coffee":18,"./app/views/SupportView.coffee":19}]},{},[20])