AddManagedAppView = Backbone.View.extend
  
  tagName: "tr"
  className: "table-row add-managed-app-row is-managed"

  render: ->
    template = require("../templates/addManagedApp.haml")
    colspan = if @model.get("type") is "hyperscale" then 8 else 9
    @$el.html template(os: @model.get("os"), colspan: colspan)
    @$el.addClass("managed-app-add-button-for-server_#{@model.cid}")
    @updateOptions()
    return @

  events: ->
    "click a": "addManagedApp"

  addManagedApp: (e) ->
    e.preventDefault()
    key = $(e.currentTarget).data("key")
    name = $(e.currentTarget).data("name")
    @model.addManagedApp(key, name)
  
  updateOptions: ->
    if @model.get("os") is "windows"
      $(".redhat-app", @$el).hide()
      $(".windows-app", @$el).css("display", "block")
    else
      $(".redhat-app", @$el).css("display", "block")
      $(".windows-app", @$el).hide()

module.exports = AddManagedAppView
