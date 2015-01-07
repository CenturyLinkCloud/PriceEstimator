
	test( "Testing inputs", function(){

		Q.html('\
			<input id="one" class="values">\
			<input id="two" class="valuesetter">\
			<input id="three" class="clean">\
		');

		var one = $("#one");
		var two = $("#two");
		var three = $("#three");
		
		one.val(35);
		equal(one.val(), 35);
		
		$.fn.setMethod = function( a ){
			this.value = a;
			return this;
		};
		
		$.classVal("values", false, 'setMethod', true);
		
		one.val(35);
		equal(one.val(), 35);
		
		two.val( 40 );
		equal(two.val(), 40);
		
		two[0].getter = function(){
			return this.value;
		};
		
		$.classVal("valuesetter", 'getter', false, false);
		
		equal(two.val(), 40);
		
		Q.find("input").val(60);
		equal(one.val(), 60);
		equal(two.val(), 60);
		equal(three.val(), 60);
		
		three.val(50);
		
		ok(one[0] === one.val(10)[0]);
		ok(two[0] === two.val(20)[0]);

	});
