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

oxfordFlippedApp.fontSizeResize = function(elements) {
	if (elements.length < 0) {
		return;
	}
	elements.each(function(i, element) {
		while(element.scrollWidth > element.offsetWidth || element.scrollHeight > element.offsetHeight) {
			var newFontSize = (parseFloat($(element).css('font-size').slice(0, -2)) * 0.95) + 'px';
			$(element).css('font-size', newFontSize);
		}
	});
}

oxfordFlippedApp.homepage = function(data) {
	console.log("Homepage");
	$('body').addClass('htmlReady');
	var bookTitle = data.title,
			username = 'Federico Antonio',
			totalCoins = '1.000.000',
			totalNotifications = '5';
	// TODO Decide if put coins outside homepage, to make coins transversal.
	var html = '<div id="oxfl-coins"><div id="oxfl-coins-icon"></div><div id="oxfl-coins-total">'+totalCoins+'</div></div><div id="oxfl-general"><h1 class="oxfl-title1" id="oxfl-home-title">'+bookTitle+'</h1><button id="oxfl-notifications"><div class="oxfl-notifications-badge">'+totalNotifications+'</div></button><div id="oxfl-home-menu"><div class="oxfl-home-menu-item"><button class="oxfl-monster oxfl-monster-1" id="oxfl-goto-gradebook"><span>Gradebook</span></button></div><div class="oxfl-home-menu-item"><button class="oxfl-monster oxfl-monster-2 oxfl-js-load-episodes" id="oxfl-goto-prepare"><span>Prepare</span></button></div><div class="oxfl-home-menu-item"><button class="oxfl-monster oxfl-monster-3" id="oxfl-goto-marketplace"><span>Marketplace</span></button><div class="oxfl-bubble-hello"><span class="oxfl-bubble-hello-text">Hola, </span><span class="oxfl-bubble-hello-name">'+username+'</span></div></div></div><div id="oxfl-episodes-monster" class="oxfl-monster oxfl-monster-4"></div><div id="oxfl-episodes"></div></div>';

	$('body').prepend(html);

	var elements = $('.oxfl-bubble-hello-name');
	oxfordFlippedApp.fontSizeResize(elements);

	$('body').addClass('oxfl-body-home');

	$('body').on('click', '.oxfl-js-load-episodes', function() {
		oxfordFlippedApp.loadEpisodes(data);
	});
}


oxfordFlippedApp.loadEpisodes = function(data) {

	console.log("LOAD loadEpisodes");
	console.log(data);

	var unitList = document.createDocumentFragment();
	$.each(data.units, function(i, unit){
		console.log(unit);
		var unitTitle = unit.title,
				unitNumber = unit.number,
				unitImage = unit.image,
				unitListItem = document.createElement('div');
		unitListItem.className = 'oxfl-episodes-item';
		unitListItem.innerHTML = '<article class="oxfl-episode"><a href="#"><h2 class="oxfl-title2">Episode '+unitNumber+'</h2><h3 class="oxfl-title3">'+unitTitle'</h3><div class="oxfl-episode-image-wrapper"><img src="'+unitImage+'" alt="'+unitNumber+'"></div></a></article>';
		unitList.appendChild(unitListItem);
	});

	$('#oxfl-episodes')[0].appendChild(unitList);

	var items = $('#oxfl-episodes').find('.oxfl-episodes-item'),
			itemsLength = items.length;
	for(var i = 0; i < itemsLength; i+=4) {
		items.slice(i, i+4).wrapAll('<div class="oxfl-episodes-page"></div>');
	}

	$('body').addClass('oxfl-body-episodes').removeClass('oxfl-body-home');
}
