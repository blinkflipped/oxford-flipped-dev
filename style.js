(function (blink) {
	'use strict';

	var OxfordFlippedDevStyle = function () {
		blink.theme.styles.basic.apply(this, arguments);
	};

	OxfordFlippedDevStyle.prototype = {
		bodyClassName: 'content_type_clase_oxford-flipped-dev',
		extraPlugins: ['image2'],
		activityInitialized: false,
		gameToken: 0,
		userCoins: 0,
		vocabularyCoins: 10,
		pageIsLoading: false,
		vocabularyCalculated: 0,
		marketPlaceTag: 'marketplace',
		ckEditorStyles: {
			name: 'oxford-flipped-dev',
			styles: [
				{ name: 'Énfasis', element: 'span', attributes: { 'class': 'bck-enfasis'} },
				{ name: 'Checkpoint 1 Cover', type: 'widget', widget: 'blink_box', attributes: { 'class': 'oxfl-checkpoint-1-cover' } },
				{ name: 'Content Zone Video', type: 'widget', widget: 'blink_box', attributes: { 'class': 'oxfl-cz oxfl-cz-video' } },
				{ name: 'Content Zone Infographic', type: 'widget', widget: 'blink_box', attributes: { 'class': 'oxfl-cz oxfl-cz-infographic' } },
				{ name: 'Content Zone Text', type: 'widget', widget: 'blink_box', attributes: { 'class': 'oxfl-cz oxfl-cz-text' } },
				{ name: 'End Screen Tip Text', type: 'widget', widget: 'blink_box', attributes: { 'class': 'oxfl-end-screen-tip' } },
				{ name: 'Challenge Cover', type: 'widget', widget: 'blink_box', attributes: { 'class': 'oxfl-challenge-cover' } },
			]
		},

		init: function() {
			this.activityInitialized = true;
			var parent = blink.theme.styles.basic.prototype;
			parent.init.call(this);
			this.fetchData();
			this.initSequencingContentZone();
			this.initSequencingTipChallenge();
			this.removeFinalSlide();
		},

		/**
		 * Ejecutar métodos referentes al sequencing con content zone.
		 */
		initSequencingContentZone: function() {
			this.contentZone = this.lookupDirectorSlide("contentzone");
			if (this.contentZone) {
				this.navigationOverride();
				this.navigationEvents();
				this.setSequencingContentZoneEvents();
				this.initSystemSaveSCORM();
			}
		},

		/**
		 * Ejecutar métodos referentes al sequencing con tip challenge.
		 */
		initSequencingTipChallenge: function() {
			this.tipChallenge = this.lookupDirectorSlide("tipchallenge");

			if (!this.tipChallenge) {
				return false;
			}

			this.setSequencingChallengeEvents();
		},

		/**
		 * Sobrescribir el guardado de notas en caso de ser alumno el usuario.
		 */
		initSystemSaveSCORM: function() {
			var slideVocabulary = window["t" + (this.contentZone - 1) + "_slide"];
			slideVocabulary.esEvaluable = false;

			if (blink.user.esAlumno()) {
				lockPreviousQualification = (function() {
					return this.lockPreviousQualification();
				}).bind(this);
			}
		},

		lockPreviousQualification: function() {
			if (blink.user.esAlumno() && this.contentZone) {
				var notaActual = calcularClasificacion(),
				notaAnterior = scormAPI.LMSGetValue('cmi.core.score.raw');
				if (this.hasTriedAllExercise() && notaActual >= notaAnterior) {
					return false;
				}

				return true;
			}

			return false;
		},

		/**
		 * Comprueba si se han realizado todos los ejercicios del sequencing.
		 * @return {Boolean} Todos los ejercicios del sequencing completados.
		 */
		hasTriedAllExercise: function() {
			var allExerciseComplete = true;

			for (var idSlide = 0; idSlide < blink.activity.numSlides; idSlide++) {
				var currentSlide = window["t"+idSlide+"_slide"];

				if (currentSlide) {
					var isExercise = currentSlide.esEvaluable,
						hasExercises = currentSlide.numElementosEvaluables >= 1,
						hasTried = currentSlide.intentos && currentSlide.intentos > 0;

					if (isExercise && hasExercises && !hasTried) {
						allExerciseComplete = false;
					}
				}
			}

			return allExerciseComplete;
		},

		removeFinalSlide: function() {
			var parent = blink.theme.styles.basic.prototype;
			parent.removeFinalSlide.call(this, true);
		},

		/**
		 * Define la slide que indicará el 'break' de la secuencia de la actividad.
		 * @param  {String} name	Nombre de la sección que define la slide 'break'.
		 * @return {Int} 			Índice de la slide 'break'.
		 */
		lookupDirectorSlide: function(name) {
			var indexBreakSlide;

			window.secuencia.forEach(function(index) {
				var slide = window["t"+index+"_slide"],
					seccion = slide.seccion.toLowerCase().replace(" ", "");

				if (!!~seccion.indexOf(name)) {
					indexBreakSlide = index;
				}
			});

			return indexBreakSlide;
		},

		navigationOverride: function() {
			// Modo corrección excluido
			if ((window.modoClase && window.modoClase == 4) || completed) {
				return false;
			}

			var vocabulary 				= this.contentZone - 1,
				currentSlide 			= window['t'+activeSlide+'_slide'],
				vocabularySlide 		= window['t'+vocabulary+'_slide'],
				shouldHideNavigation	= this.shouldHideNavigation(),
				vocabularyData			= suspdata.status["t"+vocabularySlide.uid],
				currentSlideData 		= suspdata.status["t"+currentSlide.uid],
				vocabularyPristine 		= vocabularyData && vocabularyData.pristine,
				slideIsContent 			= currentSlide.esContenido,
				$sliderControl 			= $(".slider-control"),
				$sliderLeft 			= $(".left.slider-control"),
				$sliderRight 			= $(".right.slider-control");

			// Modificar botones de la slide.
			currentSlide.reviewButtons.principal['btn-reset'] = { "statusOptions" : {} };
			currentSlide.reviewButtons.principal['btn-solution'] = { "statusOptions" : {} };

			$sliderRight.removeClass('not-allowed');

			// Si estoy en la slide "Content Zone"
			if (activeSlide == this.contentZone) {
				$sliderControl.hideBlink();
			// Si estoy en la slide 'Vocabulary' sin tener clasificacion 1 y nunca la he resuelto.
			} else if (activeSlide == vocabulary && shouldHideNavigation && vocabularyPristine) {
				$sliderRight.addClass('not-allowed');
			// Si es slide "test".
			} else if (activeSlide > this.contentZone) {
				// Si es la primera slide "test".
				if (activeSlide == (this.contentZone + 1)) {
					$sliderControl.hideBlink();
				// Si no es la primera, se muestra la flecha 'previous'.
				} else {
					$sliderLeft.showBlink();
				}
				// Si se le ha dado click a corregir se muestra la flecha "next".
				$sliderRight[(currentSlide.intentos <= 0 ? 'hide' : 'show') + 'Blink']();
			// Si es slide contenido (science tip).
			} else {
				$sliderControl.showBlink();
			}
		},

		navigationEvents: function() {
			var self = this;

			$('.slider-control').off('click');

			$('.left.slider-control').on('click', function() {
				if (!self.pageIsLoading) {
					blink.activity.showPrevSection();
					self.pageIsLoading = true;
				}
			})

			$('.right.slider-control').on('click', function() {
				if (!self.pageIsLoading && !$(this).hasClass("not-allowed")) {
					blink.activity.showNextSection();
					self.pageIsLoading = true;
				}
			});

			$('.oxfl-cz').on('click', '.bck-title', function() {
				blink.theme.buttonState.disabled('#boton_rotulador, #boton_borrador, #boton_notes', true);
			});

			$('.oxfl-cz').on('click', '.oxfl-js-cz-close', function() {
				blink.theme.buttonState.disabled('#boton_rotulador, #boton_borrador, #boton_notes', false);
			});
		},

		shouldHideNavigation: function() {
			var currentSlide = window['t'+activeSlide+'_slide'],
				slideStatus	= currentSlide.getReviewStatus();

			// Si es slide de examen.
			if (activeSlide > this.contentZone) {
				return slideStatus != "sinIntentos"
			// Si es vocabulary.
			} else {
				// Por ahora con esto no sirve la sopa de letras.
				return currentSlide.clasificacion != 1;
			}
		},

		quitAndGoToContentZone: function() {
			var controlSlide = this.contentZone;
			blink.theme.showSection(controlSlide, true);

			for (var slidesExamen = controlSlide + 1; slidesExamen < blink.activity.numSlides; slidesExamen++) {
				window["t"+slidesExamen+"_slide"].clearSlide();
			}
		},

		exitSequencing: function() {
			if (!this.contentZone) {
				return false;
			}

			var vocabulary = this.contentZone - 1,
				isVobularySlide = vocabulary == activeSlide,
				currentSlide = window['t'+activeSlide+'_slide'],
				isVobularyAndCorrect = isVobularySlide && currentSlide.clasificacion == 1;

			// Si ya se ha pasado a la "content zone" o la slide "vocabulary" está correcta.
			if ((activeSlide >= this.contentZone) || isVobularyAndCorrect) {
				var vocabularyData = "t" + window["t"+ vocabulary +"_slide"].uid;
				suspdata.status[vocabularyData].pristine = false;
			}

			this.clearExerciseData();
		},

		exitChallenge: function() {
			var allExerciseComplete = true;

			for (var idSlide = 0; idSlide < blink.activity.numSlides; idSlide++) {
				var currentSlide = window['t'+idSlide+'_slide'],
					isExercise = typeof currentSlide.clasificacion !== 'undefined',
					isComplete = currentSlide.clasificacion === 1;

				if (currentSlide && isExercise && !isComplete) {
					allExerciseComplete = false;
				}
			}

			if (!allExerciseComplete) {
				for (var idSlide = 0; idSlide < blink.activity.numSlides; idSlide++) {
					var currentSlide = window['t'+idSlide+'_slide'],
						isExercise = typeof currentSlide.clasificacion !== 'undefined',
						hasTried = currentSlide.intentos >= 1;

					if (currentSlide && isExercise && hasTried) {
						currentSlide.pristine = false;
					}
				}
			}

			this.clearExerciseData();
		},

		clearExerciseData: function() {
			window.do_commit_sincr = true;
			loadSuspendData(JSON.stringify(suspdata));

			for (var idSlide = 0; idSlide < blink.activity.numSlides; idSlide++) {
				var slide = window["t"+idSlide+"_slide"];
				slide && slide.esEjercicio && slide.clearSlide();
			}
		},

		storeGameScore: function(coins) {
			if (!suspdata.game_score) {
				suspdata.game_score = 0;
			}

			suspdata.game_score += coins;
			updateSCORM();
		},

		shouldCalculateGameScore: function() {
			var currentSlide = window['t'+activeSlide+'_slide'],
				lastSlide =  blink.activity.numSlides - 1,
				isLastSlide = activeSlide == lastSlide;

			return (isLastSlide && currentSlide.getClassification());
		},

		calculateActivityGameScore: function() {
			var activityCoins = 0,
				activityGrade = this.calculateExercisesGrade();

			if (this.superiorAprobado(activityGrade)) {
				activityCoins = parseInt(((activityGrade/100) * this.gameToken).toFixed());
			}

			return activityCoins;
		},

		superiorAprobado: function(clasificacion) {
			if (isNaN(clasificacion)) {
				return true;
			}

			var aprobado = 50;

			if (typeof grade_aprobado != 'undefined' && grade_aprobado != '') {
				aprobado = grade_aprobado;
			}

			return clasificacion > aprobado;
		},

		shouldCalculateVocabularyCoins: function() {
			var indexVocabularySlide = this.contentZone - 1,
				currentSlide = window['t'+activeSlide+'_slide'];

			return (activeSlide == indexVocabularySlide && currentSlide.clasificacion == 1 && this.vocabularyCalculated == 0);
		},

		calculateVocabularyCoins: function() {
			var vocabularyCoins = this.vocabularyCoins || 0;
			this.vocabularyCalculated++;
			return vocabularyCoins;
		},

		calculateExercisesGrade: function() {
			var exercisesTotalScore = 0,
				exercisesCount = 0;

			for (var idSlide = this.contentZone + 1; idSlide < blink.activity.numSlides; idSlide++) {
				var slide = window["t"+idSlide+"_slide"];

				if (slide.getClassification()) {
					exercisesTotalScore +=  parseFloat(slide.getClassification()) * 100;
					exercisesCount++;
				}
			}

			if (exercisesCount <= 0) {
				return 0;
			}

			return exercisesTotalScore/exercisesCount;
		},

		/**
		 * Calcula la cantidad de monedas que posee el usuario
		 * @param  {Array} activities  Arreglo del conjunto de datos de cada actividad.
		 * @return {Int}             Cantidad de monedas que posee el usuario.
		 */
		calculateUserCoins: function(activities) {
			var userCoins = 0;

			activities.forEach((function(activity, index) {
				var unit = _.findWhere(this.cursoJson.units, {id: activity.idtema}),
					subunit = _.findWhere(unit.subunits, {id: index.toString()});

				if (subunit.tag && subunit.tag.indexOf(this.marketPlaceTag) != -1 && activity.game_token) {
					userCoins -= activity.game_token;
				} else if (activity.game_score) {
					userCoins += activity.game_score;
				}
			}).bind(this));

			return userCoins;
		},

		/**
		 * Verifica si el usuario puede comprar una actividad del Market Place.
		 * @param  {Object} activity Objeto con información de la actividad
		 * @return {Bool}          Si puede o no comprar una activdad.
		 */
		checkUserCanBuyActivityMarketPlace: function (activity) {
			return (this.userCoins - activity.game_token) >= 0;
		},

		/**
		 * Compra un actividad del Market Place
		 * @param  {activityId} activityId ID de la actividad
		 */
		buyActivityMarketPlace: function (activityId) {
			console.log("Intentando comprar");
			console.log(actividades);
			console.log(activityId);
			if (actividades && actividades[activityId]) {
				return alert('actividad comprada con anterioridad');
			}

			blink.getActivity(idcurso, parseInt(activityId)).done((function(activity) {
				if (!this.checkUserCanBuyActivityMarketPlace(activity)) {
					return _showAlert(textweb('gamificacion_monedas_insuficientes'));
				}

				if (!blink.isApp || (blink.isApp && blink.appVersion >= 4.1)) {
					blink.rest.connection(function(connection) {
						if (!connection) {
								return _showAlert(textweb('tablettxt_require_connection'));
						}

						blink.ajax("/LMS/ajax.php?op=activity.buyActivityMarketPlace&idclase=" + activityId + "&idcurso=" + idcurso, function(o) {
							//TODO Comprobar esta funcion
							if (o.startsWith('ERROR')){
								_showAlert(textweb('error_general_AJAX'));
							}

							if (blink.isApp) {

								blink.ajax('/blink:forceCheckUpdates', function(o) {
									if (o.startsWith('ERROR')){
										_showAlert(textweb('error_general_AJAX'));
									} else {
										oxfordFlippedApp.updateMarketplaceList(activityId);
									}
								});

							} else {

								if (o.startsWith('ERROR')){
									_showAlert(textweb('error_general_AJAX'));
								} else {
									oxfordFlippedApp.updateMarketplaceList(activityId);
								}

							}
						});

					});
				}

			}).bind(this));
		},

		/**
		 * Configura los eventos necesarios para el sequencing de los "Episodes".
		 */
		setSequencingContentZoneEvents: function() {
			var $closeIframeButton = parent.$('#oxfl-modal-close-chapter').find('.btn-primary');

			this.setSequencyToInit();

			// Listeners al pasar de slide.
			blink.events.on('slide:update:after section:shown', (function() {
				this.contentZone && this.navigationOverride();
				this.pageIsLoading = false;
			}).bind(this));

			// Listener al actualizar slide para comprobar si se deben proporcionar las monedas de Vocabulario
			blink.events.on('slide:update:after', (function() {
				if (this.shouldCalculateVocabularyCoins()) {
					blink.events.trigger('vocabulary:done');
					this.storeGameScore(this.calculateVocabularyCoins());
				}

				if (this.shouldCalculateGameScore()) {
					this.storeGameScore(this.calculateActivityGameScore());
				}
			}).bind(this));
		},

		/**
		 * Configura los eventos necesarios para el sequencing de los "Challenge".
		 */
		setSequencingChallengeEvents: function() {
			var $closeIframeButton = parent.$('#oxfl-modal-close-chapter').find('.btn-primary');

			this.setSequencyToInit();

			// Se sobrescribe el salir de la actividad.
			$closeIframeButton.removeAttr('onclick').off('click').on('click', (function() {
				this.tipChallenge && this.exitChallenge();
			}).bind(this));
		},

		/**
		 * Cierra el iframe de una actividad flipped.
		 */
		closeIframe: function() {
			if (parent) {
				parent.cerrarIframe();
				parent.$('#oxfl-modal-close-chapter').modal('hide');
			}
		},

		/**
		 * Lleva a la primera slide de una actividad en caso de ser alumno.
		 */
		setSequencyToInit: function() {
			var user = blink.user;

			if (user.esAlumno()) {
				window.numSec = 1;
			}
		},

		/**
		 * Obtener el game token actual de la actividad.
		 * @param  {Object} data Información de la actividad.
		 * @return {Int}      Game token.
		 */
		getActivityGameToken: function(data) {
			var game_token = 0;

			if (data.game_token) {
				game_token = data.game_token;
			}

			return game_token;
		},

		/**
		 * Carga de datos del libro en un actividad
		 */
		fetchData: function() {
			blink.getCourse(idcurso).done((function(data) {
				this.onCourseDataLoaded(data);
			}).bind(this));
		},

		/**
		 * Realiza operaciones al cargar los datos del curso.
		 * @param  {Object} data Información del curso.
		 */
		onCourseDataLoaded: function(data) {
			var unit = _.findWhere(data.units, {id: window.idtema.toString()});
			var subunit = _.findWhere(unit.subunits, {id: window.idclase.toString()});

			window.bookcover = data.units[0].subunits[0].id;
			this.cursoJson = data;
			this.onActivityDataLoaded(subunit);
			oxfordFlippedApp.getChallengeIDs(data);

			console.log("onCourseDataLoaded");
			var isBookCover = idclase.toString() === window.bookcover;

			if (isBookCover) {
				this.loadUserData();
				var updateHash = true;
				oxfordFlippedApp.homepage(data,updateHash); // TODO Check removed usercoins
			}

		},

		/**
		 * Realiza operaciones al cargar los datos de la actividad.
		 * @param  {Object} data Información de la actividad.
		 */
		onActivityDataLoaded: function(data) {
			var isBookCover = idclase.toString() === window.bookcover;
			if (!isBookCover) {
				var contentZoneIndex = this.lookupDirectorSlide("contentzone");

				if (data.title === oxfordFlippedApp.config.nameChallenge) oxfordFlippedApp.config.challengeIDs.push(data.id);

				oxfordFlippedApp.console("onActivityDataLoaded");
				oxfordFlippedApp.console(data);
				oxfordFlippedApp.activityCreateFalseNavigation(data);
				oxfordFlippedApp.activityCheckpointCover();
				oxfordFlippedApp.challengeCover();
				oxfordFlippedApp.activityFinalScreenOne(contentZoneIndex);
				oxfordFlippedApp.activityContentZone();
				oxfordFlippedApp.activityTestSlides(contentZoneIndex);
				var sectionOnLoad = blink.activity.currentSection;
				oxfordFlippedApp.onSliderChange(sectionOnLoad);
				console.log("Se carga en la seccion:"+sectionOnLoad);
				blink.events.on('slider:change', function(currentSection) {
					oxfordFlippedApp.activityFinalScreenTest(currentSection);
					oxfordFlippedApp.onSliderChange(currentSection);
				});
				blink.events.on('slider:changed', function() {

					var currentSection = blink.activity.currentSection;
					oxfordFlippedApp.onSliderChanged(currentSection);

				});

			/*	blink.events.on('showSlide:after', function(currentSection) {
					console.log("showslide:after");
					console.log(currentSection);
					oxfordFlippedApp.activityFinalScreenTest(currentSection);
					oxfordFlippedApp.onSliderChange(currentSection);
				});*/

				$('body').imagesLoaded({background: 'div, a, span, button'}, function() {
					$('html').addClass('htmlReady');
				});
			}

			this.gameToken = this.getActivityGameToken(data);

		},

		loadUserData: function() {
			var urlSeguimiento = '/include/javascript/seguimientoCurso.js.php?idcurso=' + idcurso;

			loadScript(urlSeguimiento, true, (function() {
				this.refreshUserData();
			}).bind(this));
		},

		/**
		 * Actualiza los datos del usuario desde el seguimiento del curso.
		 * @param  {Object} data Información del curso.
		 */
		refreshUserData: function() {
			this.userCoins = this.calculateUserCoins(window.actividades);
			parent && parent.blink.events.trigger('course:refresh');
		},

		/**
		 * Operciones a ejecutar antes de salir de una ventana.
		 */
		onAfterUnloadVentana: function() {
			this.exitSequencing();

			if (window.actividades) {
				parent.actividades = window.actividades;
			}

			this.refreshUserData();
		},

		/**
		 * Indica si se debe mostrar el nivel de slide en el gradebook
		 */
		showSlidesGradebook: function() {
			return false;
		},

		/**
		 * Indica si se puede acceder a la actividad desde los links del Gradebook y Ficha Alumno
		 */
		canOpenActivity: function() {
			return this.activityInitialized;
		},
	};

	OxfordFlippedDevStyle.prototype = _.extend({}, new blink.theme.styles.basic(), OxfordFlippedDevStyle.prototype);

	blink.theme.styles['oxford-flipped-dev'] = OxfordFlippedDevStyle;

	blink.events.on('digitalbook:bpdfloaded', function() {
		// Ejemplo carga de datos del curso desde un libro digital.
		blink.getCourse(idcurso).done(function(data) {
			var style = new OxfordFlippedDevStyle;
			style.onCourseDataLoaded(data);
		});
	});

})( blink );

$(function() {
	$('.mascara_button').click(function() {
		gotoMyLibrary();
	});
});

// Principal

Slide.prototype.reviewButtons.principal["btn-correct"] = {
	"btnTextDef" : textweb('course_53'),
	"statusOptions" : {
		"conTodoRelleno" 	: { "visible" : true, 	"active"	: true 	},
		"conIntentos" 		: { "visible" : true, 	"active"	: true 	},
		"sinIntentos" 		: { "visible" : true, 	"active"	: false	},
		"sinRespuesta" 		: { "visible" : true, 	"active"	: true	}
	}
}

Slide.prototype.reviewButtons.principal["btn-reset"] = {
	"statusOptions": {}
}

Slide.prototype.reviewButtons.principal["btn-solution"] = {
	"statusOptions": {}
}

// Alumno

Slide.prototype.reviewButtons.alumno["btn-correct"] = {
	"btnTextDef" : textweb('course_53'),
	"statusOptions" : {
		"conTodoRelleno" 	: { "visible" : true, 	"active"	: true 	},
		"conIntentos" 		: { "visible" : true, 	"active"	: true 	},
		"sinIntentos" 		: { "visible" : true, 	"active"	: false	},
		"sinRespuesta" 		: { "visible" : true, 	"active"	: true	}
	}
}

Slide.prototype.reviewButtons.alumno["btn-reset"] = {
	"statusOptions": {}
}

Slide.prototype.reviewButtons.alumno["btn-solution"] = {
	"statusOptions": {}
}

// VENDORS

/* SLICK CAROUSEL
 Version: 1.8.1
	Author: Ken Wheeler
 Website: http://kenwheeler.github.io
		Docs: http://kenwheeler.github.io/slick
		Repo: http://github.com/kenwheeler/slick
	Issues: http://github.com/kenwheeler/slick/issues
 */

!function(i){"use strict";"function"==typeof define&&define.amd?define(["jquery"],i):"undefined"!=typeof exports?module.exports=i(require("jquery")):i(jQuery)}(function(i){"use strict";var e=window.Slick||{};(e=function(){var e=0;return function(t,o){var s,n=this;n.defaults={accessibility:!0,adaptiveHeight:!1,appendArrows:i(t),appendDots:i(t),arrows:!0,asNavFor:null,prevArrow:'<button class="slick-prev" aria-label="Previous" type="button">Previous</button>',nextArrow:'<button class="slick-next" aria-label="Next" type="button">Next</button>',autoplay:!1,autoplaySpeed:3e3,centerMode:!1,centerPadding:"50px",cssEase:"ease",customPaging:function(e,t){return i('<button type="button" />').text(t+1)},dots:!1,dotsClass:"slick-dots",draggable:!0,easing:"linear",edgeFriction:.35,fade:!1,focusOnSelect:!1,focusOnChange:!1,infinite:!0,initialSlide:0,lazyLoad:"ondemand",mobileFirst:!1,pauseOnHover:!0,pauseOnFocus:!0,pauseOnDotsHover:!1,respondTo:"window",responsive:null,rows:1,rtl:!1,slide:"",slidesPerRow:1,slidesToShow:1,slidesToScroll:1,speed:500,swipe:!0,swipeToSlide:!1,touchMove:!0,touchThreshold:5,useCSS:!0,useTransform:!0,variableWidth:!1,vertical:!1,verticalSwiping:!1,waitForAnimate:!0,zIndex:1e3},n.initials={animating:!1,dragging:!1,autoPlayTimer:null,currentDirection:0,currentLeft:null,currentSlide:0,direction:1,$dots:null,listWidth:null,listHeight:null,loadIndex:0,$nextArrow:null,$prevArrow:null,scrolling:!1,slideCount:null,slideWidth:null,$slideTrack:null,$slides:null,sliding:!1,slideOffset:0,swipeLeft:null,swiping:!1,$list:null,touchObject:{},transformsEnabled:!1,unslicked:!1},i.extend(n,n.initials),n.activeBreakpoint=null,n.animType=null,n.animProp=null,n.breakpoints=[],n.breakpointSettings=[],n.cssTransitions=!1,n.focussed=!1,n.interrupted=!1,n.hidden="hidden",n.paused=!0,n.positionProp=null,n.respondTo=null,n.rowCount=1,n.shouldClick=!0,n.$slider=i(t),n.$slidesCache=null,n.transformType=null,n.transitionType=null,n.visibilityChange="visibilitychange",n.windowWidth=0,n.windowTimer=null,s=i(t).data("slick")||{},n.options=i.extend({},n.defaults,o,s),n.currentSlide=n.options.initialSlide,n.originalSettings=n.options,void 0!==document.mozHidden?(n.hidden="mozHidden",n.visibilityChange="mozvisibilitychange"):void 0!==document.webkitHidden&&(n.hidden="webkitHidden",n.visibilityChange="webkitvisibilitychange"),n.autoPlay=i.proxy(n.autoPlay,n),n.autoPlayClear=i.proxy(n.autoPlayClear,n),n.autoPlayIterator=i.proxy(n.autoPlayIterator,n),n.changeSlide=i.proxy(n.changeSlide,n),n.clickHandler=i.proxy(n.clickHandler,n),n.selectHandler=i.proxy(n.selectHandler,n),n.setPosition=i.proxy(n.setPosition,n),n.swipeHandler=i.proxy(n.swipeHandler,n),n.dragHandler=i.proxy(n.dragHandler,n),n.keyHandler=i.proxy(n.keyHandler,n),n.instanceUid=e++,n.htmlExpr=/^(?:\s*(<[\w\W]+>)[^>]*)$/,n.registerBreakpoints(),n.init(!0)}}()).prototype.activateADA=function(){this.$slideTrack.find(".slick-active").attr({"aria-hidden":"false"}).find("a, input, button, select").attr({tabindex:"0"})},e.prototype.addSlide=e.prototype.slickAdd=function(e,t,o){var s=this;if("boolean"==typeof t)o=t,t=null;else if(t<0||t>=s.slideCount)return!1;s.unload(),"number"==typeof t?0===t&&0===s.$slides.length?i(e).appendTo(s.$slideTrack):o?i(e).insertBefore(s.$slides.eq(t)):i(e).insertAfter(s.$slides.eq(t)):!0===o?i(e).prependTo(s.$slideTrack):i(e).appendTo(s.$slideTrack),s.$slides=s.$slideTrack.children(this.options.slide),s.$slideTrack.children(this.options.slide).detach(),s.$slideTrack.append(s.$slides),s.$slides.each(function(e,t){i(t).attr("data-slick-index",e)}),s.$slidesCache=s.$slides,s.reinit()},e.prototype.animateHeight=function(){var i=this;if(1===i.options.slidesToShow&&!0===i.options.adaptiveHeight&&!1===i.options.vertical){var e=i.$slides.eq(i.currentSlide).outerHeight(!0);i.$list.animate({height:e},i.options.speed)}},e.prototype.animateSlide=function(e,t){var o={},s=this;s.animateHeight(),!0===s.options.rtl&&!1===s.options.vertical&&(e=-e),!1===s.transformsEnabled?!1===s.options.vertical?s.$slideTrack.animate({left:e},s.options.speed,s.options.easing,t):s.$slideTrack.animate({top:e},s.options.speed,s.options.easing,t):!1===s.cssTransitions?(!0===s.options.rtl&&(s.currentLeft=-s.currentLeft),i({animStart:s.currentLeft}).animate({animStart:e},{duration:s.options.speed,easing:s.options.easing,step:function(i){i=Math.ceil(i),!1===s.options.vertical?(o[s.animType]="translate("+i+"px, 0px)",s.$slideTrack.css(o)):(o[s.animType]="translate(0px,"+i+"px)",s.$slideTrack.css(o))},complete:function(){t&&t.call()}})):(s.applyTransition(),e=Math.ceil(e),!1===s.options.vertical?o[s.animType]="translate3d("+e+"px, 0px, 0px)":o[s.animType]="translate3d(0px,"+e+"px, 0px)",s.$slideTrack.css(o),t&&setTimeout(function(){s.disableTransition(),t.call()},s.options.speed))},e.prototype.getNavTarget=function(){var e=this,t=e.options.asNavFor;return t&&null!==t&&(t=i(t).not(e.$slider)),t},e.prototype.asNavFor=function(e){var t=this.getNavTarget();null!==t&&"object"==typeof t&&t.each(function(){var t=i(this).slick("getSlick");t.unslicked||t.slideHandler(e,!0)})},e.prototype.applyTransition=function(i){var e=this,t={};!1===e.options.fade?t[e.transitionType]=e.transformType+" "+e.options.speed+"ms "+e.options.cssEase:t[e.transitionType]="opacity "+e.options.speed+"ms "+e.options.cssEase,!1===e.options.fade?e.$slideTrack.css(t):e.$slides.eq(i).css(t)},e.prototype.autoPlay=function(){var i=this;i.autoPlayClear(),i.slideCount>i.options.slidesToShow&&(i.autoPlayTimer=setInterval(i.autoPlayIterator,i.options.autoplaySpeed))},e.prototype.autoPlayClear=function(){var i=this;i.autoPlayTimer&&clearInterval(i.autoPlayTimer)},e.prototype.autoPlayIterator=function(){var i=this,e=i.currentSlide+i.options.slidesToScroll;i.paused||i.interrupted||i.focussed||(!1===i.options.infinite&&(1===i.direction&&i.currentSlide+1===i.slideCount-1?i.direction=0:0===i.direction&&(e=i.currentSlide-i.options.slidesToScroll,i.currentSlide-1==0&&(i.direction=1))),i.slideHandler(e))},e.prototype.buildArrows=function(){var e=this;!0===e.options.arrows&&(e.$prevArrow=i(e.options.prevArrow).addClass("slick-arrow"),e.$nextArrow=i(e.options.nextArrow).addClass("slick-arrow"),e.slideCount>e.options.slidesToShow?(e.$prevArrow.removeClass("slick-hidden").removeAttr("aria-hidden tabindex"),e.$nextArrow.removeClass("slick-hidden").removeAttr("aria-hidden tabindex"),e.htmlExpr.test(e.options.prevArrow)&&e.$prevArrow.prependTo(e.options.appendArrows),e.htmlExpr.test(e.options.nextArrow)&&e.$nextArrow.appendTo(e.options.appendArrows),!0!==e.options.infinite&&e.$prevArrow.addClass("slick-disabled").attr("aria-disabled","true")):e.$prevArrow.add(e.$nextArrow).addClass("slick-hidden").attr({"aria-disabled":"true",tabindex:"-1"}))},e.prototype.buildDots=function(){var e,t,o=this;if(!0===o.options.dots){for(o.$slider.addClass("slick-dotted"),t=i("<ul />").addClass(o.options.dotsClass),e=0;e<=o.getDotCount();e+=1)t.append(i("<li />").append(o.options.customPaging.call(this,o,e)));o.$dots=t.appendTo(o.options.appendDots),o.$dots.find("li").first().addClass("slick-active")}},e.prototype.buildOut=function(){var e=this;e.$slides=e.$slider.children(e.options.slide+":not(.slick-cloned)").addClass("slick-slide"),e.slideCount=e.$slides.length,e.$slides.each(function(e,t){i(t).attr("data-slick-index",e).data("originalStyling",i(t).attr("style")||"")}),e.$slider.addClass("slick-slider"),e.$slideTrack=0===e.slideCount?i('<div class="slick-track"/>').appendTo(e.$slider):e.$slides.wrapAll('<div class="slick-track"/>').parent(),e.$list=e.$slideTrack.wrap('<div class="slick-list"/>').parent(),e.$slideTrack.css("opacity",0),!0!==e.options.centerMode&&!0!==e.options.swipeToSlide||(e.options.slidesToScroll=1),i("img[data-lazy]",e.$slider).not("[src]").addClass("slick-loading"),e.setupInfinite(),e.buildArrows(),e.buildDots(),e.updateDots(),e.setSlideClasses("number"==typeof e.currentSlide?e.currentSlide:0),!0===e.options.draggable&&e.$list.addClass("draggable")},e.prototype.buildRows=function(){var i,e,t,o,s,n,r,l=this;if(o=document.createDocumentFragment(),n=l.$slider.children(),l.options.rows>1){for(r=l.options.slidesPerRow*l.options.rows,s=Math.ceil(n.length/r),i=0;i<s;i++){var d=document.createElement("div");for(e=0;e<l.options.rows;e++){var a=document.createElement("div");for(t=0;t<l.options.slidesPerRow;t++){var c=i*r+(e*l.options.slidesPerRow+t);n.get(c)&&a.appendChild(n.get(c))}d.appendChild(a)}o.appendChild(d)}l.$slider.empty().append(o),l.$slider.children().children().children().css({width:100/l.options.slidesPerRow+"%",display:"inline-block"})}},e.prototype.checkResponsive=function(e,t){var o,s,n,r=this,l=!1,d=r.$slider.width(),a=window.innerWidth||i(window).width();if("window"===r.respondTo?n=a:"slider"===r.respondTo?n=d:"min"===r.respondTo&&(n=Math.min(a,d)),r.options.responsive&&r.options.responsive.length&&null!==r.options.responsive){s=null;for(o in r.breakpoints)r.breakpoints.hasOwnProperty(o)&&(!1===r.originalSettings.mobileFirst?n<r.breakpoints[o]&&(s=r.breakpoints[o]):n>r.breakpoints[o]&&(s=r.breakpoints[o]));null!==s?null!==r.activeBreakpoint?(s!==r.activeBreakpoint||t)&&(r.activeBreakpoint=s,"unslick"===r.breakpointSettings[s]?r.unslick(s):(r.options=i.extend({},r.originalSettings,r.breakpointSettings[s]),!0===e&&(r.currentSlide=r.options.initialSlide),r.refresh(e)),l=s):(r.activeBreakpoint=s,"unslick"===r.breakpointSettings[s]?r.unslick(s):(r.options=i.extend({},r.originalSettings,r.breakpointSettings[s]),!0===e&&(r.currentSlide=r.options.initialSlide),r.refresh(e)),l=s):null!==r.activeBreakpoint&&(r.activeBreakpoint=null,r.options=r.originalSettings,!0===e&&(r.currentSlide=r.options.initialSlide),r.refresh(e),l=s),e||!1===l||r.$slider.trigger("breakpoint",[r,l])}},e.prototype.changeSlide=function(e,t){var o,s,n,r=this,l=i(e.currentTarget);switch(l.is("a")&&e.preventDefault(),l.is("li")||(l=l.closest("li")),n=r.slideCount%r.options.slidesToScroll!=0,o=n?0:(r.slideCount-r.currentSlide)%r.options.slidesToScroll,e.data.message){case"previous":s=0===o?r.options.slidesToScroll:r.options.slidesToShow-o,r.slideCount>r.options.slidesToShow&&r.slideHandler(r.currentSlide-s,!1,t);break;case"next":s=0===o?r.options.slidesToScroll:o,r.slideCount>r.options.slidesToShow&&r.slideHandler(r.currentSlide+s,!1,t);break;case"index":var d=0===e.data.index?0:e.data.index||l.index()*r.options.slidesToScroll;r.slideHandler(r.checkNavigable(d),!1,t),l.children().trigger("focus");break;default:return}},e.prototype.checkNavigable=function(i){var e,t;if(e=this.getNavigableIndexes(),t=0,i>e[e.length-1])i=e[e.length-1];else for(var o in e){if(i<e[o]){i=t;break}t=e[o]}return i},e.prototype.cleanUpEvents=function(){var e=this;e.options.dots&&null!==e.$dots&&(i("li",e.$dots).off("click.slick",e.changeSlide).off("mouseenter.slick",i.proxy(e.interrupt,e,!0)).off("mouseleave.slick",i.proxy(e.interrupt,e,!1)),!0===e.options.accessibility&&e.$dots.off("keydown.slick",e.keyHandler)),e.$slider.off("focus.slick blur.slick"),!0===e.options.arrows&&e.slideCount>e.options.slidesToShow&&(e.$prevArrow&&e.$prevArrow.off("click.slick",e.changeSlide),e.$nextArrow&&e.$nextArrow.off("click.slick",e.changeSlide),!0===e.options.accessibility&&(e.$prevArrow&&e.$prevArrow.off("keydown.slick",e.keyHandler),e.$nextArrow&&e.$nextArrow.off("keydown.slick",e.keyHandler))),e.$list.off("touchstart.slick mousedown.slick",e.swipeHandler),e.$list.off("touchmove.slick mousemove.slick",e.swipeHandler),e.$list.off("touchend.slick mouseup.slick",e.swipeHandler),e.$list.off("touchcancel.slick mouseleave.slick",e.swipeHandler),e.$list.off("click.slick",e.clickHandler),i(document).off(e.visibilityChange,e.visibility),e.cleanUpSlideEvents(),!0===e.options.accessibility&&e.$list.off("keydown.slick",e.keyHandler),!0===e.options.focusOnSelect&&i(e.$slideTrack).children().off("click.slick",e.selectHandler),i(window).off("orientationchange.slick.slick-"+e.instanceUid,e.orientationChange),i(window).off("resize.slick.slick-"+e.instanceUid,e.resize),i("[draggable!=true]",e.$slideTrack).off("dragstart",e.preventDefault),i(window).off("load.slick.slick-"+e.instanceUid,e.setPosition)},e.prototype.cleanUpSlideEvents=function(){var e=this;e.$list.off("mouseenter.slick",i.proxy(e.interrupt,e,!0)),e.$list.off("mouseleave.slick",i.proxy(e.interrupt,e,!1))},e.prototype.cleanUpRows=function(){var i,e=this;e.options.rows>1&&((i=e.$slides.children().children()).removeAttr("style"),e.$slider.empty().append(i))},e.prototype.clickHandler=function(i){!1===this.shouldClick&&(i.stopImmediatePropagation(),i.stopPropagation(),i.preventDefault())},e.prototype.destroy=function(e){var t=this;t.autoPlayClear(),t.touchObject={},t.cleanUpEvents(),i(".slick-cloned",t.$slider).detach(),t.$dots&&t.$dots.remove(),t.$prevArrow&&t.$prevArrow.length&&(t.$prevArrow.removeClass("slick-disabled slick-arrow slick-hidden").removeAttr("aria-hidden aria-disabled tabindex").css("display",""),t.htmlExpr.test(t.options.prevArrow)&&t.$prevArrow.remove()),t.$nextArrow&&t.$nextArrow.length&&(t.$nextArrow.removeClass("slick-disabled slick-arrow slick-hidden").removeAttr("aria-hidden aria-disabled tabindex").css("display",""),t.htmlExpr.test(t.options.nextArrow)&&t.$nextArrow.remove()),t.$slides&&(t.$slides.removeClass("slick-slide slick-active slick-center slick-visible slick-current").removeAttr("aria-hidden").removeAttr("data-slick-index").each(function(){i(this).attr("style",i(this).data("originalStyling"))}),t.$slideTrack.children(this.options.slide).detach(),t.$slideTrack.detach(),t.$list.detach(),t.$slider.append(t.$slides)),t.cleanUpRows(),t.$slider.removeClass("slick-slider"),t.$slider.removeClass("slick-initialized"),t.$slider.removeClass("slick-dotted"),t.unslicked=!0,e||t.$slider.trigger("destroy",[t])},e.prototype.disableTransition=function(i){var e=this,t={};t[e.transitionType]="",!1===e.options.fade?e.$slideTrack.css(t):e.$slides.eq(i).css(t)},e.prototype.fadeSlide=function(i,e){var t=this;!1===t.cssTransitions?(t.$slides.eq(i).css({zIndex:t.options.zIndex}),t.$slides.eq(i).animate({opacity:1},t.options.speed,t.options.easing,e)):(t.applyTransition(i),t.$slides.eq(i).css({opacity:1,zIndex:t.options.zIndex}),e&&setTimeout(function(){t.disableTransition(i),e.call()},t.options.speed))},e.prototype.fadeSlideOut=function(i){var e=this;!1===e.cssTransitions?e.$slides.eq(i).animate({opacity:0,zIndex:e.options.zIndex-2},e.options.speed,e.options.easing):(e.applyTransition(i),e.$slides.eq(i).css({opacity:0,zIndex:e.options.zIndex-2}))},e.prototype.filterSlides=e.prototype.slickFilter=function(i){var e=this;null!==i&&(e.$slidesCache=e.$slides,e.unload(),e.$slideTrack.children(this.options.slide).detach(),e.$slidesCache.filter(i).appendTo(e.$slideTrack),e.reinit())},e.prototype.focusHandler=function(){var e=this;e.$slider.off("focus.slick blur.slick").on("focus.slick blur.slick","*",function(t){t.stopImmediatePropagation();var o=i(this);setTimeout(function(){e.options.pauseOnFocus&&(e.focussed=o.is(":focus"),e.autoPlay())},0)})},e.prototype.getCurrent=e.prototype.slickCurrentSlide=function(){return this.currentSlide},e.prototype.getDotCount=function(){var i=this,e=0,t=0,o=0;if(!0===i.options.infinite)if(i.slideCount<=i.options.slidesToShow)++o;else for(;e<i.slideCount;)++o,e=t+i.options.slidesToScroll,t+=i.options.slidesToScroll<=i.options.slidesToShow?i.options.slidesToScroll:i.options.slidesToShow;else if(!0===i.options.centerMode)o=i.slideCount;else if(i.options.asNavFor)for(;e<i.slideCount;)++o,e=t+i.options.slidesToScroll,t+=i.options.slidesToScroll<=i.options.slidesToShow?i.options.slidesToScroll:i.options.slidesToShow;else o=1+Math.ceil((i.slideCount-i.options.slidesToShow)/i.options.slidesToScroll);return o-1},e.prototype.getLeft=function(i){var e,t,o,s,n=this,r=0;return n.slideOffset=0,t=n.$slides.first().outerHeight(!0),!0===n.options.infinite?(n.slideCount>n.options.slidesToShow&&(n.slideOffset=n.slideWidth*n.options.slidesToShow*-1,s=-1,!0===n.options.vertical&&!0===n.options.centerMode&&(2===n.options.slidesToShow?s=-1.5:1===n.options.slidesToShow&&(s=-2)),r=t*n.options.slidesToShow*s),n.slideCount%n.options.slidesToScroll!=0&&i+n.options.slidesToScroll>n.slideCount&&n.slideCount>n.options.slidesToShow&&(i>n.slideCount?(n.slideOffset=(n.options.slidesToShow-(i-n.slideCount))*n.slideWidth*-1,r=(n.options.slidesToShow-(i-n.slideCount))*t*-1):(n.slideOffset=n.slideCount%n.options.slidesToScroll*n.slideWidth*-1,r=n.slideCount%n.options.slidesToScroll*t*-1))):i+n.options.slidesToShow>n.slideCount&&(n.slideOffset=(i+n.options.slidesToShow-n.slideCount)*n.slideWidth,r=(i+n.options.slidesToShow-n.slideCount)*t),n.slideCount<=n.options.slidesToShow&&(n.slideOffset=0,r=0),!0===n.options.centerMode&&n.slideCount<=n.options.slidesToShow?n.slideOffset=n.slideWidth*Math.floor(n.options.slidesToShow)/2-n.slideWidth*n.slideCount/2:!0===n.options.centerMode&&!0===n.options.infinite?n.slideOffset+=n.slideWidth*Math.floor(n.options.slidesToShow/2)-n.slideWidth:!0===n.options.centerMode&&(n.slideOffset=0,n.slideOffset+=n.slideWidth*Math.floor(n.options.slidesToShow/2)),e=!1===n.options.vertical?i*n.slideWidth*-1+n.slideOffset:i*t*-1+r,!0===n.options.variableWidth&&(o=n.slideCount<=n.options.slidesToShow||!1===n.options.infinite?n.$slideTrack.children(".slick-slide").eq(i):n.$slideTrack.children(".slick-slide").eq(i+n.options.slidesToShow),e=!0===n.options.rtl?o[0]?-1*(n.$slideTrack.width()-o[0].offsetLeft-o.width()):0:o[0]?-1*o[0].offsetLeft:0,!0===n.options.centerMode&&(o=n.slideCount<=n.options.slidesToShow||!1===n.options.infinite?n.$slideTrack.children(".slick-slide").eq(i):n.$slideTrack.children(".slick-slide").eq(i+n.options.slidesToShow+1),e=!0===n.options.rtl?o[0]?-1*(n.$slideTrack.width()-o[0].offsetLeft-o.width()):0:o[0]?-1*o[0].offsetLeft:0,e+=(n.$list.width()-o.outerWidth())/2)),e},e.prototype.getOption=e.prototype.slickGetOption=function(i){return this.options[i]},e.prototype.getNavigableIndexes=function(){var i,e=this,t=0,o=0,s=[];for(!1===e.options.infinite?i=e.slideCount:(t=-1*e.options.slidesToScroll,o=-1*e.options.slidesToScroll,i=2*e.slideCount);t<i;)s.push(t),t=o+e.options.slidesToScroll,o+=e.options.slidesToScroll<=e.options.slidesToShow?e.options.slidesToScroll:e.options.slidesToShow;return s},e.prototype.getSlick=function(){return this},e.prototype.getSlideCount=function(){var e,t,o=this;return t=!0===o.options.centerMode?o.slideWidth*Math.floor(o.options.slidesToShow/2):0,!0===o.options.swipeToSlide?(o.$slideTrack.find(".slick-slide").each(function(s,n){if(n.offsetLeft-t+i(n).outerWidth()/2>-1*o.swipeLeft)return e=n,!1}),Math.abs(i(e).attr("data-slick-index")-o.currentSlide)||1):o.options.slidesToScroll},e.prototype.goTo=e.prototype.slickGoTo=function(i,e){this.changeSlide({data:{message:"index",index:parseInt(i)}},e)},e.prototype.init=function(e){var t=this;i(t.$slider).hasClass("slick-initialized")||(i(t.$slider).addClass("slick-initialized"),t.buildRows(),t.buildOut(),t.setProps(),t.startLoad(),t.loadSlider(),t.initializeEvents(),t.updateArrows(),t.updateDots(),t.checkResponsive(!0),t.focusHandler()),e&&t.$slider.trigger("init",[t]),!0===t.options.accessibility&&t.initADA(),t.options.autoplay&&(t.paused=!1,t.autoPlay())},e.prototype.initADA=function(){var e=this,t=Math.ceil(e.slideCount/e.options.slidesToShow),o=e.getNavigableIndexes().filter(function(i){return i>=0&&i<e.slideCount});e.$slides.add(e.$slideTrack.find(".slick-cloned")).attr({"aria-hidden":"true",tabindex:"-1"}).find("a, input, button, select").attr({tabindex:"-1"}),null!==e.$dots&&(e.$slides.not(e.$slideTrack.find(".slick-cloned")).each(function(t){var s=o.indexOf(t);i(this).attr({role:"tabpanel",id:"slick-slide"+e.instanceUid+t,tabindex:-1}),-1!==s&&i(this).attr({"aria-describedby":"slick-slide-control"+e.instanceUid+s})}),e.$dots.attr("role","tablist").find("li").each(function(s){var n=o[s];i(this).attr({role:"presentation"}),i(this).find("button").first().attr({role:"tab",id:"slick-slide-control"+e.instanceUid+s,"aria-controls":"slick-slide"+e.instanceUid+n,"aria-label":s+1+" of "+t,"aria-selected":null,tabindex:"-1"})}).eq(e.currentSlide).find("button").attr({"aria-selected":"true",tabindex:"0"}).end());for(var s=e.currentSlide,n=s+e.options.slidesToShow;s<n;s++)e.$slides.eq(s).attr("tabindex",0);e.activateADA()},e.prototype.initArrowEvents=function(){var i=this;!0===i.options.arrows&&i.slideCount>i.options.slidesToShow&&(i.$prevArrow.off("click.slick").on("click.slick",{message:"previous"},i.changeSlide),i.$nextArrow.off("click.slick").on("click.slick",{message:"next"},i.changeSlide),!0===i.options.accessibility&&(i.$prevArrow.on("keydown.slick",i.keyHandler),i.$nextArrow.on("keydown.slick",i.keyHandler)))},e.prototype.initDotEvents=function(){var e=this;!0===e.options.dots&&(i("li",e.$dots).on("click.slick",{message:"index"},e.changeSlide),!0===e.options.accessibility&&e.$dots.on("keydown.slick",e.keyHandler)),!0===e.options.dots&&!0===e.options.pauseOnDotsHover&&i("li",e.$dots).on("mouseenter.slick",i.proxy(e.interrupt,e,!0)).on("mouseleave.slick",i.proxy(e.interrupt,e,!1))},e.prototype.initSlideEvents=function(){var e=this;e.options.pauseOnHover&&(e.$list.on("mouseenter.slick",i.proxy(e.interrupt,e,!0)),e.$list.on("mouseleave.slick",i.proxy(e.interrupt,e,!1)))},e.prototype.initializeEvents=function(){var e=this;e.initArrowEvents(),e.initDotEvents(),e.initSlideEvents(),e.$list.on("touchstart.slick mousedown.slick",{action:"start"},e.swipeHandler),e.$list.on("touchmove.slick mousemove.slick",{action:"move"},e.swipeHandler),e.$list.on("touchend.slick mouseup.slick",{action:"end"},e.swipeHandler),e.$list.on("touchcancel.slick mouseleave.slick",{action:"end"},e.swipeHandler),e.$list.on("click.slick",e.clickHandler),i(document).on(e.visibilityChange,i.proxy(e.visibility,e)),!0===e.options.accessibility&&e.$list.on("keydown.slick",e.keyHandler),!0===e.options.focusOnSelect&&i(e.$slideTrack).children().on("click.slick",e.selectHandler),i(window).on("orientationchange.slick.slick-"+e.instanceUid,i.proxy(e.orientationChange,e)),i(window).on("resize.slick.slick-"+e.instanceUid,i.proxy(e.resize,e)),i("[draggable!=true]",e.$slideTrack).on("dragstart",e.preventDefault),i(window).on("load.slick.slick-"+e.instanceUid,e.setPosition),i(e.setPosition)},e.prototype.initUI=function(){var i=this;!0===i.options.arrows&&i.slideCount>i.options.slidesToShow&&(i.$prevArrow.show(),i.$nextArrow.show()),!0===i.options.dots&&i.slideCount>i.options.slidesToShow&&i.$dots.show()},e.prototype.keyHandler=function(i){var e=this;i.target.tagName.match("TEXTAREA|INPUT|SELECT")||(37===i.keyCode&&!0===e.options.accessibility?e.changeSlide({data:{message:!0===e.options.rtl?"next":"previous"}}):39===i.keyCode&&!0===e.options.accessibility&&e.changeSlide({data:{message:!0===e.options.rtl?"previous":"next"}}))},e.prototype.lazyLoad=function(){function e(e){i("img[data-lazy]",e).each(function(){var e=i(this),t=i(this).attr("data-lazy"),o=i(this).attr("data-srcset"),s=i(this).attr("data-sizes")||n.$slider.attr("data-sizes"),r=document.createElement("img");r.onload=function(){e.animate({opacity:0},100,function(){o&&(e.attr("srcset",o),s&&e.attr("sizes",s)),e.attr("src",t).animate({opacity:1},200,function(){e.removeAttr("data-lazy data-srcset data-sizes").removeClass("slick-loading")}),n.$slider.trigger("lazyLoaded",[n,e,t])})},r.onerror=function(){e.removeAttr("data-lazy").removeClass("slick-loading").addClass("slick-lazyload-error"),n.$slider.trigger("lazyLoadError",[n,e,t])},r.src=t})}var t,o,s,n=this;if(!0===n.options.centerMode?!0===n.options.infinite?s=(o=n.currentSlide+(n.options.slidesToShow/2+1))+n.options.slidesToShow+2:(o=Math.max(0,n.currentSlide-(n.options.slidesToShow/2+1)),s=n.options.slidesToShow/2+1+2+n.currentSlide):(o=n.options.infinite?n.options.slidesToShow+n.currentSlide:n.currentSlide,s=Math.ceil(o+n.options.slidesToShow),!0===n.options.fade&&(o>0&&o--,s<=n.slideCount&&s++)),t=n.$slider.find(".slick-slide").slice(o,s),"anticipated"===n.options.lazyLoad)for(var r=o-1,l=s,d=n.$slider.find(".slick-slide"),a=0;a<n.options.slidesToScroll;a++)r<0&&(r=n.slideCount-1),t=(t=t.add(d.eq(r))).add(d.eq(l)),r--,l++;e(t),n.slideCount<=n.options.slidesToShow?e(n.$slider.find(".slick-slide")):n.currentSlide>=n.slideCount-n.options.slidesToShow?e(n.$slider.find(".slick-cloned").slice(0,n.options.slidesToShow)):0===n.currentSlide&&e(n.$slider.find(".slick-cloned").slice(-1*n.options.slidesToShow))},e.prototype.loadSlider=function(){var i=this;i.setPosition(),i.$slideTrack.css({opacity:1}),i.$slider.removeClass("slick-loading"),i.initUI(),"progressive"===i.options.lazyLoad&&i.progressiveLazyLoad()},e.prototype.next=e.prototype.slickNext=function(){this.changeSlide({data:{message:"next"}})},e.prototype.orientationChange=function(){var i=this;i.checkResponsive(),i.setPosition()},e.prototype.pause=e.prototype.slickPause=function(){var i=this;i.autoPlayClear(),i.paused=!0},e.prototype.play=e.prototype.slickPlay=function(){var i=this;i.autoPlay(),i.options.autoplay=!0,i.paused=!1,i.focussed=!1,i.interrupted=!1},e.prototype.postSlide=function(e){var t=this;t.unslicked||(t.$slider.trigger("afterChange",[t,e]),t.animating=!1,t.slideCount>t.options.slidesToShow&&t.setPosition(),t.swipeLeft=null,t.options.autoplay&&t.autoPlay(),!0===t.options.accessibility&&(t.initADA(),t.options.focusOnChange&&i(t.$slides.get(t.currentSlide)).attr("tabindex",0).focus()))},e.prototype.prev=e.prototype.slickPrev=function(){this.changeSlide({data:{message:"previous"}})},e.prototype.preventDefault=function(i){i.preventDefault()},e.prototype.progressiveLazyLoad=function(e){e=e||1;var t,o,s,n,r,l=this,d=i("img[data-lazy]",l.$slider);d.length?(t=d.first(),o=t.attr("data-lazy"),s=t.attr("data-srcset"),n=t.attr("data-sizes")||l.$slider.attr("data-sizes"),(r=document.createElement("img")).onload=function(){s&&(t.attr("srcset",s),n&&t.attr("sizes",n)),t.attr("src",o).removeAttr("data-lazy data-srcset data-sizes").removeClass("slick-loading"),!0===l.options.adaptiveHeight&&l.setPosition(),l.$slider.trigger("lazyLoaded",[l,t,o]),l.progressiveLazyLoad()},r.onerror=function(){e<3?setTimeout(function(){l.progressiveLazyLoad(e+1)},500):(t.removeAttr("data-lazy").removeClass("slick-loading").addClass("slick-lazyload-error"),l.$slider.trigger("lazyLoadError",[l,t,o]),l.progressiveLazyLoad())},r.src=o):l.$slider.trigger("allImagesLoaded",[l])},e.prototype.refresh=function(e){var t,o,s=this;o=s.slideCount-s.options.slidesToShow,!s.options.infinite&&s.currentSlide>o&&(s.currentSlide=o),s.slideCount<=s.options.slidesToShow&&(s.currentSlide=0),t=s.currentSlide,s.destroy(!0),i.extend(s,s.initials,{currentSlide:t}),s.init(),e||s.changeSlide({data:{message:"index",index:t}},!1)},e.prototype.registerBreakpoints=function(){var e,t,o,s=this,n=s.options.responsive||null;if("array"===i.type(n)&&n.length){s.respondTo=s.options.respondTo||"window";for(e in n)if(o=s.breakpoints.length-1,n.hasOwnProperty(e)){for(t=n[e].breakpoint;o>=0;)s.breakpoints[o]&&s.breakpoints[o]===t&&s.breakpoints.splice(o,1),o--;s.breakpoints.push(t),s.breakpointSettings[t]=n[e].settings}s.breakpoints.sort(function(i,e){return s.options.mobileFirst?i-e:e-i})}},e.prototype.reinit=function(){var e=this;e.$slides=e.$slideTrack.children(e.options.slide).addClass("slick-slide"),e.slideCount=e.$slides.length,e.currentSlide>=e.slideCount&&0!==e.currentSlide&&(e.currentSlide=e.currentSlide-e.options.slidesToScroll),e.slideCount<=e.options.slidesToShow&&(e.currentSlide=0),e.registerBreakpoints(),e.setProps(),e.setupInfinite(),e.buildArrows(),e.updateArrows(),e.initArrowEvents(),e.buildDots(),e.updateDots(),e.initDotEvents(),e.cleanUpSlideEvents(),e.initSlideEvents(),e.checkResponsive(!1,!0),!0===e.options.focusOnSelect&&i(e.$slideTrack).children().on("click.slick",e.selectHandler),e.setSlideClasses("number"==typeof e.currentSlide?e.currentSlide:0),e.setPosition(),e.focusHandler(),e.paused=!e.options.autoplay,e.autoPlay(),e.$slider.trigger("reInit",[e])},e.prototype.resize=function(){var e=this;i(window).width()!==e.windowWidth&&(clearTimeout(e.windowDelay),e.windowDelay=window.setTimeout(function(){e.windowWidth=i(window).width(),e.checkResponsive(),e.unslicked||e.setPosition()},50))},e.prototype.removeSlide=e.prototype.slickRemove=function(i,e,t){var o=this;if(i="boolean"==typeof i?!0===(e=i)?0:o.slideCount-1:!0===e?--i:i,o.slideCount<1||i<0||i>o.slideCount-1)return!1;o.unload(),!0===t?o.$slideTrack.children().remove():o.$slideTrack.children(this.options.slide).eq(i).remove(),o.$slides=o.$slideTrack.children(this.options.slide),o.$slideTrack.children(this.options.slide).detach(),o.$slideTrack.append(o.$slides),o.$slidesCache=o.$slides,o.reinit()},e.prototype.setCSS=function(i){var e,t,o=this,s={};!0===o.options.rtl&&(i=-i),e="left"==o.positionProp?Math.ceil(i)+"px":"0px",t="top"==o.positionProp?Math.ceil(i)+"px":"0px",s[o.positionProp]=i,!1===o.transformsEnabled?o.$slideTrack.css(s):(s={},!1===o.cssTransitions?(s[o.animType]="translate("+e+", "+t+")",o.$slideTrack.css(s)):(s[o.animType]="translate3d("+e+", "+t+", 0px)",o.$slideTrack.css(s)))},e.prototype.setDimensions=function(){var i=this;!1===i.options.vertical?!0===i.options.centerMode&&i.$list.css({padding:"0px "+i.options.centerPadding}):(i.$list.height(i.$slides.first().outerHeight(!0)*i.options.slidesToShow),!0===i.options.centerMode&&i.$list.css({padding:i.options.centerPadding+" 0px"})),i.listWidth=i.$list.width(),i.listHeight=i.$list.height(),!1===i.options.vertical&&!1===i.options.variableWidth?(i.slideWidth=Math.ceil(i.listWidth/i.options.slidesToShow),i.$slideTrack.width(Math.ceil(i.slideWidth*i.$slideTrack.children(".slick-slide").length))):!0===i.options.variableWidth?i.$slideTrack.width(5e3*i.slideCount):(i.slideWidth=Math.ceil(i.listWidth),i.$slideTrack.height(Math.ceil(i.$slides.first().outerHeight(!0)*i.$slideTrack.children(".slick-slide").length)));var e=i.$slides.first().outerWidth(!0)-i.$slides.first().width();!1===i.options.variableWidth&&i.$slideTrack.children(".slick-slide").width(i.slideWidth-e)},e.prototype.setFade=function(){var e,t=this;t.$slides.each(function(o,s){e=t.slideWidth*o*-1,!0===t.options.rtl?i(s).css({position:"relative",right:e,top:0,zIndex:t.options.zIndex-2,opacity:0}):i(s).css({position:"relative",left:e,top:0,zIndex:t.options.zIndex-2,opacity:0})}),t.$slides.eq(t.currentSlide).css({zIndex:t.options.zIndex-1,opacity:1})},e.prototype.setHeight=function(){var i=this;if(1===i.options.slidesToShow&&!0===i.options.adaptiveHeight&&!1===i.options.vertical){var e=i.$slides.eq(i.currentSlide).outerHeight(!0);i.$list.css("height",e)}},e.prototype.setOption=e.prototype.slickSetOption=function(){var e,t,o,s,n,r=this,l=!1;if("object"===i.type(arguments[0])?(o=arguments[0],l=arguments[1],n="multiple"):"string"===i.type(arguments[0])&&(o=arguments[0],s=arguments[1],l=arguments[2],"responsive"===arguments[0]&&"array"===i.type(arguments[1])?n="responsive":void 0!==arguments[1]&&(n="single")),"single"===n)r.options[o]=s;else if("multiple"===n)i.each(o,function(i,e){r.options[i]=e});else if("responsive"===n)for(t in s)if("array"!==i.type(r.options.responsive))r.options.responsive=[s[t]];else{for(e=r.options.responsive.length-1;e>=0;)r.options.responsive[e].breakpoint===s[t].breakpoint&&r.options.responsive.splice(e,1),e--;r.options.responsive.push(s[t])}l&&(r.unload(),r.reinit())},e.prototype.setPosition=function(){var i=this;i.setDimensions(),i.setHeight(),!1===i.options.fade?i.setCSS(i.getLeft(i.currentSlide)):i.setFade(),i.$slider.trigger("setPosition",[i])},e.prototype.setProps=function(){var i=this,e=document.body.style;i.positionProp=!0===i.options.vertical?"top":"left","top"===i.positionProp?i.$slider.addClass("slick-vertical"):i.$slider.removeClass("slick-vertical"),void 0===e.WebkitTransition&&void 0===e.MozTransition&&void 0===e.msTransition||!0===i.options.useCSS&&(i.cssTransitions=!0),i.options.fade&&("number"==typeof i.options.zIndex?i.options.zIndex<3&&(i.options.zIndex=3):i.options.zIndex=i.defaults.zIndex),void 0!==e.OTransform&&(i.animType="OTransform",i.transformType="-o-transform",i.transitionType="OTransition",void 0===e.perspectiveProperty&&void 0===e.webkitPerspective&&(i.animType=!1)),void 0!==e.MozTransform&&(i.animType="MozTransform",i.transformType="-moz-transform",i.transitionType="MozTransition",void 0===e.perspectiveProperty&&void 0===e.MozPerspective&&(i.animType=!1)),void 0!==e.webkitTransform&&(i.animType="webkitTransform",i.transformType="-webkit-transform",i.transitionType="webkitTransition",void 0===e.perspectiveProperty&&void 0===e.webkitPerspective&&(i.animType=!1)),void 0!==e.msTransform&&(i.animType="msTransform",i.transformType="-ms-transform",i.transitionType="msTransition",void 0===e.msTransform&&(i.animType=!1)),void 0!==e.transform&&!1!==i.animType&&(i.animType="transform",i.transformType="transform",i.transitionType="transition"),i.transformsEnabled=i.options.useTransform&&null!==i.animType&&!1!==i.animType},e.prototype.setSlideClasses=function(i){var e,t,o,s,n=this;if(t=n.$slider.find(".slick-slide").removeClass("slick-active slick-center slick-current").attr("aria-hidden","true"),n.$slides.eq(i).addClass("slick-current"),!0===n.options.centerMode){var r=n.options.slidesToShow%2==0?1:0;e=Math.floor(n.options.slidesToShow/2),!0===n.options.infinite&&(i>=e&&i<=n.slideCount-1-e?n.$slides.slice(i-e+r,i+e+1).addClass("slick-active").attr("aria-hidden","false"):(o=n.options.slidesToShow+i,t.slice(o-e+1+r,o+e+2).addClass("slick-active").attr("aria-hidden","false")),0===i?t.eq(t.length-1-n.options.slidesToShow).addClass("slick-center"):i===n.slideCount-1&&t.eq(n.options.slidesToShow).addClass("slick-center")),n.$slides.eq(i).addClass("slick-center")}else i>=0&&i<=n.slideCount-n.options.slidesToShow?n.$slides.slice(i,i+n.options.slidesToShow).addClass("slick-active").attr("aria-hidden","false"):t.length<=n.options.slidesToShow?t.addClass("slick-active").attr("aria-hidden","false"):(s=n.slideCount%n.options.slidesToShow,o=!0===n.options.infinite?n.options.slidesToShow+i:i,n.options.slidesToShow==n.options.slidesToScroll&&n.slideCount-i<n.options.slidesToShow?t.slice(o-(n.options.slidesToShow-s),o+s).addClass("slick-active").attr("aria-hidden","false"):t.slice(o,o+n.options.slidesToShow).addClass("slick-active").attr("aria-hidden","false"));"ondemand"!==n.options.lazyLoad&&"anticipated"!==n.options.lazyLoad||n.lazyLoad()},e.prototype.setupInfinite=function(){var e,t,o,s=this;if(!0===s.options.fade&&(s.options.centerMode=!1),!0===s.options.infinite&&!1===s.options.fade&&(t=null,s.slideCount>s.options.slidesToShow)){for(o=!0===s.options.centerMode?s.options.slidesToShow+1:s.options.slidesToShow,e=s.slideCount;e>s.slideCount-o;e-=1)t=e-1,i(s.$slides[t]).clone(!0).attr("id","").attr("data-slick-index",t-s.slideCount).prependTo(s.$slideTrack).addClass("slick-cloned");for(e=0;e<o+s.slideCount;e+=1)t=e,i(s.$slides[t]).clone(!0).attr("id","").attr("data-slick-index",t+s.slideCount).appendTo(s.$slideTrack).addClass("slick-cloned");s.$slideTrack.find(".slick-cloned").find("[id]").each(function(){i(this).attr("id","")})}},e.prototype.interrupt=function(i){var e=this;i||e.autoPlay(),e.interrupted=i},e.prototype.selectHandler=function(e){var t=this,o=i(e.target).is(".slick-slide")?i(e.target):i(e.target).parents(".slick-slide"),s=parseInt(o.attr("data-slick-index"));s||(s=0),t.slideCount<=t.options.slidesToShow?t.slideHandler(s,!1,!0):t.slideHandler(s)},e.prototype.slideHandler=function(i,e,t){var o,s,n,r,l,d=null,a=this;if(e=e||!1,!(!0===a.animating&&!0===a.options.waitForAnimate||!0===a.options.fade&&a.currentSlide===i))if(!1===e&&a.asNavFor(i),o=i,d=a.getLeft(o),r=a.getLeft(a.currentSlide),a.currentLeft=null===a.swipeLeft?r:a.swipeLeft,!1===a.options.infinite&&!1===a.options.centerMode&&(i<0||i>a.getDotCount()*a.options.slidesToScroll))!1===a.options.fade&&(o=a.currentSlide,!0!==t?a.animateSlide(r,function(){a.postSlide(o)}):a.postSlide(o));else if(!1===a.options.infinite&&!0===a.options.centerMode&&(i<0||i>a.slideCount-a.options.slidesToScroll))!1===a.options.fade&&(o=a.currentSlide,!0!==t?a.animateSlide(r,function(){a.postSlide(o)}):a.postSlide(o));else{if(a.options.autoplay&&clearInterval(a.autoPlayTimer),s=o<0?a.slideCount%a.options.slidesToScroll!=0?a.slideCount-a.slideCount%a.options.slidesToScroll:a.slideCount+o:o>=a.slideCount?a.slideCount%a.options.slidesToScroll!=0?0:o-a.slideCount:o,a.animating=!0,a.$slider.trigger("beforeChange",[a,a.currentSlide,s]),n=a.currentSlide,a.currentSlide=s,a.setSlideClasses(a.currentSlide),a.options.asNavFor&&(l=(l=a.getNavTarget()).slick("getSlick")).slideCount<=l.options.slidesToShow&&l.setSlideClasses(a.currentSlide),a.updateDots(),a.updateArrows(),!0===a.options.fade)return!0!==t?(a.fadeSlideOut(n),a.fadeSlide(s,function(){a.postSlide(s)})):a.postSlide(s),void a.animateHeight();!0!==t?a.animateSlide(d,function(){a.postSlide(s)}):a.postSlide(s)}},e.prototype.startLoad=function(){var i=this;!0===i.options.arrows&&i.slideCount>i.options.slidesToShow&&(i.$prevArrow.hide(),i.$nextArrow.hide()),!0===i.options.dots&&i.slideCount>i.options.slidesToShow&&i.$dots.hide(),i.$slider.addClass("slick-loading")},e.prototype.swipeDirection=function(){var i,e,t,o,s=this;return i=s.touchObject.startX-s.touchObject.curX,e=s.touchObject.startY-s.touchObject.curY,t=Math.atan2(e,i),(o=Math.round(180*t/Math.PI))<0&&(o=360-Math.abs(o)),o<=45&&o>=0?!1===s.options.rtl?"left":"right":o<=360&&o>=315?!1===s.options.rtl?"left":"right":o>=135&&o<=225?!1===s.options.rtl?"right":"left":!0===s.options.verticalSwiping?o>=35&&o<=135?"down":"up":"vertical"},e.prototype.swipeEnd=function(i){var e,t,o=this;if(o.dragging=!1,o.swiping=!1,o.scrolling)return o.scrolling=!1,!1;if(o.interrupted=!1,o.shouldClick=!(o.touchObject.swipeLength>10),void 0===o.touchObject.curX)return!1;if(!0===o.touchObject.edgeHit&&o.$slider.trigger("edge",[o,o.swipeDirection()]),o.touchObject.swipeLength>=o.touchObject.minSwipe){switch(t=o.swipeDirection()){case"left":case"down":e=o.options.swipeToSlide?o.checkNavigable(o.currentSlide+o.getSlideCount()):o.currentSlide+o.getSlideCount(),o.currentDirection=0;break;case"right":case"up":e=o.options.swipeToSlide?o.checkNavigable(o.currentSlide-o.getSlideCount()):o.currentSlide-o.getSlideCount(),o.currentDirection=1}"vertical"!=t&&(o.slideHandler(e),o.touchObject={},o.$slider.trigger("swipe",[o,t]))}else o.touchObject.startX!==o.touchObject.curX&&(o.slideHandler(o.currentSlide),o.touchObject={})},e.prototype.swipeHandler=function(i){var e=this;if(!(!1===e.options.swipe||"ontouchend"in document&&!1===e.options.swipe||!1===e.options.draggable&&-1!==i.type.indexOf("mouse")))switch(e.touchObject.fingerCount=i.originalEvent&&void 0!==i.originalEvent.touches?i.originalEvent.touches.length:1,e.touchObject.minSwipe=e.listWidth/e.options.touchThreshold,!0===e.options.verticalSwiping&&(e.touchObject.minSwipe=e.listHeight/e.options.touchThreshold),i.data.action){case"start":e.swipeStart(i);break;case"move":e.swipeMove(i);break;case"end":e.swipeEnd(i)}},e.prototype.swipeMove=function(i){var e,t,o,s,n,r,l=this;return n=void 0!==i.originalEvent?i.originalEvent.touches:null,!(!l.dragging||l.scrolling||n&&1!==n.length)&&(e=l.getLeft(l.currentSlide),l.touchObject.curX=void 0!==n?n[0].pageX:i.clientX,l.touchObject.curY=void 0!==n?n[0].pageY:i.clientY,l.touchObject.swipeLength=Math.round(Math.sqrt(Math.pow(l.touchObject.curX-l.touchObject.startX,2))),r=Math.round(Math.sqrt(Math.pow(l.touchObject.curY-l.touchObject.startY,2))),!l.options.verticalSwiping&&!l.swiping&&r>4?(l.scrolling=!0,!1):(!0===l.options.verticalSwiping&&(l.touchObject.swipeLength=r),t=l.swipeDirection(),void 0!==i.originalEvent&&l.touchObject.swipeLength>4&&(l.swiping=!0,i.preventDefault()),s=(!1===l.options.rtl?1:-1)*(l.touchObject.curX>l.touchObject.startX?1:-1),!0===l.options.verticalSwiping&&(s=l.touchObject.curY>l.touchObject.startY?1:-1),o=l.touchObject.swipeLength,l.touchObject.edgeHit=!1,!1===l.options.infinite&&(0===l.currentSlide&&"right"===t||l.currentSlide>=l.getDotCount()&&"left"===t)&&(o=l.touchObject.swipeLength*l.options.edgeFriction,l.touchObject.edgeHit=!0),!1===l.options.vertical?l.swipeLeft=e+o*s:l.swipeLeft=e+o*(l.$list.height()/l.listWidth)*s,!0===l.options.verticalSwiping&&(l.swipeLeft=e+o*s),!0!==l.options.fade&&!1!==l.options.touchMove&&(!0===l.animating?(l.swipeLeft=null,!1):void l.setCSS(l.swipeLeft))))},e.prototype.swipeStart=function(i){var e,t=this;if(t.interrupted=!0,1!==t.touchObject.fingerCount||t.slideCount<=t.options.slidesToShow)return t.touchObject={},!1;void 0!==i.originalEvent&&void 0!==i.originalEvent.touches&&(e=i.originalEvent.touches[0]),t.touchObject.startX=t.touchObject.curX=void 0!==e?e.pageX:i.clientX,t.touchObject.startY=t.touchObject.curY=void 0!==e?e.pageY:i.clientY,t.dragging=!0},e.prototype.unfilterSlides=e.prototype.slickUnfilter=function(){var i=this;null!==i.$slidesCache&&(i.unload(),i.$slideTrack.children(this.options.slide).detach(),i.$slidesCache.appendTo(i.$slideTrack),i.reinit())},e.prototype.unload=function(){var e=this;i(".slick-cloned",e.$slider).remove(),e.$dots&&e.$dots.remove(),e.$prevArrow&&e.htmlExpr.test(e.options.prevArrow)&&e.$prevArrow.remove(),e.$nextArrow&&e.htmlExpr.test(e.options.nextArrow)&&e.$nextArrow.remove(),e.$slides.removeClass("slick-slide slick-active slick-visible slick-current").attr("aria-hidden","true").css("width","")},e.prototype.unslick=function(i){var e=this;e.$slider.trigger("unslick",[e,i]),e.destroy()},e.prototype.updateArrows=function(){var i=this;Math.floor(i.options.slidesToShow/2),!0===i.options.arrows&&i.slideCount>i.options.slidesToShow&&!i.options.infinite&&(i.$prevArrow.removeClass("slick-disabled").attr("aria-disabled","false"),i.$nextArrow.removeClass("slick-disabled").attr("aria-disabled","false"),0===i.currentSlide?(i.$prevArrow.addClass("slick-disabled").attr("aria-disabled","true"),i.$nextArrow.removeClass("slick-disabled").attr("aria-disabled","false")):i.currentSlide>=i.slideCount-i.options.slidesToShow&&!1===i.options.centerMode?(i.$nextArrow.addClass("slick-disabled").attr("aria-disabled","true"),i.$prevArrow.removeClass("slick-disabled").attr("aria-disabled","false")):i.currentSlide>=i.slideCount-1&&!0===i.options.centerMode&&(i.$nextArrow.addClass("slick-disabled").attr("aria-disabled","true"),i.$prevArrow.removeClass("slick-disabled").attr("aria-disabled","false")))},e.prototype.updateDots=function(){var i=this;null!==i.$dots&&(i.$dots.find("li").removeClass("slick-active").end(),i.$dots.find("li").eq(Math.floor(i.currentSlide/i.options.slidesToScroll)).addClass("slick-active"))},e.prototype.visibility=function(){var i=this;i.options.autoplay&&(document[i.hidden]?i.interrupted=!0:i.interrupted=!1)},i.fn.slick=function(){var i,t,o=this,s=arguments[0],n=Array.prototype.slice.call(arguments,1),r=o.length;for(i=0;i<r;i++)if("object"==typeof s||void 0===s?o[i].slick=new e(o[i],s):t=o[i].slick[s].apply(o[i].slick,n),void 0!==t)return t;return o}});

/*!
 * imagesLoaded PACKAGED v4.1.4
 * JavaScript is all like "You images are done yet or what?"
 * MIT License
 */

!function(e,t){"function"==typeof define&&define.amd?define("ev-emitter/ev-emitter",t):"object"==typeof module&&module.exports?module.exports=t():e.EvEmitter=t()}("undefined"!=typeof window?window:this,function(){function e(){}var t=e.prototype;return t.on=function(e,t){if(e&&t){var i=this._events=this._events||{},n=i[e]=i[e]||[];return n.indexOf(t)==-1&&n.push(t),this}},t.once=function(e,t){if(e&&t){this.on(e,t);var i=this._onceEvents=this._onceEvents||{},n=i[e]=i[e]||{};return n[t]=!0,this}},t.off=function(e,t){var i=this._events&&this._events[e];if(i&&i.length){var n=i.indexOf(t);return n!=-1&&i.splice(n,1),this}},t.emitEvent=function(e,t){var i=this._events&&this._events[e];if(i&&i.length){i=i.slice(0),t=t||[];for(var n=this._onceEvents&&this._onceEvents[e],o=0;o<i.length;o++){var r=i[o],s=n&&n[r];s&&(this.off(e,r),delete n[r]),r.apply(this,t)}return this}},t.allOff=function(){delete this._events,delete this._onceEvents},e}),function(e,t){"use strict";"function"==typeof define&&define.amd?define(["ev-emitter/ev-emitter"],function(i){return t(e,i)}):"object"==typeof module&&module.exports?module.exports=t(e,require("ev-emitter")):e.imagesLoaded=t(e,e.EvEmitter)}("undefined"!=typeof window?window:this,function(e,t){function i(e,t){for(var i in t)e[i]=t[i];return e}function n(e){if(Array.isArray(e))return e;var t="object"==typeof e&&"number"==typeof e.length;return t?d.call(e):[e]}function o(e,t,r){if(!(this instanceof o))return new o(e,t,r);var s=e;return"string"==typeof e&&(s=document.querySelectorAll(e)),s?(this.elements=n(s),this.options=i({},this.options),"function"==typeof t?r=t:i(this.options,t),r&&this.on("always",r),this.getImages(),h&&(this.jqDeferred=new h.Deferred),void setTimeout(this.check.bind(this))):void a.error("Bad element for imagesLoaded "+(s||e))}function r(e){this.img=e}function s(e,t){this.url=e,this.element=t,this.img=new Image}var h=e.jQuery,a=e.console,d=Array.prototype.slice;o.prototype=Object.create(t.prototype),o.prototype.options={},o.prototype.getImages=function(){this.images=[],this.elements.forEach(this.addElementImages,this)},o.prototype.addElementImages=function(e){"IMG"==e.nodeName&&this.addImage(e),this.options.background===!0&&this.addElementBackgroundImages(e);var t=e.nodeType;if(t&&u[t]){for(var i=e.querySelectorAll("img"),n=0;n<i.length;n++){var o=i[n];this.addImage(o)}if("string"==typeof this.options.background){var r=e.querySelectorAll(this.options.background);for(n=0;n<r.length;n++){var s=r[n];this.addElementBackgroundImages(s)}}}};var u={1:!0,9:!0,11:!0};return o.prototype.addElementBackgroundImages=function(e){var t=getComputedStyle(e);if(t)for(var i=/url\((['"])?(.*?)\1\)/gi,n=i.exec(t.backgroundImage);null!==n;){var o=n&&n[2];o&&this.addBackground(o,e),n=i.exec(t.backgroundImage)}},o.prototype.addImage=function(e){var t=new r(e);this.images.push(t)},o.prototype.addBackground=function(e,t){var i=new s(e,t);this.images.push(i)},o.prototype.check=function(){function e(e,i,n){setTimeout(function(){t.progress(e,i,n)})}var t=this;return this.progressedCount=0,this.hasAnyBroken=!1,this.images.length?void this.images.forEach(function(t){t.once("progress",e),t.check()}):void this.complete()},o.prototype.progress=function(e,t,i){this.progressedCount++,this.hasAnyBroken=this.hasAnyBroken||!e.isLoaded,this.emitEvent("progress",[this,e,t]),this.jqDeferred&&this.jqDeferred.notify&&this.jqDeferred.notify(this,e),this.progressedCount==this.images.length&&this.complete(),this.options.debug&&a&&a.log("progress: "+i,e,t)},o.prototype.complete=function(){var e=this.hasAnyBroken?"fail":"done";if(this.isComplete=!0,this.emitEvent(e,[this]),this.emitEvent("always",[this]),this.jqDeferred){var t=this.hasAnyBroken?"reject":"resolve";this.jqDeferred[t](this)}},r.prototype=Object.create(t.prototype),r.prototype.check=function(){var e=this.getIsImageComplete();return e?void this.confirm(0!==this.img.naturalWidth,"naturalWidth"):(this.proxyImage=new Image,this.proxyImage.addEventListener("load",this),this.proxyImage.addEventListener("error",this),this.img.addEventListener("load",this),this.img.addEventListener("error",this),void(this.proxyImage.src=this.img.src))},r.prototype.getIsImageComplete=function(){return this.img.complete&&this.img.naturalWidth},r.prototype.confirm=function(e,t){this.isLoaded=e,this.emitEvent("progress",[this,this.img,t])},r.prototype.handleEvent=function(e){var t="on"+e.type;this[t]&&this[t](e)},r.prototype.onload=function(){this.confirm(!0,"onload"),this.unbindEvents()},r.prototype.onerror=function(){this.confirm(!1,"onerror"),this.unbindEvents()},r.prototype.unbindEvents=function(){this.proxyImage.removeEventListener("load",this),this.proxyImage.removeEventListener("error",this),this.img.removeEventListener("load",this),this.img.removeEventListener("error",this)},s.prototype=Object.create(r.prototype),s.prototype.check=function(){this.img.addEventListener("load",this),this.img.addEventListener("error",this),this.img.src=this.url;var e=this.getIsImageComplete();e&&(this.confirm(0!==this.img.naturalWidth,"naturalWidth"),this.unbindEvents())},s.prototype.unbindEvents=function(){this.img.removeEventListener("load",this),this.img.removeEventListener("error",this)},s.prototype.confirm=function(e,t){this.isLoaded=e,this.emitEvent("progress",[this,this.element,t])},o.makeJQueryPlugin=function(t){t=t||e.jQuery,t&&(h=t,h.fn.imagesLoaded=function(e,t){var i=new o(this,e,t);return i.jqDeferred.promise(h(this))})},o.makeJQueryPlugin(),o});


var oxfordFlippedApp = window.oxfordFlippedApp || {};
oxfordFlippedApp.config = {};
oxfordFlippedApp.config.isDEV = (ENTORNO === 'DEV');
oxfordFlippedApp.config.ConfigActivityIndex = 0;
oxfordFlippedApp.config.nameActivityInfo = 'Info';
oxfordFlippedApp.config.nameChallenge = 'Challenge';
oxfordFlippedApp.config.tagMarketplace = 'marketplace';
oxfordFlippedApp.config.marketplaceType1 = 'game';
oxfordFlippedApp.config.marketplaceType2 = 'summary';
oxfordFlippedApp.config.carouselOpt = {arrows: true, dots: true, infinite: false};
oxfordFlippedApp.config.isStudent = false;
oxfordFlippedApp.config.minGrade = 50;
oxfordFlippedApp.config.oneStarGradeMax = 70;
oxfordFlippedApp.config.twoStarsGradeMax = 99;
oxfordFlippedApp.config.buttonGoBack = '#oxfl-general-buttons .oxfl-js-goback';

oxfordFlippedApp.config.firstTime = true;

oxfordFlippedApp.config.bodyClasses = ['oxfl-body-home', 'oxfl-body-episodes', 'oxfl-body-chapters', 'oxfl-body-marketplace', 'oxfl-body-marketplace-game', 'oxfl-body-marketplace-summary', 'oxfl-body-gradebook'];

oxfordFlippedApp.config.tree = {
	0 : {
    'id' : 'home',
		'hash' : 'home',
		'class' : oxfordFlippedApp.config.bodyClasses[0]
	},
	1 : {
    'id' : 'units',
		'hash' : 'units',
		'class' : oxfordFlippedApp.config.bodyClasses[1]
	},
	2 : {
    'id' : 'unit',
		'hash' : 'unit_',
		'class' : oxfordFlippedApp.config.bodyClasses[2]
	},
	3 : {
    'id' : 'marketplace',
		'hash' : 'marketplace',
		'class' : oxfordFlippedApp.config.bodyClasses[3]
	},
	4 : {
    'id' : 'marketplace_games',
		'hash' : 'marketplace_games',
		'class' : oxfordFlippedApp.config.bodyClasses[4]
	},
	5 : {
    'id' : 'marketplace_summaries',
		'hash' : 'marketplace_summaries',
		'class' : oxfordFlippedApp.config.bodyClasses[5]
	},
	6 : {
    'id' : 'gradebook',
		'hash' : 'gradebook',
		'class' : oxfordFlippedApp.config.bodyClasses[6]
	}
}

oxfordFlippedApp.config.challengeIDs = [];
oxfordFlippedApp.config.backgroundWrapper = '#oxfl-custom-background';
oxfordFlippedApp.config.statusLock1 = 8;
oxfordFlippedApp.config.statusLock2 = 2;

oxfordFlippedApp.bookData = '';

oxfordFlippedApp.text = {
	text1 : 'Oxford Flipped',
	chapterStatus0 : 'Started',
	chapterStatus1 : 'Completed',
	chapterStatus2 : 'New',
	//popoverChallenge : 'To access the Challenge you first have to complete all chapters',
	//popoverChapter: 'Your teacher first has to provide access to you',
	//confirmCloseIframe: 'Si sales perderás el progreso realizado. ¿Estás seguro?',
	closeContentZone : 'Back to top',
	nextContentZone : 'Are you ready?',
	startTest : 'You are about to start the consolidation test. Remember that once you start it, it is not recommended to quit or you will lose any progress made.',
	no : 'No',
	yes : 'Yes',
	ok : 'Ok',
	buttonhome : 'Home',
	buttoninfo: 'About',
	buttonmarketplace: 'Marketplace',
	buttongradebook : 'Gradebook',
	buttonprepare : 'Prepare',
	buttongoback: 'Go back',
	hello : 'Hola,',
	beforeYouLeave : 'Before you leave...',
	viewtip : 'View tip',
	exit: 'Exit',
	tryagain : 'Try again',
	or : 'or',
	selectepidose : 'Select unit',
	buygame : 'Buy a game',
	buysummary : 'Buy a summary',
	choosegame : 'Choose a game',
	chooseshorcut : 'Choose a shorcut',
	start : 'Start!',
	titleNotif : 'You have new chapters available!',
	gamificacion_monedas_insuficientes: 'You do not have enough coins.',
	oxfordFlipped_lost_progress_alert: 'Are you sure you want to exit?',
	oxfordFlipped_no_access_alert: 'Oops! Your teacher hasn’t given you access to this lesson yet.',
	oxfordFlipped_no_complete_alert: 'Oops! You must complete all the lessons in the unit to access the challenge.',
	oxfordFlipped_return_contentzone_alert:  'Are you sure you want to quit the test? Any progress will be lost.',
	modalLock:  'You are about to <span id="oxfl-modal-lock-chapters-text"></span> a chapter for your students, are you sure?',
	noconnection:  'Ooops. No tienes conexión',
	//nocoins : 'No tienes monedas suficientes',
	buy : 'Buy!',
	popoverGoToContentZoneDisabled : 'Debes completar esta actividad para continuar',
	quit : 'Quit'
}

oxfordFlippedApp.console = function(logValue) {
	if (oxfordFlippedApp.config.isDEV) {
		console.log(logValue);
	}
}

oxfordFlippedApp.getChallengeIDs = function(data) {

	oxfordFlippedApp.console(data);

	$.each(data.units, function(i, unit){

		oxfordFlippedApp.console(unit);

		if (i != oxfordFlippedApp.config.ConfigActivityIndex) {
			var unitTitle = unit.title,
					unitIsMarketplace = (unit.title === 'Marketplace') ? true : false;
			if (!unitIsMarketplace) {
				$.each(unit.subunits, function(i, subunit){
					var chapterIsChallenge = (subunit.title ===  oxfordFlippedApp.config.nameChallenge);
					if (chapterIsChallenge) {
						oxfordFlippedApp.config.challengeIDs.push(subunit.id);
					}
				});

			}
		}
	});
	oxfordFlippedApp.console(oxfordFlippedApp.config.challengeIDs);

}

oxfordFlippedApp.popover = function() {

	$('.oxfl-js-popover').popover({
		placement: 'top',
		template: '<div class="popover oxfl-popover" role="tooltip"><button type="button" id="oxfl-popover-close" class="oxfl-close"><span>&times;</span></button><div class="oxfl-popover-inner"><div class="popover-content"></div></div></div>',
		container: 'body'
	});

	$('body').on('click', '#oxfl-popover-close', function(e) {
		$('.oxfl-js-popover, .slider-control.not-allowed').popover('hide');
	});

	$('.oxfl-js-popover').on('click', function(e) {
		$('.oxfl-js-popover').not(this).popover('hide');
	});

	$(document).click(function(event) {
		if(!$(event.target).closest('.oxfl-popover').length && !$(event.target).closest('.oxfl-js-popover').length  && !$(event.target).closest('.slider-control.not-allowed').length) {
			if($('.oxfl-popover').is(":visible")) {
				$('.oxfl-js-popover').popover('hide');
			}
		}
	});

}

oxfordFlippedApp.getScrollBarWidth = function() {
	var inner = document.createElement('p');
	inner.style.width = "100%";
	inner.style.height = "200px";

	var outer = document.createElement('div');
	outer.style.position = "absolute";
	outer.style.top = "0px";
	outer.style.left = "0px";
	outer.style.visibility = "hidden";
	outer.style.width = "200px";
	outer.style.height = "150px";
	outer.style.overflow = "hidden";
	outer.appendChild(inner);

	document.body.appendChild(outer);
	var w1 = inner.offsetWidth;
	outer.style.overflow = 'scroll';
	var w2 = inner.offsetWidth;

	if (w1 == w2) {
		w2 = outer.clientWidth;
	}

	document.body.removeChild(outer);

	return (w1 - w2);
}


oxfordFlippedApp.getParameterByHash = function(name, url) {
	if (!url) url = window.location.href;
	name = name.replace(/[\[\]]/g, "\\$&");
	var regex = new RegExp("[#&]" + name + "(=([^&#]*)|&|#|$)"),
			results = regex.exec(url);
	if (!results) return null;
	if (!results[2]) return '';
	return decodeURIComponent(results[2].replace(/\+/g, " "));
}

oxfordFlippedApp.removeUnusedClass = function(currentClass) {

	var possibleClasses = oxfordFlippedApp.config.bodyClasses.slice(0),
			index = possibleClasses.indexOf(currentClass);

	possibleClasses.splice(index, 1);

	var $body = $('body');
	$.each(possibleClasses, function(i, v){
		$body.removeClass(v);
	});

}

oxfordFlippedApp.gradeToStars = function(grade) {
	// De 0-50 = 0 estrellas; De 51-70 = 1 estrella; De 71-99 = 2 estrellas; 100 = 3 estrellas
	var totalStars = 0;
	if (grade > oxfordFlippedApp.config.minGrade && grade <= oxfordFlippedApp.config.oneStarGradeMax) {
		totalStars = 1;
	} else if (grade > oxfordFlippedApp.config.oneStarGradeMax && grade <= oxfordFlippedApp.config.twoStarsGradeMax) {
		totalStars = 2;
	} else if (grade > oxfordFlippedApp.config.twoStarsGradeMax) {
		totalStars = 3;
	}

	return totalStars;

}

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

oxfordFlippedApp.hashDistributor = function(currentHash,data,updateHash) {

	if (currentHash === oxfordFlippedApp.config.tree[0].hash) { //Home

		oxfordFlippedApp.homepage(data,updateHash);

	} else if (currentHash === oxfordFlippedApp.config.tree[1].hash) { // Episodes / Units

		oxfordFlippedApp.loadEpisodes(data,updateHash);

	} else if (currentHash.startsWith(oxfordFlippedApp.config.tree[2].hash)) { // Unit and ID

		// This works different because we need an ID to load the Units / Chapters
		var oxflunit = currentHash.replace(oxfordFlippedApp.config.tree[2].hash, '');
		if (oxflunit !== '' && oxflunit !== null) {
			var currentEpisode = oxflunit,
					activities = window.actividades;
			oxfordFlippedApp.loadChapters(data,currentEpisode,activities,updateHash);

		} else {

			oxfordFlippedApp.console("Not Unit ID given, redirecting to Units");
			window.location.hash = '';
			oxfordFlippedApp.loadEpisodes(data,updateHash);

		}

	} else if (currentHash === oxfordFlippedApp.config.tree[3].hash) { // Marketplace

		oxfordFlippedApp.loadMarketplace(updateHash);

	} else if (currentHash === oxfordFlippedApp.config.tree[4].hash) { // Games in Marketplace

		oxfordFlippedApp.loadMarketplaceList(data,oxfordFlippedApp.config.marketplaceType1,4,updateHash);

	} else if (currentHash === oxfordFlippedApp.config.tree[5].hash) { // Summaries in Marketplace

		oxfordFlippedApp.loadMarketplaceList(data,oxfordFlippedApp.config.marketplaceType2,6,updateHash);

	} else if (currentHash === oxfordFlippedApp.config.tree[6].hash) { // GradeBook (Not implemented)

		console.log("Load Gradebook")

	} else { // Incorrect hash

		oxfordFlippedApp.console("Incorrect hash, redirecting to HOME");
		window.location.hash = '';
		oxfordFlippedApp.homepage(data,updateHash);

	}

}

oxfordFlippedApp.loadByHash = function(currentHash,data) {
	
  var currentHash = currentHash.replace('#',''),
			updateHash = false;

	oxfordFlippedApp.hashDistributor(currentHash, data, updateHash);

}

oxfordFlippedApp.onChangeHash = function() {

	var currentHash = window.location.hash.replace('#',''),
			data = oxfordFlippedApp.bookData,
			updateHash = false;

	$(oxfordFlippedApp.config.buttonGoBack).removeClass('disabled');

	oxfordFlippedApp.hashDistributor(currentHash, data, updateHash);

}

window.addEventListener("hashchange", oxfordFlippedApp.onChangeHash, false);


oxfordFlippedApp.changeBackground = function(image) {

	var $nextBackgroundWrapper = $(oxfordFlippedApp.config.backgroundWrapper).children('div:not(.active):first');

	$nextBackgroundWrapper.css('background-image', 'url('+image+')');

	$nextBackgroundWrapper.imagesLoaded({background: 'div, a, span, button'}, function(){
		$nextBackgroundWrapper.addClass('active').siblings().removeClass('active');
	});

}

oxfordFlippedApp.homepage = function(data,updateHash) {

	oxfordFlippedApp.console("Homepage");
  var currentIndex = 0;
	var currentPage = oxfordFlippedApp.config.tree[currentIndex].id,
			bodyClass = oxfordFlippedApp.config.tree[currentIndex].class,
			hash = oxfordFlippedApp.config.tree[currentIndex].hash,
			currentHash = window.location.hash;
			currentHash = currentHash.replace('#','');
			//marketplaceHash = oxfordFlippedApp.config.tree['marketplace'].hash,
			//isMarketplace = oxfordFlippedApp.getParameterByHash(marketplaceHash);

	var backgroundImage = data.units[0].subunits[0].image;
	//oxfordFlippedApp.removeQString('ounit');

	if (oxfordFlippedApp.config.firstTime) {

		oxfordFlippedApp.config.isStudent = blink.user.esAlumno();

		oxfordFlippedApp.bookData = data;

		var bookTitle = data.title,
				username = nombreusuario,
				totalCoins = blink.activity.currentStyle.userCoins ? blink.activity.currentStyle.userCoins : 0; //TODO PROBAR A VER SI FUNCIONA

		var html = '<div id="oxfl-general"><div id="oxfl-custom-background"><div id="oxfl-custom-background-inner-1"></div> <div id="oxfl-custom-background-inner-2"></div> </div>  <div id="oxfl-home-title"><div><div class="oxfl-title5">'+oxfordFlippedApp.text.text1+'</div><h1 class="oxfl-title1">'+bookTitle+'</h1></div></div>  <div id="oxfl-general-buttons"><button class="oxfl-button-icon oxfl-button-icon-home oxfl-js-gohome"> <span>'+oxfordFlippedApp.text.buttonhome+'</span> </button> <button class="oxfl-button-icon oxfl-button-icon-info oxfl-js-open-info" style="display: none"> <span>'+oxfordFlippedApp.text.buttoninfo+'</span> </button> <button class="oxfl-button-icon oxfl-button-icon-marketplace oxfl-js-load-marketplace"> <span>'+oxfordFlippedApp.text.buttonmarketplace+'</span> </button> <button class="oxfl-button oxfl-button-icon oxfl-button-icon-goback oxfl-js-goback disabled" data-goback=""> <span>'+oxfordFlippedApp.text.buttongoback+'</span></button></div><div id="oxfl-coins"><div id="oxfl-coins-icon"></div><div id="oxfl-coins-total">'+totalCoins+'</div></div><button id="oxfl-notifications" class="oxfl-js-open-notifications"><div class="oxfl-notifications-badge"></div></button><div id="oxfl-home-menu"><div id="oxfl-home-menu-inner" class="oxfl-container"><div class="oxfl-home-menu-item"><button class="oxfl-monster oxfl-monster-1" id="oxfl-goto-gradebook"><span>'+oxfordFlippedApp.text.buttongradebook+'</span></button></div><div class="oxfl-home-menu-item"><button class="oxfl-monster oxfl-monster-2 oxfl-js-load-episodes" id="oxfl-goto-prepare"><span>'+oxfordFlippedApp.text.buttonprepare+'</span></button></div><div class="oxfl-home-menu-item"><button class="oxfl-monster oxfl-monster-3 oxfl-js-load-marketplace" id="oxfl-goto-marketplace"><span>'+oxfordFlippedApp.text.buttonmarketplace+'</span></button><div class="oxfl-bubble-hello"><div class="oxfl-bubble-hello-inner"><span class="oxfl-bubble-hello-text">'+oxfordFlippedApp.text.hello+' </span><span class="oxfl-bubble-hello-name">'+username+'</span></div></div></div></div></div><div id="oxfl-episodes-wrapper"> <div id="oxfl-episodes-monster" class="oxfl-monster oxfl-monster-4"><span>'+oxfordFlippedApp.text.selectepidose+'</span></div> <div id="oxfl-episodes"></div> </div> <div id="oxfl-chapters-wrapper"> <div id="oxfl-chapters-monster" class="oxfl-monster oxfl-monster-5"></div> <div id="oxfl-chapters"></div> </div> <div id="oxfl-marketplace-wrapper"><div id="oxfl-marketplace-menu"> <div id="oxfl-marketplace-menu-inner"> <button class="oxfl-marketplace-menu-button oxfl-marketplace-menu-button-1 oxfl-js-load-game"> <span class="oxfl-marketplace-menu-button-monster"></span> <span class="oxfl-marketplace-menu-button-bubble">'+oxfordFlippedApp.text.buygame+'</span> </button> <button class="oxfl-marketplace-menu-button oxfl-marketplace-menu-button-2 oxfl-js-load-summary"> <span class="oxfl-marketplace-menu-button-monster"></span> <span class="oxfl-marketplace-menu-button-bubble">'+oxfordFlippedApp.text.buysummary+'</span> </button> </div> </div> </div> <div id="oxfl-resources-game-wrapper"> <div id="oxfl-resources-game-monster"> <div class="oxfl-resources-game-monster-bubble"><span>'+oxfordFlippedApp.text.choosegame+'</span></div> </div> <div id="oxfl-resources-game" class="oxfl-resources-container"> </div> </div> <div id="oxfl-resources-summary-wrapper"> <div id="oxfl-resources-summary-monster"> <div class="oxfl-resources-summary-monster-bubble"><span>'+oxfordFlippedApp.text.chooseshorcut+'</span></div> </div> <div id="oxfl-resources-summary" class="oxfl-resources-container"> </div> </div> </div><div class="modal fade oxfl-modal" id="oxfl-modal-lock-chapters" tabindex="-1" role="dialog" aria-hidden="true"> <div class="modal-dialog modal-dialog-centered" role="document"> <div class="modal-content"> <div class="modal-header"> <button type="button" class="close" data-dismiss="modal" aria-label="Close"> <span aria-hidden="true">&times;</span> </button> </div> <div class="modal-body"> <p>'+oxfordFlippedApp.text.modalLock+'</p> </div> <div class="modal-footer"><div class="modal-footer-inner"> <button type="button" class="btn btn-secondary" data-dismiss="modal">'+oxfordFlippedApp.text.no+'</button> <button type="button" class="btn btn-primary oxfl-js-toggle-lock-chapter">'+oxfordFlippedApp.text.yes+'</button> </div> </div></div> </div></div> <div class="modal fade oxfl-modal oxfl-modal-2" id="oxfl-modal-list-notifications" tabindex="-1" role="dialog" aria-hidden="true"> <div class="modal-dialog modal-dialog-centered" role="document"> <div class="modal-content"> <div class="modal-header"> <div class="oxfl-title3">'+oxfordFlippedApp.text.titleNotif+'</div> <button type="button" class="close" data-dismiss="modal" aria-label="Close"> <span aria-hidden="true">&times;</span> </button> </div> <div class="modal-body"> <div id="oxfl-notifications-list"></div> </div> </div></div> </div> <div class="modal fade oxfl-modal oxfl-modal-3 oxfl-modal-marketplace-noconnection" id="oxfl-modal-marketplace-noconnection" tabindex="-1" role="dialog" aria-hidden="true"> <div class="modal-dialog modal-dialog-centered" role="document"> <div class="modal-content"> <div class="modal-header"> <button type="button" class="close" data-dismiss="modal" aria-label="Close"> <span aria-hidden="true">&times;</span> </button> </div> <div class="modal-body"> <p>'+oxfordFlippedApp.text.noconnection+'</p> </div> <div class="modal-footer"> <div class="modal-footer-inner"> <button type="button" class="btn btn-primary" data-dismiss="modal">'+oxfordFlippedApp.text.ok+'</button> </div> </div> </div> </div> </div> <div class="modal fade oxfl-modal oxfl-modal-3 oxfl-modal-marketplace-nocoins" id="oxfl-modal-marketplace-nocoins" tabindex="-1" role="dialog" aria-hidden="true"> <div class="modal-dialog modal-dialog-centered" role="document"> <div class="modal-content"> <div class="modal-header"> <button type="button" class="close" data-dismiss="modal" aria-label="Close"> <span aria-hidden="true">&times;</span> </button> </div> <div class="modal-body"> <p>'+oxfordFlippedApp.text.gamificacion_monedas_insuficientes+'</p> </div> <div class="modal-footer"> <div class="modal-footer-inner"> <button type="button" class="btn btn-primary" data-dismiss="modal">'+oxfordFlippedApp.text.ok+'</button> </div> </div> </div> </div> </div> <div class="modal fade oxfl-modal oxfl-modal-4 oxfl-modal-marketplace-info" id="oxfl-modal-marketplace-info" tabindex="-1" role="dialog" aria-hidden="true"> <div class="modal-dialog modal-dialog-centered" role="document"> <div class="modal-content"> <div class="modal-header"> <button type="button" class="close" data-dismiss="modal" aria-label="Close"> <span aria-hidden="true">&times;</span> </button> </div> <div class="modal-body"> <div class="oxfl-title2b" id="oxfl-modal-marketplace-info-title"></div> <p id="oxfl-modal-marketplace-info-description"></p> </div> <div class="modal-footer"> <div class="modal-footer-inner"> <div class="oxfl-strip"> <div class="oxfl-strip-inner"> <span id="oxfl-modal-marketplace-info-coin"></span> <span class="oxfl-icon oxfl-icon-coin"></span> </div> </div> <button type="button" class="btn btn-primary oxfl-js-buy-resource" data-marketplace-id data-dismiss="modal">'+oxfordFlippedApp.text.buy+'</button> </div> </div> </div> </div> </div>';

		$('body').prepend(html);

		oxfordFlippedApp.changeBackground(backgroundImage);

		$.each(data.units[0].subunits, function(i, subunit){
			var unitTitle = subunit.title,
					unitIsInfo = (subunit.title === oxfordFlippedApp.config.nameActivityInfo);
			if (unitIsInfo) {
				$('.oxfl-js-open-info').show().attr('onclick', subunit.onclickTitle);
			}
		});

		var elements = $('.oxfl-bubble-hello-name');
		oxfordFlippedApp.fontSizeResize(elements);

		var userBodyClass = (oxfordFlippedApp.config.isStudent) ? 'oxfl-body-user-student' : 'oxfl-body-user-not-student';

		// Notifications
		if (oxfordFlippedApp.config.isStudent) {
			oxfordFlippedApp.loadNotifications(oxfordFlippedApp.bookData);
		}

		$('body').on('click', '.oxfl-js-load-episodes', function() {
			var updateHash = true;
			oxfordFlippedApp.loadEpisodes(data,updateHash);
		});

		$('body').on('click', '.oxfl-js-load-marketplace', function() {
			var updateHash = true;
			oxfordFlippedApp.loadMarketplace(data,updateHash);
		});

		$('#iframe_div').find('.btn-close-iframe a').attr('onclick', 'oxfordFlippedApp.modalCloseIframe();');

		var modalHTML =	'<div class="modal fade oxfl-modal" id="oxfl-modal-close-chapter" tabindex="-1" role="dialog" aria-hidden="true"> <div class="modal-dialog modal-dialog-centered" role="document"> <div class="modal-content"> <div class="modal-header"> <button type="button" class="close" data-dismiss="modal" aria-label="Close"> <span aria-hidden="true">&times;</span> </button> </div> <div class="modal-body"> <p>'+oxfordFlippedApp.text.oxfordFlipped_lost_progress_alert+'</p> </div> <div class="modal-footer"><div class="modal-footer-inner"> <button type="button" class="btn btn-secondary" data-dismiss="modal">'+oxfordFlippedApp.text.no+'</button> <button type="button" class="btn btn-primary" onclick="oxfordFlippedApp.closeIframe();">'+oxfordFlippedApp.text.yes+'</button> </div> </div></div> </div>';

		$('body').prepend(modalHTML);

		$('body').imagesLoaded({background: 'div, a, span, button'}, function(){
			$('html').addClass('htmlReady');
			$('body').addClass(userBodyClass);
			if (currentHash !== '' && currentHash !== hash) {
				oxfordFlippedApp.loadByHash(currentHash,data);
			} else {
				$('body').addClass(bodyClass);
				oxfordFlippedApp.removeUnusedClass(bodyClass);

				if (updateHash) window.location.hash = hash;
			}

		});

		oxfordFlippedApp.config.firstTime = false;

	} else {
		console.log("Ya cargado");
		console.log(currentHash);
		if (currentHash !== '' && currentHash !== hash) {
			oxfordFlippedApp.loadByHash(currentHash,data);
		} else {
			oxfordFlippedApp.changeBackground(backgroundImage);
			$('body').addClass(bodyClass);
			oxfordFlippedApp.removeUnusedClass(bodyClass);
			if (updateHash) window.location.hash = hash;
		}
	}

}

oxfordFlippedApp.loadEpisodes = function(data,updateHash) {

	oxfordFlippedApp.console("Load Unit List");
	oxfordFlippedApp.console(data);

	var backgroundImage = data.units[0].subunits[0].image; // Right now is the same as Homepage
	oxfordFlippedApp.changeBackground(backgroundImage);

	var unitList = document.createDocumentFragment();
	$.each(data.units, function(i, unit){

		if (i != oxfordFlippedApp.config.ConfigActivityIndex) {
			var unitTitle = unit.title,
					unitDescription = unit.description,
					unitNumber = i,
					unitImage = unit.image,
					unitListItem = document.createElement('div'),
					unitIsMarketplace = (unit.title === 'Marketplace');
			unitListItem.className = 'oxfl-episodes-item';
			if (!unitIsMarketplace) {
				unitListItem.innerHTML = '<article class="oxfl-episode"> <a href="javascript:void(0)" class="oxfl-js-load-chapters" data-episode="'+i+'"> <h2 class="oxfl-title2">'+unitTitle+'</h2> <h3 class="oxfl-title4">'+unitDescription+'</h3> <div class="oxfl-episode-image-wrapper"> <img src="'+unitImage+'" alt="'+unitTitle+'"> </div> </a> </article>';
				unitList.appendChild(unitListItem);
			}
		}
	});

	var $episodesWrapper = $('#oxfl-episodes');

	if ($episodesWrapper.hasClass('slick-initialized')) {
		$episodesWrapper.slick('unslick');
	}
	$episodesWrapper.empty();
	$episodesWrapper[0].appendChild(unitList);

	var items = $('#oxfl-episodes').find('.oxfl-episodes-item'),
			itemsLength = items.length;
	for(var i = 0; i < itemsLength; i+=4) {
		items.slice(i, i+4).wrapAll('<div class="oxfl-episodes-page"></div>');
	}


	$('#oxfl-episodes').slick(oxfordFlippedApp.config.carouselOpt);

	var currentIndex = 1;
	var currentPage = oxfordFlippedApp.config.tree[currentIndex].id,
			bodyClass = oxfordFlippedApp.config.tree[currentIndex].class,
			hash = oxfordFlippedApp.config.tree[currentIndex].hash;

	oxfordFlippedApp.removeUnusedClass(bodyClass);

	$('#oxfl-episodes-wrapper').imagesLoaded({background: 'div, a, span, button'}, function(){
		if (updateHash) window.location.hash = hash;
		$('body').addClass(bodyClass);
	});

	$('body').on('click', '.oxfl-js-load-chapters', function() {
		var currentEpisode = $(this).data('episode'),
				activities = window.actividades,
				updateHash = true;
		oxfordFlippedApp.loadChapters(data,currentEpisode,activities,updateHash);
	});
}


oxfordFlippedApp.loadNotifications = function(data) {

	var notificationsList = document.createDocumentFragment();

	var totalNotif = 0;
	$.each(data.units, function(i, unit){
		if (i != oxfordFlippedApp.config.ConfigActivityIndex) {
			var chapters = unit.subunits;
			$.each(chapters, function(x, chapter){
				//Lock Chapters
				var chapterLockStatus = chapter.lock;
				// Buscar todas las actividades - chapters - que están abiertas (NO lock)
				if (chapterLockStatus != oxfordFlippedApp.config.statusLock1 && chapterLockStatus != oxfordFlippedApp.config.statusLock2) {
					// Comprobar que esas actividades NO estan en el json de actividades (no están empezadas o completadas)
					if (typeof window.actividades[chapter.id] === 'undefined') {
						var notifChapterTag = chapter.tag;
						if (notifChapterTag != oxfordFlippedApp.config.tagMarketplace) {
							totalNotif++;
							var notificationsListItem = document.createElement('div');
							var notifEpisodeTitle = unit.title,
									notifChapterTitle = chapter.title,
									notifChapterDescription = chapter.description,
									notifChapterID = chapter.id;
							notificationsListItem.className = 'oxfl-notification-item';
							notificationsListItem.innerHTML = '<div><h3 class="oxfl-title3">'+notifEpisodeTitle+'</h3></div><div class="oxfl-notification-item-chapter">'+notifChapterTitle+'.</div><div class="oxfl-notification-item-chapter-description">'+notifChapterDescription+'</div><div><button class="oxfl-button-bubble oxfl-button-bubble-4 oxfl-js-load-chapter" data-chapter-id="'+notifChapterID+'">'+oxfordFlippedApp.text.start+'</button></div>';
							notificationsList.appendChild(notificationsListItem);
						}

					}
				}
			});
		}
	});
	if (totalNotif > 0) {
		// Pintar MODAL con el Episode al que pertenecen junto con su título y un botón de abrir actividad. A concretar si tiene fecha
		var $notifWrapper = $('#oxfl-notifications-list');
		$notifWrapper[0].appendChild(notificationsList);
		$('#oxfl-notifications').addClass('active').find('.oxfl-notifications-badge').text(totalNotif);
		// Si abres actividad, el botón cierra modal y abre activdad. A concretar si tiene que desaparecer de notificaciones
		// PENDIENTE
	}

}


oxfordFlippedApp.marginBottomMonsterChapters = function() {
		var $monster = $('#oxfl-chapters-monster'),
				marginBottom = -143, // Margin bottom init
				height = 370, //Height init
				newHeight = $monster.outerHeight(),
				newMarginBottom = newHeight*marginBottom/height;

		$monster.css('margin-bottom', newMarginBottom);

}

oxfordFlippedApp.loadChapters = function(data,currentEpisode,activities,updateHash) {

	oxfordFlippedApp.console("Load Chapters List");

	var chapters = data.units[currentEpisode].subunits,
			episodeImage =  data.units[currentEpisode].image,
			chaptersList = document.createDocumentFragment();

	var chaptersNotStarted = false,
			chaptersWithoutGrade = false;

	$.each(chapters, function(i, chapter){

		var chapterID = chapter.id,
				chapterTitle = chapter.title,
				chapterTag = chapter.tag,
				chapterDescription = chapter.description,
				chapterImage = chapter.image,
				chapterImageCode = (chapterImage != '') ? '<img src="'+chapterImage+'" alt="'+chapterTitle+'">' : '',
				chapterIsChallenge = (chapterTitle === 'Challenge'),
				chapterIsMarketplace = (chapterTag === oxfordFlippedApp.config.tagMarketplace);

		//Stars
		var grade = (typeof activities[chapterID] === 'undefined') ? 0 : parseInt(activities[chapterID].clasificacion),
				chapterStars = (typeof activities[chapterID] === 'undefined') ? 0 : oxfordFlippedApp.gradeToStars(grade);

		if (!chapterIsMarketplace) {
			// Regular Chapters
			if (!chapterIsChallenge) {

				// Activities not started
				if (typeof activities[chapterID] === 'undefined') {
					chaptersNotStarted = true;
				} else {
				// Activities started or completed
					if (activities[chapterID].clasificacion === '') {
						chaptersWithoutGrade = true;
					}
				}

				//State 0: Started; State 1: Completed. New if the ID doesnt appear in array (associated 2 in the code)
				var chapterStateTextArr = [oxfordFlippedApp.text.chapterStatus0, oxfordFlippedApp.text.chapterStatus1, oxfordFlippedApp.text.chapterStatus2],
						chapterStateID = (typeof activities[chapterID] === 'undefined') ? 2 : activities[chapterID].estado,
						chapterStateText =  chapterStateTextArr[chapterStateID];

				//Lock Chapters
				var chapterLockStatus = chapter.lock,
						chapterLockClass = (chapterLockStatus === oxfordFlippedApp.config.statusLock1 || chapterLockStatus === oxfordFlippedApp.config.statusLock2) ? 'lock' : 'unlock';

				var chapterNumber = i + 1,
						chapterActions = (oxfordFlippedApp.config.isStudent) ? '<ul class="oxfl-stars oxfl-stars-filled-'+chapterStars+'"><li class="oxfl-star-item"><span></span></li><li class="oxfl-star-item"><span></span></li><li class="oxfl-star-item"><span></span></li></ul>' : '<button class="oxfl-button oxfl-button-lock oxfl-js-modal-lock-chapter '+chapterLockClass+'"></button>',
						chapterPopoverText = oxfordFlippedApp.text.oxfordFlipped_no_access_alert,
						chapterUrlHTML = (oxfordFlippedApp.config.isStudent && (chapterLockStatus === oxfordFlippedApp.config.statusLock1 || chapterLockStatus === oxfordFlippedApp.config.statusLock2)) ? 'class="oxfl-js-popover" data-toggle="popover" title="" data-content="'+chapterPopoverText+'"' : 'class="oxfl-js-load-chapter" data-chapter-id="'+chapterID+'"',
						chapterinnerHTML = (oxfordFlippedApp.config.isStudent) ? '<article class="oxfl-chapter '+chapterLockClass+'" data-id="'+chapterID+'"> <a href="javascript:void(0)" '+chapterUrlHTML+'> <div class="oxfl-chapter-header"> <div class="oxfl-chapter-header-top"> <h2 class="oxfl-title3"> '+chapterTitle+' </h2> <div class="oxfl-chapter-header-top-right">'+chapterActions+'</div> </div> <h3 class="oxfl-title4">'+chapterDescription+'</h3> </div> <div class="oxfl-chapter-image-wrapper"> <div class="oxfl-label oxfl-label-'+chapterStateID+'">'+chapterStateText+'</div> '+chapterImageCode+' </div> </a> </article>' : '<article class="oxfl-chapter '+chapterLockClass+'" data-id="'+chapterID+'"> <div class="oxfl-chapter-header"> <div class="oxfl-chapter-header-top"> <h2 class="oxfl-title3"> <a href="javascript:void(0)" '+chapterUrlHTML+'> '+chapterTitle+' </a> </h2> <div class="oxfl-chapter-header-top-right">'+chapterActions+'</div> </div> <h3 class="oxfl-title4"><a href="javascript:void(0)" '+chapterUrlHTML+'>'+chapterDescription+'</a></h3> </div> <a href="javascript:void(0)" '+chapterUrlHTML+'> <div class="oxfl-chapter-image-wrapper"> <div class="oxfl-label oxfl-label-'+chapterStateID+'">'+chapterStateText+'</div> '+chapterImageCode+' </div> </a> </article>';

			} else { // Challenge Chapter

				var isChallengeLock = ((chaptersNotStarted || chaptersWithoutGrade) && oxfordFlippedApp.config.isStudent) ? true : false,
						challengeLockClass = (isChallengeLock) ? 'lock' : 'unlock';
				var chapterActions = (oxfordFlippedApp.config.isStudent) ? '<ul class="oxfl-stars oxfl-stars-filled-'+chapterStars+'"><li class="oxfl-star-item"><span></span></li><li class="oxfl-star-item"><span></span></li><li class="oxfl-star-item"><span></span></li></ul>' : '',
						chapterPopoverText = oxfordFlippedApp.text.oxfordFlipped_no_complete_alert,
						chapterUrlHTML = (oxfordFlippedApp.config.isStudent && isChallengeLock) ? 'class="oxfl-js-popover" data-toggle="popover" title="" data-content="'+chapterPopoverText+'"' : 'class="oxfl-js-load-chapter" data-chapter-id="'+chapterID+'"',
						chapterinnerHTML = '<article class="oxfl-chapter oxfl-chapter-challenge '+challengeLockClass+'" data-id="'+chapterID+'"><a href="javascript:void(0)" '+chapterUrlHTML+'> <div class="oxfl-chapter-header"> <div class="oxfl-chapter-header-top"> <div class="oxfl-chapter-header-top-right">'+chapterActions+'</div> </div> </div>  <div class="oxfl-chapter-image-wrapper"> '+chapterImageCode+' </div> <h2 class="oxfl-title3"> <a href="javascript:void(0)" '+chapterUrlHTML+'>'+chapterTitle+'</h2></a> </article>';
			}
			var chapterListItem = document.createElement('div');

			chapterListItem.className = 'oxfl-chapter-item';
			chapterListItem.innerHTML = chapterinnerHTML;
			chaptersList.appendChild(chapterListItem);
		}

	});

	var $chaptersWrapper = $('#oxfl-chapters');

	if ($chaptersWrapper.hasClass('slick-initialized')) {
		$chaptersWrapper.slick('unslick');
	}
	$chaptersWrapper.empty();
	$chaptersWrapper[0].appendChild(chaptersList);

	var items = $chaptersWrapper.find('.oxfl-chapter-item'),
			itemsLength = items.length;
	if (itemsLength) {
		for(var i = 0; i < itemsLength; i+=6) {
			items.slice(i, i+6).wrapAll('<div class="oxfl-chapters-page"></div>');
		}

		$chaptersWrapper.slick(oxfordFlippedApp.config.carouselOpt);
	}
	oxfordFlippedApp.changeBackground(episodeImage);

	var currentIndex = 2;
	var currentPage = oxfordFlippedApp.config.tree[currentIndex].id,
			bodyClass = oxfordFlippedApp.config.tree[currentIndex].class,
			hash = oxfordFlippedApp.config.tree[currentIndex].hash,
			hashWithID = hash+currentEpisode;

	oxfordFlippedApp.removeUnusedClass(bodyClass);

	$('body').removeClass('oxfl-body-episodes');

	$('#oxfl-chapters-wrapper').imagesLoaded({background: 'div, a, span, button'}, function(){
		$('body').addClass(bodyClass);
		if (updateHash) window.location.hash = hashWithID;
	});

	// Popovers
	oxfordFlippedApp.popover();

	// Monster margin bottom
	oxfordFlippedApp.marginBottomMonsterChapters();

	$(window).resize(function() {
		oxfordFlippedApp.marginBottomMonsterChapters();
	});

}
oxfordFlippedApp.loadMarketplaceList = function(data,type,itemperpage,updateHash) {

		var resourceList = document.createDocumentFragment(),
				activityHTML = 'actividad';

		var currentIndex = (type === oxfordFlippedApp.config.marketplaceType1) ? 4 : 5;
		var currentPage = oxfordFlippedApp.config.tree[currentIndex].id,
				bodyClass = oxfordFlippedApp.config.tree[currentIndex].class,
				hash = oxfordFlippedApp.config.tree[currentIndex].hash;


		$.each(data.units, function(i, unit){

			if (i != oxfordFlippedApp.config.ConfigActivityIndex) {
				var subunits = unit.subunits;

				$.each(subunits, function(x, resource){
					if (resource.tag === oxfordFlippedApp.config.tagMarketplace) {
						var resourceType = resource.type;
							if ((type === oxfordFlippedApp.config.marketplaceType1 && resourceType === activityHTML) || (type === oxfordFlippedApp.config.marketplaceType2 && resourceType !== activityHTML)) {
								var resourceTitle = resource.title,
										resourceDescription = resource.description,
										resourceValue = resource.game_token,
										resourceImage = (resource.image !== '') ? '<img src="'+resource.image+'" alt="'+resourceTitle+'">' : '',
										resourceId = resource.id,
										resourceurl = resource.url,
										resourceStateNew = (typeof window.actividades[resourceId] === 'undefined'),
										resourceStateClass = (oxfordFlippedApp.config.isStudent && resourceStateNew) ? 'oxfl-resource-locked' : '',
										resourceOnClick = (!oxfordFlippedApp.config.isStudent || (oxfordFlippedApp.config.isStudent && !resourceStateNew)) ? resource.onclickTitle : "oxfordFlippedApp.oxflMarketplaceModal("+resourceValue+", '"+resourceTitle+"', '"+resourceDescription+"',"+resourceId+")",
										resourceListItem = document.createElement('div');
										resourceListItem.className = 'oxfl-resource-item';

								resourceListItem.innerHTML = '<article class="oxfl-resource '+resourceStateClass+'"> <a href="javascript:void(0)" class="oxfl-js-load-resource" data-resource-id="'+resourceId+'" onclick="'+resourceOnClick+'" ><header class="oxfl-resource-header"> <h2 class="oxfl-title4">'+resourceTitle+'</h2><div class="oxfl-resource-coins"><span>'+resourceValue+'</span><span class="oxfl-icon oxfl-icon-coin"></span></div></header> <div class="oxfl-resource-image-wrapper"> '+resourceImage+' </div> </a> </article>';
								resourceList.appendChild(resourceListItem);
							}
					}
				});
			}
		});

		var $resourceWrapper = $('#oxfl-resources-'+type);

		if ($resourceWrapper.hasClass('slick-initialized')) {
			$resourceWrapper.slick('unslick');
		}
		$resourceWrapper.empty();
		$resourceWrapper[0].appendChild(resourceList);

		var items = $resourceWrapper.find('.oxfl-resource-item'),
				itemsLength = items.length;
		for(var i = 0; i < itemsLength; i+=itemperpage) {
			items.slice(i, i+itemperpage).wrapAll('<div class="oxfl-resources-page oxfl-resources-page-ipp-'+itemperpage+'"></div>');
		}

		$resourceWrapper.slick(oxfordFlippedApp.config.carouselOpt);

		oxfordFlippedApp.removeUnusedClass(bodyClass);

		var marketplaceBackground = oxfordFlippedApp.bookData.units[0].subunits[1].image;
		oxfordFlippedApp.changeBackground(marketplaceBackground);

		$resourceWrapper.imagesLoaded({background: 'div, a, span, button'}, function(){
			$('body').addClass(bodyClass);
			if (updateHash) window.location.hash = hash;
		});
}

oxfordFlippedApp.loadMarketplace = function(updateHash) {

	oxfordFlippedApp.console("Load Marketplace");

	var currentIndex = 3;
	var currentPage = oxfordFlippedApp.config.tree[currentIndex].id,
			bodyClass = oxfordFlippedApp.config.tree[currentIndex].class,
			hash = oxfordFlippedApp.config.tree[currentIndex].hash;

	var marketplaceBackground = oxfordFlippedApp.bookData.units[0].subunits[1].image;
	oxfordFlippedApp.changeBackground(marketplaceBackground);

	oxfordFlippedApp.removeUnusedClass(bodyClass);

	$('#oxfl-marketplace-wrapper').imagesLoaded({background: 'div, a, span, button'}, function(){

		$('body').addClass(bodyClass);
		if (updateHash) window.location.hash = hash;
	});

	// Click on buttons

	$('body').on('click', '.oxfl-js-load-summary' , function() {
		oxfordFlippedApp.console(oxfordFlippedApp.bookData);
		var updateHash = true;
		oxfordFlippedApp.loadMarketplaceList(oxfordFlippedApp.bookData,oxfordFlippedApp.config.marketplaceType2,6,updateHash);
	});

	$('body').on('click', '.oxfl-js-load-game' , function() {
		oxfordFlippedApp.console(oxfordFlippedApp.bookData);
		var updateHash = true;
		oxfordFlippedApp.loadMarketplaceList(oxfordFlippedApp.bookData,oxfordFlippedApp.config.marketplaceType1,4,updateHash);
	});

}

oxfordFlippedApp.updateMarketplaceList = function(activityId) {

	var idTema = window.actividades[activityId].idtema;
	$.each(oxfordFlippedApp.bookData.units[idTema].subunits, function(i, subunit) {
		if (subunit.id === activityId) {
			$('[data-resource-id="'+id+'"]').attr('onclick', subunit.onclickTitle).closest('.oxfl-resource').removeClass('oxfl-resource-locked');
			return false;
		}
	});

}

oxfordFlippedApp.updateUserData = function() {
	var chaptersNotStarted = false,
			chaptersWithoutGrade = false;

	$('.oxfl-chapter').each(function(i,e) {
		var dataChapterId = $(e).attr('data-id'),
				dataChapter = window.actividades[dataChapterId];

		if (typeof dataChapter !== 'undefined') {

			var newState = dataChapter.estado,
					newGrade = dataChapter.clasificacion,
					newStars = oxfordFlippedApp.gradeToStars(newGrade);

			$(e).find('.oxfl-stars').removeClass('oxfl-stars-filled-0 oxfl-stars-filled-1 oxfl-stars-filled-2 oxfl-stars-filled-3').addClass('oxfl-stars-filled-'+newStars);

			//State 0: Started; State 1: Completed. New if the ID doesnt appear in array (associated 2 in the code)
			var chapterStateTextArr = [oxfordFlippedApp.text.chapterStatus0, oxfordFlippedApp.text.chapterStatus1, oxfordFlippedApp.text.chapterStatus2],
					chapterStateID = newState,
					chapterStateText =  chapterStateTextArr[chapterStateID];
			console.log(chapterStateText);
			$(e).find('oxfl-label').removeClass('oxfl-label-0 oxfl-label-1 oxfl-label-2').addClass('oxfl-label-'+chapterStateID).text(chapterStateText);

			if (newGrade === '') {
				chaptersWithoutGrade = true;
			}
		} else {
			chaptersNotStarted = true;
		}

		if (!chaptersNotStarted && !chaptersWithoutGrade) {
			// Challenge is open
			var $challengeLink = $('.oxfl-chapter-challenge').children('a'),
					innerHTML = $challengeLink.html(),
					newLink = 'class="oxfl-js-load-chapter" data-chapter-id="'+dataChapterId+'"';
			$('.oxfl-chapter-challenge').removeClass('lock').children('a').replaceWith($('<a href="javascript:void(0)" '+newLink+'>' + innerHTML + '</a>'));
		}
	});

	var totalCoins = blink.activity.currentStyle.userCoins ? blink.activity.currentStyle.userCoins : 0;
	$('#oxfl-coins-total').text(totalCoins);
}

oxfordFlippedApp.gohome = function() {
	window.location.hash = oxfordFlippedApp.config.tree[0].hash;
}
/*
oxfordFlippedApp.goback = function(classRef) {

	var possibleClasses = oxfordFlippedApp.config.bodyClasses.slice(0),
			index = possibleClasses.indexOf(classRef),
			possibleParents = {
				'oxfl-body-home' : '',
				'oxfl-body-episodes' : 'oxfl-body-home',
				'oxfl-body-chapters' : 'oxfl-body-episodes',
				'oxfl-body-marketplace' : 'oxfl-body-home',
				'oxfl-body-marketplace-game' : 'oxfl-body-marketplace',
				'oxfl-body-marketplace-summary' : 'oxfl-body-marketplace'
			},
			possibleHash = {
				'oxfl-body-home' : '',
				'oxfl-body-episodes' : '',
				'oxfl-body-chapters' : '',
				'oxfl-body-marketplace' : oxfordFlippedApp.config.tagMarketplace,
				'oxfl-body-marketplace-game' : oxfordFlippedApp.config.tagMarketplace,
				'oxfl-body-marketplace-summary' : oxfordFlippedApp.config.tagMarketplace
			};


	possibleClasses.splice(index, 1);

	var $body = $('body');
	$body.addClass(classRef);
	$.each(possibleClasses, function(i, v){
		$body.removeClass(v);
	});

	window.location.hash = possibleParents[classRef];
	oxfordFlippedApp.config.currentPage = classRef;

	var hasParent = (possibleParents[classRef] != '') ? true : false;

	if (hasParent) {
		$(oxfordFlippedApp.config.buttonGoBack).removeClass('disabled').attr({
			'data-goback': possibleParents[classRef]
		});
	} else {
		$(oxfordFlippedApp.config.buttonGoBack).addClass('disabled').attr('data-goback', '');
	}

	if (oxfordFlippedApp.config.backgrounds[classRef] === '') {
		oxfordFlippedApp.console("Without background");
		$('#oxfl-custom-background').removeAttr('style').removeClass('active');
	} else {
		oxfordFlippedApp.console("With background");
		$('#oxfl-custom-background').css('background-image', 'url('+oxfordFlippedApp.config.backgrounds[classRef]+')').addClass('active');
	}

}
*/

oxfordFlippedApp.goback = function(classRef) {
	 window.history.back();
}

oxfordFlippedApp.toggleLockChapter = function(chapterID, isLocked) {

	onCursoCambiarBloqueado(chapterID, idcurso);

	var isDone = true,
			newIsLocked = !isLocked; //Aqui habria que anadir el callback de onCursoCambiarBloqueado
	oxfordFlippedApp.console(newIsLocked);

	if (isDone) {

		var $items = $('.oxfl-chapter[data-id="'+chapterID+'"], .oxfl-chapter[data-id="'+chapterID+'"] .oxfl-js-modal-lock-chapter');

		if (newIsLocked) {
			$items.removeClass('unlock').addClass('lock');
		} else {
			$items.addClass('unlock').removeClass('lock');
		}
		$('#oxfl-modal-lock-chapters').modal('hide');
	}

}

oxfordFlippedApp.modalCloseIframe = function() {
	var isMultimedia = !($('#multimedia_iframe').is(':empty'));
	if (isMultimedia) {
		oxfordFlippedApp.closeIframe();
	} else {
		var $modalCloseIframe = $('#oxfl-modal-close-chapter');
		$modalCloseIframe.modal();
	}
}

oxfordFlippedApp.closeIframe = function() {

	cerrarIframe();
	$('#oxfl-modal-close-chapter').modal('hide');

}

oxfordFlippedApp.activityCreateFalseNavigation = function(data) {

	var navigationList = document.createDocumentFragment();
	var totalSlides = blink.activity.currentStyle.Slider.$items.length;

	var i;
	for (i = 0; i < totalSlides; i++) {
		var navigationListItem = document.createElement('li');
		//navigationListItem.className = 'oxfl-activities-navigation-item';
		navigationListItem.className = 'slider-indicator';
		navigationListItem.innerHTML = '<span></span>';
		navigationList.appendChild(navigationListItem);
	}
	$('.navbar-bottom .slider-indicators').remove();
	$('.navbar-bottom').prepend('<ul class="slider-indicators" id="oxfl-activities-navigation"></ul>');

	$('#oxfl-activities-navigation')[0].appendChild(navigationList);
	$('#oxfl-activities-navigation').find('li').first().addClass('active');

}

oxfordFlippedApp.activityCheckpointCover = function() {

	$('.oxfl-checkpoint-1-cover').each(function(i,e) {
		$(e).closest('.js-slider-item').addClass('oxfl-checkpoint-1-cover-wrapper');
	});

}

oxfordFlippedApp.activityTestSlides = function(contentZoneIndex) {
	var nextContentZone =  (typeof contentZoneIndex !== 'undefined') ? contentZoneIndex+1 : false;
	var totalSlides = blink.activity.currentStyle.Slider.$items.length,
			lastIndex = totalSlides-1,
			$lastSlide = $('#slider-item-'+lastIndex),
			isFinalSlide = $lastSlide.find('.oxfl-end-screen-tip').length,
			testSlidesLength = (isFinalSlide) ? totalSlides - 1 : totalSlides;

	if (nextContentZone) {
		var buttonQuitTest = '<button class="oxfl-button-round oxfl-button-round-circled oxfl-js-quit-test-modal"><span>'+oxfordFlippedApp.text.quit+'</span></button>';
		var i;
		for (i = nextContentZone; i < testSlidesLength; i++) {
			$('#slider-item-'+i).find('.js-slide-wrapper').append(buttonQuitTest);
		}
	}

	var modalQuitHTML = '<div class="modal fade oxfl-modal" id="oxfl-modal-quit-test" tabindex="-1" role="dialog" aria-hidden="true"> <div class="modal-dialog modal-dialog-centered" role="document"> <div class="modal-content"> <div class="modal-header"> <button type="button" class="close" data-dismiss="modal" aria-label="Close"> <span aria-hidden="true">&times;</span> </button> </div> <div class="modal-body"> <p>'+oxfordFlippedApp.text.oxfordFlipped_return_contentzone_alert+'</p> </div> <div class="modal-footer"><div class="modal-footer-inner"> <button type="button" class="btn btn-secondary" data-dismiss="modal">'+oxfordFlippedApp.text.no+'</button> <button type="button" class="btn btn-primary oxfl-js-quit-test">'+oxfordFlippedApp.text.yes+'</button> </div> </div></div> </div>';

	$('body').append(modalQuitHTML);

	$('body').on('click', '.oxfl-js-quit-test-modal', function() {
		var $modal = $('#oxfl-modal-quit-test');
		$modal.modal();
	});

	$('body').on('click', '.oxfl-js-quit-test', function() {
		var $modal = $('#oxfl-modal-quit-test');
		$modal.modal('hide');
		blink.activity.currentStyle.quitAndGoToContentZone();
	});

}


oxfordFlippedApp.activityFinalScreenOne = function(contentZoneIndex) {

	//slide_content_type_28
	var prevContentZone =  (typeof contentZoneIndex !== 'undefined') ? contentZoneIndex - 1 : '';

	if (prevContentZone != '') {
		var html = '<div class="oxfl-final-screen-one"><div class="oxfl-final-screen-one-inner"><div class="oxfl-coins-bubble-1"><div class="oxfl-coins-bubble-1-coins" id="oxfl-total-coins-1"></div></div></div></div>';
		var $slide = $('.js-slide-wrapper[data-slide-index="'+prevContentZone+'"]');
		$slide.closest('.js-slider-item').prepend(html).addClass('oxfl-final-screen-one-wrapper');

	}

	$('#signin').popover({
	 html: true,
	 trigger: 'manual',
	 content: function() {
		 return $.ajax({url: '/path/to/content',
										dataType: 'html',
										async: false}).responseText;
	 }
 }).click(function(e) {
	 $(this).popover('toggle');
 });

	blink.events.on('vocabulary:done', (function() {
		oxfordFlippedApp.console("Prev Content Zone DONE");
		var coins = blink.activity.currentStyle.calculateVocabularyCoins(); // TODO Check
		$('#oxfl-total-coins-1').text(coins);
		$slide.closest('.js-slider-item').scrollTop(0).addClass('oxfl-final-screen-one-wrapper-active');
	}));

}

oxfordFlippedApp.activityContentZone = function() {

	$('.js-slider-item').each(function(i,e) {

		if ($(e).find('.oxfl-cz').length) {
			var backgroundImage = $(e).find('.image_slide').attr('src'),
					buttonNextHTML = '<button class="oxfl-cz-button-next oxfl-disabled oxfl-js-cz-next"><span>'+oxfordFlippedApp.text.nextContentZone+'</span></button>',
					modalHTML =	'<div class="modal fade oxfl-modal" id="oxfl-modal-start-test" tabindex="-1" role="dialog" aria-hidden="true"> <div class="modal-dialog modal-dialog-centered" role="document"> <div class="modal-content"> <div class="modal-header"> <button type="button" class="close" data-dismiss="modal" aria-label="Close"> <span aria-hidden="true">&times;</span> </button> </div> <div class="modal-body"> <p>'+oxfordFlippedApp.text.startTest+'</p> </div> <div class="modal-footer"><div class="modal-footer-inner"> <button type="button" class="btn btn-secondary" data-dismiss="modal">'+oxfordFlippedApp.text.no+'</button> <button type="button" class="btn btn-primary oxfl-js-start-test">'+oxfordFlippedApp.text.yes+'</button> </div> </div></div> </div>';
			$(e).addClass('oxfl-content-zone-wrapper').append(buttonNextHTML+'<div class="oxfl-content-zone-background"></div>').find('.oxfl-content-zone-background').css('background-image', 'url('+backgroundImage+')');
			$('body').prepend(modalHTML);
		}

	});

	$('.oxfl-content-zone-wrapper').scroll(function() {
		var scrtop = $(this).scrollTop();
		$(this).find('.oxfl-cz-button-next').css('bottom', -scrtop);
	});

	$('.oxfl-cz').each(function(i,e) {
		var $wrapper = $(e).closest('.js-slider-item'),
				$content = $(e).find('.bck-content'),
				title = $wrapper.find('.header .title h3').text(),
				html = '<div class="oxfl-cz-header"><h4 class="oxfl-cz-header-title">'+title+'</h4><button class="oxfl-cz-header-button oxfl-js-cz-close">'+oxfordFlippedApp.text.closeContentZone+'</button></div>';

		$content.wrapInner('<div class="oxfl-cz-content"></div>').prepend(html);

	});

	$('.oxfl-cz').on('click', '.bck-title', function() {
		var $content = $(this).next('.bck-content'),
				$wrapper = $(this).closest('.js-slider-item');

		$content.addClass('oxfl-visible');
		$('body').addClass('oxfl-content-zone-card-on');
		$wrapper.scrollTop(0).find('.bck-content').not($content).removeClass('oxfl-visible');

	});

	$('.oxfl-cz').on('click', '.oxfl-js-cz-close', function() {

		var $wrapper = $(this).closest('.js-slider-item');
		$(this).closest('.bck-content').removeClass('oxfl-visible');
		$('body').removeClass('oxfl-content-zone-card-on');
		$wrapper.find('.oxfl-js-cz-next').removeClass('oxfl-disabled');

	});

	$('body').on('click', '.oxfl-js-cz-next', function() {

		if (!$(this).hasClass('oxfl-disabled')) {
			var $modal = $('#oxfl-modal-start-test');
			$modal.modal();
		}

	});

	$('body').on('click', '.oxfl-js-start-test', function() {

		oxfordFlippedApp.console("START");
		var $modal = $('#oxfl-modal-start-test');
		$modal.modal('hide');
		blink.activity.showNextSection();

	});

}

oxfordFlippedApp.activityFinalScreenTest = function(currentSection) {

		var totalSlides = blink.activity.currentStyle.Slider.$items.length,
				isLastSlide = (totalSlides === currentSection+1);
		oxfordFlippedApp.console(isLastSlide);

		if (isLastSlide) {

			var $lastSlide = $('#slider-item-'+currentSection),
					isFinalSlide = $lastSlide.find('.oxfl-end-screen-tip').length,
					isChallenge = oxfordFlippedApp.config.challengeIDs.indexOf(idclase.toString()) >= 0;

			console.log('Challenge? Final slide?');
			console.log(isFinalSlide);
			console.log(isChallenge);
			if (isFinalSlide) {
				parent.top.oxfordFlippedApp.hideIframeButton();

				$('body').removeClass('oxfl-end-screen-tip-on');

				var urlSeguimiento = '/include/javascript/seguimientoCurso.js.php?idcurso=' + idcurso;
				loadScript(urlSeguimiento, true, function() {

					oxfordFlippedApp.console(window.actividades);

					var grade =  (typeof window.actividades[idclase] === 'undefined') ? 0 : window.actividades[idclase].clasificacion;

					$('body').addClass('oxfl-final-slide-on');
					var finalSlideLoaded = $lastSlide.hasClass('oxfl-final-slide');
					if (finalSlideLoaded) {
						$('#oxfl-final-slide').remove();
					}
					if (grade > oxfordFlippedApp.config.minGrade && grade != '') {
						if (isChallenge) {
							var finalSlideBackground = $lastSlide.find('.image_slide').attr('src'),
									finalSlideContent = '<div id="oxfl-final-slide"> <div class="oxfl-final-slide-stars" id="oxfl-final-slide-stars"></div><div class="oxfl-coins-bubble-2"><div class="oxfl-coins-bubble-2-coins" id="oxfl-total-coins-2"></div></div><button class="oxfl-button-bubble oxfl-button-bubble-3 oxfl-js-close-iframe-inside">'+oxfordFlippedApp.text.exit+'</button></div>';
							if (finalSlideBackground != '') {
								$lastSlide.css('background-image', 'url('+finalSlideBackground+')').find('.slide_aux').hide();
							}
							$lastSlide.addClass('oxfl-final-slide-challenge');
						} else {
							var finalSlideTip = $lastSlide.find('.oxfl-end-screen-tip').clone().wrap('<div/>').parent().html(),
									finalSlideContent = '<div id="oxfl-final-slide"> <div class="oxfl-final-slide-stars" id="oxfl-final-slide-stars"></div><div class="oxfl-bubble-leave"><div class="oxfl-bubble-leave-inner">'+oxfordFlippedApp.text.beforeYouLeave+'</div></div><button class="oxfl-button-large oxfl-button-large-next oxfl-js-show-final-tip"><span>'+oxfordFlippedApp.text.viewtip+'</span></button><div class="oxfl-coins-bubble-2"><div class="oxfl-coins-bubble-2-coins" id="oxfl-total-coins-2"></div></div><div id="oxfl-final-slide-tip"><button class="oxfl-button-bubble oxfl-button-bubble-1 oxfl-js-close-iframe-inside">'+oxfordFlippedApp.text.exit+'</button><button class="left oxfl-slider-control oxfl-js-hide-final-tip"><span class="fa fa-chevron-left"></span></button></div></div>';
							$lastSlide.removeClass('oxfl-final-slide-challenge');
						}

						$lastSlide.removeClass('oxfl-final-slide-fail').addClass('oxfl-final-slide').find('.item-container').prepend(finalSlideContent);
						$('#oxfl-final-slide-tip').prepend(finalSlideTip);
						var finalCoins = blink.activity.currentStyle.calculateActivityGameScore(), // TODO Check
								totalStars = oxfordFlippedApp.gradeToStars(grade);

						$('#oxfl-total-coins-2').text(finalCoins);
						$('#oxfl-final-slide-stars').addClass('oxfl-final-slide-stars-'+totalStars);


					} else {
						if (isChallenge) {
							var finalSlideBackground = $lastSlide.find('.image_slide').attr('src'),
									finalSlideContent = '<div id="oxfl-final-slide"><div class="oxfl-final-slide-stars" id="oxfl-final-slide-stars"></div><div class="oxfl-final-slide-fail-buttons"><button class="oxfl-button-bubble oxfl-button-bubble-2 oxfl-js-go-to-start">'+oxfordFlippedApp.text.tryagain+'</button><div class="oxfl-separate-text">'+oxfordFlippedApp.text.or+'</div><button class="oxfl-button-bubble oxfl-button-bubble-3 oxfl-js-close-iframe-inside">'+oxfordFlippedApp.text.exit+'</button></div></div>';
							if (finalSlideBackground != '') {
								$lastSlide.css('background-image', 'url('+finalSlideBackground+')').find('.slide_aux').hide();
							}
							$lastSlide.addClass('oxfl-final-slide-challenge');
						} else {
							var finalSlideContent = '<div id="oxfl-final-slide"><div class="oxfl-final-slide-stars" id="oxfl-final-slide-stars"></div><div class="oxfl-final-slide-fail-buttons"><button class="oxfl-button-bubble oxfl-button-bubble-2 oxfl-js-tryagain">'+oxfordFlippedApp.text.tryagain+'</button><div class="oxfl-separate-text">'+oxfordFlippedApp.text.or+'</div><button class="oxfl-button-bubble oxfl-button-bubble-3 oxfl-js-close-iframe-inside">'+oxfordFlippedApp.text.exit+'</button></div></div>';
							$lastSlide.removeClass('oxfl-final-slide-challenge');
						}
						$lastSlide.addClass('oxfl-final-slide oxfl-final-slide-fail').find('.item-container').prepend(finalSlideContent);

					}

				});

				$('body').on('click', '.oxfl-js-show-final-tip', function(e) {

					e.preventDefault();
					$('body').addClass('oxfl-end-screen-tip-on');

				});

				$('body').on('click', '.oxfl-js-hide-final-tip', function(e) {

					e.preventDefault();
					$('body').removeClass('oxfl-end-screen-tip-on');

				});

				$('body').on('click', '.oxfl-js-go-to-start', function(e) {

					e.preventDefault();
					$('body').removeClass('oxfl-final-slide-on oxfl-end-screen-tip-on');
					blink.activity.showSection(0);

				});

				$('body').on('click', '.oxfl-js-tryagain', function(e) {

					e.preventDefault();
					$('body').removeClass('oxfl-final-slide-on oxfl-end-screen-tip-on');
					blink.activity.currentStyle.quitAndGoToContentZone();

				});
			}

		} else {
			parent.top.oxfordFlippedApp.showIframeButton();
			$('body').removeClass('oxfl-final-slide-on');
		}

}

oxfordFlippedApp.challengeCover = function() {

	$('.oxfl-challenge-cover').each(function(i,e) {
		var $slide = $(e).closest('.js-slider-item');
		var startButton = '<button class="oxfl-button-bubble oxfl-button-bubble-2 oxfl-js-start-challenge">'+oxfordFlippedApp.text.start+'</button>';
		var challengeBackground = $slide.find('.image_slide').attr('src');
		if (challengeBackground != '') {
			$slide.css('background-image', 'url('+challengeBackground+')').find('.slide_aux').hide();
		}
		$(e).closest('.js-slider-item').addClass('oxfl-challenge-cover-wrapper').append(startButton);
		//$('body').addClass('oxfl-challenge-cover-wrapper-on');
	});

	$('body').on('click', '.oxfl-js-start-challenge', function() {
		blink.activity.showNextSection();
		$('body').removeClass('oxfl-challenge-cover-wrapper-on');
	});

}

oxfordFlippedApp.onSliderChange = function(currentSection) {

	var hasCover = $('.oxfl-checkpoint-1-cover-wrapper').length,
			coverIDNum = (hasCover) ? Number($('.oxfl-checkpoint-1-cover-wrapper').attr('id').replace('slider-item-', '')) : '',
			hasContentZone = $('.oxfl-content-zone-wrapper').length,
			contentZoneIDNum = (hasContentZone) ? Number($('.oxfl-content-zone-wrapper').attr('id').replace('slider-item-', '')) : '',
			hasCoverChallenge = $('.oxfl-challenge-cover-wrapper').length,
			coverChallengeIDNum = (hasCoverChallenge) ? Number($('.oxfl-challenge-cover-wrapper').attr('id').replace('slider-item-', '')) : '',
			isFinalSlide = $('#slider-item-'+currentSection).find('.oxfl-end-screen-tip').length;

	if (isFinalSlide) {
		oxfordFlippedApp.activityFinalScreenTest(currentSection);
	}

	if (currentSection === coverIDNum) {
		oxfordFlippedApp.console("You're in Checkpoint 1");
	}

	if (currentSection === coverChallengeIDNum) {
		$('body').addClass('oxfl-challenge-cover-wrapper-on');
	}

	if (currentSection === contentZoneIDNum) {

		oxfordFlippedApp.console("You're in Content Zone");
		$('body').addClass('oxfl-content-zone-on');

	} else {

		//$('body').removeClass('oxfl-content-zone-on');

	}

	$('#oxfl-activities-navigation li:eq('+currentSection+')').addClass('active').siblings().removeClass('active');
}


oxfordFlippedApp.onSliderChanged = function(currentSection) {

	var hasCover = $('.oxfl-checkpoint-1-cover-wrapper').length,
			coverIDNum = (hasCover) ? Number($('.oxfl-checkpoint-1-cover-wrapper').attr('id').replace('slider-item-', '')) : '',
			hasContentZone = $('.oxfl-content-zone-wrapper').length,
			contentZoneIDNum = (hasContentZone) ? Number($('.oxfl-content-zone-wrapper').attr('id').replace('slider-item-', '')) : '',
			hasCoverChallenge = $('.oxfl-challenge-cover-wrapper').length,
			coverChallengeIDNum = (hasCoverChallenge) ? Number($('.oxfl-challenge-cover-wrapper').attr('id').replace('slider-item-', '')) : '',
			isFinalSlide = $('#slider-item-'+currentSection).find('.oxfl-end-screen-tip').length;

	$('.js-slider-item').removeClass('oxfl-final-screen-one-wrapper-active'); // TODO Comprobar si cuando vuelves a Vocabulary esta la pantalla de las monedas o se ha reseteado.

	if (!isFinalSlide) {
		$('body').removeClass('oxfl-final-slide-on oxfl-end-screen-tip-on');
		console.log("Not final Slide");
	}

	if (currentSection !== coverChallengeIDNum) {
		$('body').removeClass('oxfl-challenge-cover-wrapper-on');
		console.log("Not Cover challenge");
	}

	if (currentSection !== contentZoneIDNum) {
		$('body').removeClass('oxfl-content-zone-on');
		console.log("Not  content zone");
	}

	//$('body').removeClass('oxfl-final-slide-on oxfl-end-screen-tip-on');

}

oxfordFlippedApp.hideIframeButton = function() {
	$('#iframe_div .btn-close-iframe').hide();
}
oxfordFlippedApp.showIframeButton = function() {
	$('#iframe_div .btn-close-iframe').show();
}

oxfordFlippedApp.oxflMarketplaceModal = function(resourceToken,resourceTitle,resourceDescription,resourceID) {
	blink.checkConnection(
		function() {
			var currentTotalCoins = blink.activity.currentStyle.userCoins;
			if (currentTotalCoins < resourceToken) {
				oxfordFlippedApp.oxflMarketplaceModalNoCoins();
			} else {
				oxfordFlippedApp.oxflMarketplaceModalInfo(resourceToken,resourceTitle,resourceDescription,resourceID)
			}
	},
		function() {
		oxfordFlippedApp.oxflMarketplaceModalNoConnection();
	});
}

oxfordFlippedApp.oxflMarketplaceModalInfo = function(resourceToken,resourceTitle,resourceDescription,resourceID) {
	oxfordFlippedApp.console("Enough coins");

	var $modal = $('#oxfl-modal-marketplace-info');

	$('#oxfl-modal-marketplace-info-title').text(resourceTitle);
	$('#oxfl-modal-marketplace-info-description').text(resourceDescription);
	$('#oxfl-modal-marketplace-info-coin').text(resourceToken);
	$modal.find('[data-marketplace-id]').attr('data-marketplace-id', resourceID);
	$modal.modal('show');

}

oxfordFlippedApp.oxflMarketplaceModalNoCoins = function() {
	oxfordFlippedApp.console("No coins");

	var $modal = $('#oxfl-modal-marketplace-nocoins');
	$modal.modal('show');

}

oxfordFlippedApp.oxflMarketplaceModalNoConnection = function() {
	oxfordFlippedApp.console("No connection");

	var $modal = $('#oxfl-modal-marketplace-noconnection');
	$modal.modal('show');

}

$(document).ready(function() {

	// Go back
	$('body').on('click', oxfordFlippedApp.config.buttonGoBack, function() {
		console.log("Check 2");
		oxfordFlippedApp.goback();

	});

	// Go Home
	$('body').on('click', '.oxfl-js-gohome', function() {

		oxfordFlippedApp.gohome();

	});

	// Load chapter / subunit
	$('body').on('click', '.oxfl-js-load-chapter', function(e) {

		e.preventDefault();
		//var chapterUrl = $(this).data('url');
		//showIFrame(chapterUrl, 1000, 700, false, true, false, '');

		$modal = $('#oxfl-modal-list-notifications');
		$modal.modal('hide');

		var chapterID = $(this).attr('data-chapter-id');
		blink.theme.iframeWidth = 1300; //TEST //924;
		blink.domain.openActivity(chapterID);

	});

	// Load resource / marketplace
	/*$('body').on('click', '.oxfl-js-load-resource', function(e) {

		e.preventDefault();
		var resourceOnclick = $(this).attr('data-onclick');
		//resourceOnclick;
		//blink.theme.iframeWidth = 1300;
		//blink.domain.openActivity(resourceID);
		//redireccionar(resourceUrl, false, undefined);

	});*/

	// Lock/unlock chapters
	$('body').on('click', '.oxfl-js-modal-lock-chapter', function(e) {

		e.preventDefault();

		var chapterID = $(this).closest('.oxfl-chapter').attr('data-id'),
				isLocked = $(this).hasClass('lock'),
				$modal = $('#oxfl-modal-lock-chapters');

		if (isLocked) {
			$('#oxfl-modal-lock-chapters-text').text('unlock');
			$modal.find('.oxfl-js-toggle-lock-chapter').addClass('lock').removeClass('unlock');
		} else {
			$('#oxfl-modal-lock-chapters-text').text('lock');
			$modal.find('.oxfl-js-toggle-lock-chapter').addClass('unlock').removeClass('lock');
		}
		$modal.find('.oxfl-js-toggle-lock-chapter').removeAttr('data-chapter-id').attr('data-chapter-id', chapterID);

		$modal.modal();

	});

	$('body').on('click', '.oxfl-js-toggle-lock-chapter', function(e) {

		e.preventDefault();

		var chapterID = $(this).attr('data-chapter-id'),
				isLocked = $(this).hasClass('lock');

		oxfordFlippedApp.toggleLockChapter(chapterID, isLocked);

	});

	$('body').on('click', '.oxfl-js-close-iframe-inside', function(e) {

		e.preventDefault();
		parent.top.oxfordFlippedApp.closeIframe();

	});


	$('body').on('click', '.oxfl-js-buy-resource', function(e) {

		e.preventDefault();
		var resourceID = $(this).attr('data-marketplace-id');
		blink.activity.currentStyle.buyActivityMarketPlace(resourceID);
		blink.activity.currentStyle.loadUserData(); //TODO CHeck
	});

	$('body').on('click', '.oxfl-js-open-notifications', function(e) {

		e.preventDefault();

		$modal = $('#oxfl-modal-list-notifications');
		$modal.modal('show');

	});

	blink.events.on('course:refresh', (function() {

		console.log("DATA updated 5");
		console.log(actividades);
		console.log(window.actividades);
		console.log(blink.activity.currentStyle.userCoins);
		oxfordFlippedApp.updateUserData();

	}));

	// htmlReady out of Activities TODO CHECK
	$('body').imagesLoaded({background: 'div, a, span, button'}, function() {
		$('html').addClass('htmlReady');
	});

	// Popover in Not allowed
	var popoverNotAllowed = '';
	$('body').on('click', '.slider-control', function() {
		if ($(this).is('.not-allowed')) {
			if (typeof popoverNotAllowed === 'undefined' || popoverNotAllowed === '') {
				popoverNotAllowed = $(this).popover({
					placement: 'left',
					template: '<div class="popover oxfl-popover" role="tooltip"><button type="button" id="oxfl-popover-close" class="oxfl-close"><span>&times;</span></button><div class="oxfl-popover-inner"><div class="popover-content"></div></div></div>',
					content : oxfordFlippedApp.text.popoverGoToContentZoneDisabled,
					title : '',
					container: 'body'
				});
			}
			popoverNotAllowed.popover('enable');
			if(!$('.oxfl-popover').is(":visible")) {
				popoverNotAllowed.popover('show');
			}
		} else {
			if (typeof popoverNotAllowed !== 'undefined' && popoverNotAllowed !== '') {
				popoverNotAllowed.popover('destroy');
				popoverNotAllowed = '';
			}
		}
	});
	$('body').on('click', '#oxfl-popover-close', function(e) {
		$('.oxfl-js-popover, .slider-control.not-allowed').popover('hide');
	});

});
