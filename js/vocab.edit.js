vocab.edit = (function () {
	//---------------- BEGIN MODULE SCOPE VARIABLES --------------
	var
		configMap = {
			main_html : String()
				+ '<div class="editor">'
					+ '<div class="col-sm-2">'
						+ '<h3 id="edit-head"></h3>'
					+ '</div>'
					+ '<div class="col-sm-10" id="edit-ctrl">'
						+ '<div class="row inputBox">'
							+	'<div class="col-sm-10">'
								+	'<label>Label</label>'
								+	'<input />'
							+ '</div>'
							+ '<div class="col-sm-2">'
								+ '<button class="btn btn-danger">Cancel Edits</button>'
							+ '</div>'
						+ '</div>'
						+ '<div class="row">'
							+ '<div class="col-sm-4">'
								+	'<section class="edit-group">'
									+	'<h4>Broader</h4>'
									+ '<ul class="edit-broader"></ul>'
								+ '</section>'
							+ '</div>'
							+ '<div class="col-sm-4">'
								+ '<section class="edit-group">'
									+ '<h4>Narrower</h4>'
									+ '<ul class="edit-narrower"></ul>'
								+ '</section>'
							+ '</div>'
							+ '<div class="col-sm-4">'
								+ '<section class="edit-group">'
									+ '<h4 class="edit-related">Related</h4>'
									+ '<ul></ul>'
								+ '</section>'
							+ '</div>'
						+ '</div>'
						+ '<div class="row">'
							+ '<div class="col-sm-5 col-sm-offset-1">'
								+ '<section class="edit-group">'
									+ '<h4 class="edit-alternative">Alternative labels</h4>'
									+ '<ul></ul>'
								+ '</section>'
							+ '</div>'
							+ '<div class="col-sm-5 col-sm-offset-1">'
								+ '<section class="edit-group">'
									+ '<h4 class="edit-hidden">Hidden labels</h4>'
									+ '<ul></ul>'
								+ '</section>'
							+ '</div>'
						+ '</div>'
						+ '<div class="row inputBox">'
							+ '<div class="col-sm-2 col-sm-offset-10">'
								+ '<button class="btn btn-success">Submit</button>'
							+ '</div>'
						+ '</div>'
					+ '</div>'
				+ '</div>',
			terms_model : null,
		},

		stateMap	= {
			$append_target : null,
			search_results : [],
			results_page : 0
		},

		jqueryMap = {},
		initializeResultsList,
		updateResultsList, onClickSearch,
		displayResultsPage, clearResultsList,
		setJqueryMap, initModule, configModule;
	//----------------- END MODULE SCOPE VARIABLES ---------------

	//--------------------- BEGIN DOM METHODS --------------------
	// Begin DOM method /setJqueryMap/
	setJqueryMap = function () {
		var
			$append_target = stateMap.$append_target;
			$editor = $append_target.find( '.editor' );

		jqueryMap = {
			$editor : $editor,
			$edit_head : $editor.find( '#edit-head' ),
			$edit_ctrl : $editor.find( '#edit-ctrl'),
			$edit_groups : $inspect.find( '.edit-group')
		};
	};
	// End DOM method /setJqueryMap/

	loadEditable = function () {
		var 
			no_results = ["None"],
			results_map = {},
			editable, data,
			key, vals, $result_list;

		jqueryMap.$edit_ctrl.find('li').remove();

		editable = configMap.terms_model.get_editable();
		data = editable.data;
		for (key in data) {
			if (data[key].length === 0) {
				results_map[key] = no_results;
			} else {
				results_map[key] = [];
				for (var i = 0, len=data[key].length; i < len; i++) {
					var nbor = configMap.terms_model.get_by_uri(data[key][i]);
					results_map[key].push(nbor.label);
				}
			}
		};

		jqueryMap.$edit_head.text( editable.label );
		jqueryMap.$edit_groups.each( function (idx) {
			$(this).addClass('show');
		})

		for (key in results_map) {
			if (results_map.hasOwnProperty(key)) {
				vals = results_map[key];
				$result_list = jqueryMap.$edit_ctrl.find( '.edit-'+key );
				for (var i = 0, len=vals.length; i < len; i++) {
					$result_list.append('<li>'+vals[i]+'</li>');
				}
			}
		}
	};
	//---------------------- END DOM METHODS ---------------------

	//------------------- BEGIN EVENT HANDLERS -------------------

	//-------------------- END EVENT HANDLERS --------------------

	configModule = function ( map ) {
		configMap.terms_model = map.terms_model;
	};

	initModule = function ( $append_target ) {
		$append_target.append( configMap.main_html );

		stateMap.$append_target = $append_target;
		setJqueryMap();

		$( window ).on('termEditable', function(e) {
			loadEditable();
		});

		return true;
	};

	return {
		configModule		: configModule,
		initModule			: initModule
	};
}());