classVal
========

jQuery plugin for switching `.val()` implementation for `$` instances based on their class.

This plugin was inspired by the value method implementation for noUiSlider, and has been split out so it can be used for other purposes, too.

##Usage:

```javascript
$.classVal( className, getMethodName, setMethodName, callOnInstance );
```

+ `className`: name of the class to trigger the alternate `.val()` implemenation.
+ `getMethodName`: name of a method to call for `.val()` (without arguments). Set to `false` to use the standard method.
+ `setMethodName`: name of a method to call for `.val( /* ... */ )` (with arguments). Set to `false` to use the standard method.
+ `callOnInstance`: Set to `true` if the method is on the jQuery prototype `$.fn`. For example, when switching to jQuery's `html`, set to true. When you've added a custom jQuery method, such as `$.fn.cake = function(){}`, you'll also use `true`. Set to false to call the method on the DOM element.
