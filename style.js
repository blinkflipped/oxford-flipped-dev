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
	var html = '<div id="oxfl-general"><div id="oxfl-custom-background"></div><div id="oxfl-coins"><div id="oxfl-coins-icon"></div><div id="oxfl-coins-total">'+totalCoins+'</div></div><h1 class="oxfl-title1" id="oxfl-home-title">'+bookTitle+'</h1><button id="oxfl-notifications"><div class="oxfl-notifications-badge">'+totalNotifications+'</div></button><div id="oxfl-home-menu"><div class="oxfl-home-menu-item"><button class="oxfl-monster oxfl-monster-1" id="oxfl-goto-gradebook"><span>Gradebook</span></button></div><div class="oxfl-home-menu-item"><button class="oxfl-monster oxfl-monster-2 oxfl-js-load-episodes" id="oxfl-goto-prepare"><span>Prepare</span></button></div><div class="oxfl-home-menu-item"><button class="oxfl-monster oxfl-monster-3" id="oxfl-goto-marketplace"><span>Marketplace</span></button><div class="oxfl-bubble-hello"><div class="oxfl-bubble-hello-inner"><span class="oxfl-bubble-hello-text">Hola, </span><span class="oxfl-bubble-hello-name">'+username+'</span></div></div></div></div><div id="oxfl-episodes-wrapper"> <div id="oxfl-episodes-monster" class="oxfl-monster oxfl-monster-4"></div> <div id="oxfl-episodes"></div> </div> <button id="oxfl-goback-to-episodes" class="oxfl-button oxfl-button-icon oxfl-button-icon-goback" data-goback="oxfl-body-episodes"></button> <div id="oxfl-chapters-wrapper"> <div id="oxfl-chapters-monster" class="oxfl-monster oxfl-monster-5"></div> <div id="oxfl-chapters"></div> </div></div> ';

	$('body').prepend(html);

	var elements = $('.oxfl-bubble-hello-name');
	oxfordFlippedApp.fontSizeResize(elements);

	$('body').addClass('oxfl-body-home');

	$('body').on('click', '.oxfl-js-load-episodes', function() {
		oxfordFlippedApp.loadEpisodes(data);
	});
}


oxfordFlippedApp.loadEpisodes = function(data) {

	console.log("Load Episodes List");
	console.log(data);

	var unitList = document.createDocumentFragment();
	$.each(data.units, function(i, unit){
		console.log(unit);
		var unitTitle = unit.title,
				unitNumber = unit.number,
				unitImage = unit.image,
				unitListItem = document.createElement('div');
		unitListItem.className = 'oxfl-episodes-item';
		unitListItem.innerHTML = '<article class="oxfl-episode"> <a href="javascript:void(0)" class="oxfl-js-load-chapters" data-episode="'+i+'"> <h2 class="oxfl-title2">Episode '+unitNumber+'</h2> <h3 class="oxfl-title4">'+unitTitle+'</h3> <div class="oxfl-episode-image-wrapper"> <img src="'+unitImage+'" alt="'+unitTitle+'"> </div> </a> </article>';
		unitList.appendChild(unitListItem);
	});
	$('#oxfl-episodes').empty();
	$('#oxfl-episodes')[0].appendChild(unitList);

	var items = $('#oxfl-episodes').find('.oxfl-episodes-item'),
			itemsLength = items.length;
	for(var i = 0; i < itemsLength; i+=4) {
		items.slice(i, i+4).wrapAll('<div class="oxfl-episodes-page"></div>');
	}

	$('body').addClass('oxfl-body-episodes').removeClass('oxfl-body-home');

	$('body').on('click', '.oxfl-js-load-chapters', function() {
		var currentEpisode = $(this).data('episode');
		oxfordFlippedApp.loadChapters(data,currentEpisode);
	});
}

oxfordFlippedApp.loadChapters = function(data,currentEpisode) {
	console.log("Load Chapters List");

	var chapters = data.units[currentEpisode].subunits,
			episodeImage =  data.units[currentEpisode].image,
			chaptersList = document.createDocumentFragment();

	$.each(chapters, function(i, chapter){
		console.log(chapter);
		var chapterTitle = chapter.title,
				chapterNumber = i + 1,
				chapterImage = chapter.image,
				chapterImageCode = (chapterImage != '') ? '<img src="'+chapterImage+'" alt="'+chapterTitle+'">' : '',
				chapterUrl = chapter.url,
				chapterID = chapter.id,
				chapterLockStatus = chapter.lock,
				chapterLockClass = (chapterLockStatus === '8' || chapterLockStatus === '2') ? 'locked' : 'unlock';
				isStudent = false,
				chapterActions = (isStudent) ? '<ul class="oxfl-stars"><li class="oxfl-star-item oxfl-star-item-filled"><span></span></li><li class="oxfl-star-item"><span></span></li><li class="oxfl-star-item"><span></span></li></ul>' : '<button class="oxfl-button oxfl-button-lock oxfl-js-toggle-lock-episode '+chapterLockClass+'"></button>',
				chapterState = 'Completed',
				chapterStateID = '2',
				chapterListItem = document.createElement('div');
		chapterListItem.className = 'oxfl-chapter-item';
//		chapterListItem.innerHTML = '<article class="oxfl-chapter"><a href="javascript:void(0)" class="oxfl-js-load-chapter" data-url="'+chapterUrl+'" data-id="'+chapterID+'"><div class="oxfl-chapter-header"><div class="oxfl-chapter-header-top"><h2 class="oxfl-title3">Chapter '+chapterNumber+'</h2><div class="oxfl-chapter-header-top-right">'+chapterActions+'</div></div><h3 class="oxfl-title4">'+chapterTitle+'</h3></div><div class="oxfl-chapter-image-wrapper"><div class="oxfl-label oxfl-label-'+chapterStateID+'">'+chapterState+'</div>'+chapterImageCode+'</div></a></article>';
		chapterListItem.innerHTML = '<article class="oxfl-chapter" data-id="'+chapterID+'"> <div class="oxfl-chapter-header"> <div class="oxfl-chapter-header-top"> <h2 class="oxfl-title3"> <a href="javascript:void(0)" class="oxfl-js-load-chapter" data-url="'+chapterUrl+'"> Chapter '+chapterNumber+' </a> </h2> <div class="oxfl-chapter-header-top-right">'+chapterActions+'</div> </div> <h3 class="oxfl-title4"><a href="javascript:void(0)" class="oxfl-js-load-chapter" data-url="'+chapterUrl+'">'+chapterTitle+'</a></h3> </div> <a href="javascript:void(0)" class="oxfl-js-load-chapter" data-url="'+chapterUrl+'"> <div class="oxfl-chapter-image-wrapper"> <div class="oxfl-label oxfl-label-'+chapterStateID+'">'+chapterState+'</div> '+chapterImageCode+' </div> </a> </article>';
		chaptersList.appendChild(chapterListItem);
	});

	$('#oxfl-custom-background').css('background-image', 'url('+episodeImage+')').addClass('active');

	$('#oxfl-chapters').empty();
	$('#oxfl-chapters')[0].appendChild(chaptersList);

	var items = $('#oxfl-chapters').find('.oxfl-chapter-item'),
			itemsLength = items.length;
	for(var i = 0; i < itemsLength; i+=6) {
		items.slice(i, i+6).wrapAll('<div class="oxfl-chapters-page"></div>');
	}

	$('body').removeClass('oxfl-body-episodes').addClass('oxfl-body-chapters');
}

oxfordFlippedApp.goback = function(classRef) {

	var possibleClasses = ['oxfl-body-home', 'oxfl-body-episodes', 'oxfl-body-chapters'],
			index = possibleClasses.indexOf(classRef);

	possibleClasses.splice(index, 1);

	var $body = $('body');
	$body.addClass(classRef);
	$.each(possibleClasses, function(i, v){
		$body.removeClass(v);
	});

	$('#oxfl-custom-background').removeAttr('style').removeClass('active');

}

$(document).ready(function() {

	// Go back
	$('body').on('click', '[data-goback]', function() {

		var classRef = $(this).data('goback');
		oxfordFlippedApp.goback(classRef);

	});

	// Load chapter / subunit
	$('body').on('click', '.oxfl-js-load-chapter', function(e) {

		e.preventDefault();
		console.log("AAAAA");


	});

	// Lock/unlock chapters
	$('body').on('click', '.oxfl-js-toggle-lock-episode', function(e) {

		e.preventDefault();
		var chapterID = $(this).closest('.oxfl-chapter').data('id'),
				isLocked = $(this).hasClass('locked');

		if (isLocked) {
			$(this).addClass('unlock').removeClass('locked');
		} else {
			$(this).removeClass('unlock').addClass('locked');
		}
		
		onCursoCambiarBloqueado(chapterID, idcurso);

	});

});
