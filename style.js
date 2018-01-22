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

			// Ejemplo carga de datos de la clase en una actividad.
			blink.getActivity(idcurso, idclase).done((function(data) {
				this.onActivityDataLoaded(data);
			}).bind(this));

			// Ejemplo carga de datos del libro en una actividad.
			blink.getCourse(idcurso).done((function(data) {
				this.onCourseDataLoaded(data);
			}).bind(this));
		},

		onActivityDataLoaded: function(data) {
			console.log("onActivityDataLoaded");
			console.log(data);
		},

		onCourseDataLoaded: function(data) {
			console.log("onCourseDataLoaded");
			console.log(data);
		}
	};


	OxfordFlippedStyleDev.prototype = _.extend({}, new blink.theme.styles.basic(), OxfordFlippedStyleDev.prototype);

	blink.theme.styles['oxford-flipped-dev'] = OxfordFlippedStyleDev;

	blink.events.on('loadSeguimientoCurso', function() {
		// Ejemplo carga de datos del libro en el toc del curso.
		blink.getCourse(idcurso).done(function(data) {
			var style = new OxfordFlippedStyleDev;
			style.onCourseDataLoaded(data);
			console.log("TOC");
			oxfordFlippedApp.homepage(data);
		});
	})

})( blink );


var oxfordFlippedApp = window.oxfordFlippedApp || {};
oxfordFlippedApp.config = {}

oxfordFlippedApp.homepage = function(data) {
	console.log("Homepage");
	$('body').addClass('htmlReady');
	var bookTitle = data.title;
	var html = '<div id="oxfl-general-home" class="oxfl-general"> <h1 class="oxfl-title1">'+bookTitle+'</h1> <div id="oxfl-coins"></div> <button class="oxfl-notifications"> <div class="oxfl-notifications-badge">5</div> </button> <div class="oxfl-home-menu"> <div class="oxfl-home-menu-item"> <button class="oxfl-monster oxfl-monster-1" id="oxfl-goto-gradebook"> <span>Gradebook</span> </button> </div> <div class="oxfl-home-menu-item"> <button class="oxfl-monster oxfl-monster-2" id="oxfl-goto-prepare"> <span>Prepare</span> </button> </div> <div class="oxfl-home-menu-item"> <button class="oxfl-monster oxfl-monster-3" id="oxfl-goto-marketplace"> <span>Marketplace</span> </button> <div class="oxfl-bubble-hello"> <span class="oxfl-bubble-hello-text">Hola, </span> <span class="oxfl-bubble-hello-name"></span> </div> </div> </div> </div>';
	$('body').prepend(html);
}
