(function (blink) {
	'use strict';

	var OxfordFlippedStyleDev = function() {
		blink.theme.styles.basic.apply(this, arguments);
	}

	OxfordFlippedStyleDev.prototype = {
		bodyClassName: 'content_type_clase_oxford-flipped-dev',
		ckEditorStyles: {
			name: 'oxford-flipped-dev',
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


	OxfordFlippedStyleDev.prototype = _.extend({}, new blink.theme.styles.basic(), OxfordFlippedStyleDev.prototype);

	blink.theme.styles['oxford-flipped-dev'] = OxfordFlippedStyleDev;

})( blink );
