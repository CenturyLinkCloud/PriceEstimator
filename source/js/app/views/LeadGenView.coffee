LeadGenView = Backbone.View.extend
  el: "#lead-gen"

  events:
    "click .lead-gen__close": "closeLeadGen"

  closeLeadGen: ->
    @$el.slideUp("fast")
    $('body').removeClass("lead-gen-open")

module.exports = LeadGenView
