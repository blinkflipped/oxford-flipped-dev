(function (blink) {
	'use strict';

	var OxfordFlippedStyle = function() {
		blink.theme.styles.basic.apply(this, arguments);
	}

	OxfordFlippedStyle.prototype = {
		bodyClassName: 'content_type_clase_oxford-flipped',
		ckEditorStyles: {
			name: 'oxford-flipped',
			styles: [
				{ name: 'Énfasis', element: 'span', attributes: { 'class': 'bck-enfasis'} },
			]
		},

		init: function() {
			var parent = blink.theme.styles.basic.prototype;
			parent.init.call(this);
			
			blink.getCourse(idcurso).done((function(data) {
				this.onCourseLoaded(data);
			}).bind(this));
		},

		onCourseLoaded: function(data) {
			console.log(data);
		}
	};


	OxfordFlippedStyle.prototype = _.extend({}, new blink.theme.styles.basic(), OxfordFlippedStyle.prototype);

	blink.theme.styles['oxford-flipped'] = OxfordFlippedStyle;

})( blink );
