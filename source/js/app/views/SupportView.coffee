SupportView = Backbone.View.extend
  
  el: "#support"

  events:
    "click .support-select": "onSupportSelectClick"
    "click .support-select a": "onSupportSelectInnerLinkClick"

  initialize: (options) ->
    @options = options || {};
    @selectPlan("developer")    

  onSupportSelectClick: (e) ->
    e.preventDefault()
    e.stopPropagation()
    $this = $(e.currentTarget)
    plan = $this.data("plan")
    @selectPlan(plan)
    @options.app.updateTotalPrice()

  onSupportSelectInnerLinkClick: (e) ->
    e.stopPropagation()

  selectPlan: (plan) ->
    @currentPlan = plan
    $(".support-select").removeClass("selected")
    $(".support-select .status-label").html("Select")
    $(".support-select[data-plan=#{plan}]").addClass("selected")
    $(".support-select[data-plan=#{plan}] .status-label").html("Selected")
    @updateSubtotal()

  calculateSupportBill: ->

    # 10% of monthly CenturyLink Cloud usage for the first $0-$10K
    # 7% of monthly CenturyLink Cloud usage from $10K-$80K
    # 5% of monthly CenturyLink Cloud usage from $80K-$250K
    # 3% of monthly CenturyLink Cloud usage over $250K +
    
    # For example, a customer billing $95K a month DOES NOT pay 5% of this amount for support.
    # They pay
    # {initial tier}  + {second tier}  + {third tier}
    
    # (10K* 10%)  + ($70K*7%)  + ($15K*5%) as their total support charge for that month.

    return 0 if @currentPlan is "developer"

    amount = @options.app.totalPrice - @options.app.oSSubtotal || 0

    ranges = [10000, 80000, 250000, 1000000]
    percentages = [.1, .07, .05, .03]

    multipliers = _.map ranges, (range, index) ->
      previousRange = ranges[index-1] || null
      
      if index is 0 and amount < range
        return [amount, percentages[index]]
      if previousRange > amount
        return null
      else if amount < range
        return [amount - previousRange, percentages[index]]
      else
        return [range - previousRange, percentages[index]]
    
    total = 0

    _.map multipliers, (range) ->
      if range
        # total = Math.round(total + (range[0] * range[1]))
        total = total + (range[0] * range[1])

    return total

  updateSubtotal: ->
    @supportPrice = @calculateSupportBill() 
    $(".subtotal", @$el).html accounting.formatMoney(@supportPrice)
    return @supportPrice

module.exports = SupportView
