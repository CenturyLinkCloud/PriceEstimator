/**@preserve
$.classVal - WTFPL - refreshless.com/classval/ */

/*jslint browser: true */
/*jslint sub: true */
/*jslint white: true */

// ==ClosureCompiler==
// @externs_url http://refreshless.com/externs/jquery-1.8.js
// @compilation_level ADVANCED_OPTIMIZATIONS
// @warning_level VERBOSE
// ==/ClosureCompiler==

(function( $ ){

	'use strict';

	// Copy of the current value function;
	var $val = $.fn.val,
		getHooks = {},
		setHooks = {},
		onInstance = {};

	function hasClassVal( set, element ){
		var method = false;
		$.each(set?setHooks:getHooks, function(className){
			if ( $(element).hasClass(className) ){
				method = className;
				return false;
			}
		});
		return method;
	}

	/** @expose */
	$.classVal = function ( className, getMethod, setMethod, on ) {

		if ( typeof className !== "string" || typeof on !== "boolean" ) {
			return;
		}

		if ( getMethod ) {
			getHooks[className] = getMethod;
		}

		if ( setMethod ) {
			setHooks[className] = setMethod;
		}

		onInstance[className] = on;
	};

	/** @expose */
	$.fn.val = function ( ) {

		// Convert the function arguments to an array.
		var args = Array.prototype.slice.call( arguments, 0 ), className, target;

		// Test if there are arguments, and if not, call the 'get' method.
		if ( !args.length ) {

			className = hasClassVal(false, this);

			// Determine whether to use the native val method.
			if ( className ) {
				target = (onInstance[className] ? this : this[0]);
				return target[getHooks[className]].apply( target );
			}

			return $val.apply( this );
		}

		// Loop all individual items, and handle setting appropriately.
		return this.each(function(){

			className = hasClassVal(true, this);

			if ( className ) {
				target = (onInstance[className] ? $(this) : this);
				target[setHooks[className]].apply( this, args );

			} else {
				$val.apply( $(this), args );

			}
		});
	};

}( window['jQuery'] || window['Zepto'] ));
