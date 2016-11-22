vocab.data = (function () {

	var
		configMap = {
			resource_base : "http://vivo.brown.edu/individual/",
			search_base : null,
			rest_base : null
		},

		serviceDataProto,
		
		solr, rest, request, get,
		getTerm, makeTerm,
		initModule, configModule;

	serviceDataProto = {
		uri : null,
		label : null,
		links : [],
		etag : null,
		data : {}
	};

	makeServiceData = function ( resp, linkedAttrs, etag ) {
		var servData;

		servData = Object.create( serviceDataProto );

		if ( Object.keys(resp).length !== 1) {
			return false;
		}
		servData.uri = Object.keys( resp )[0];
		servData.data = resp[ servData.uri ];
		//JSON.parse side effect?
		delete servData.data.uri
		servData.label = servData.data.label[0];
		servData.etag = etag;
		servData.links = [];
		linkedAttrs.forEach( function (linkedAttr) {
			if (linkedAttr in servData.data) {
				servData.links.push.apply(servData.links, servData.data[linkedAttr]);
			}
		});

		return servData;
	};

	get = function ( url ) {
		//https://developers.google.com/web/fundamentals/getting-started/primers/promises
	  // Return a new promise.
	  return new Promise(function(resolve, reject) {
	    // Do the usual XHR stuff
	    var req = new XMLHttpRequest();
	    // for CORS
	    req.withCredentials = true;
	    
	    req.open('GET', url);

	    req.onload = function() {
	      // This is called even on 404 etc
	      // so check the status
	      if (req.status == 200) {
	        // Resolve the promise with the response text
	        resolve({
						'data'	: JSON.parse(req.response),
						'etag'	: req.getResponseHeader('etag')
	        });
	      }
	      else {
	        // Otherwise reject with the status text
	        // which will hopefully be a meaningful error
	        reject(Error(req.statusText));
	      }
	    };

	    // Handle network errors
	    req.onerror = function() {
	      reject(Error("Network Error"));
	    };

	    // Make the request
	    req.send();
	  });
	};

	getServData = function ( url ) {
		return get( url ).then( function( respObj ) {
			data = JSON.parse(respObj.resp);
			etag = respObj.etag;
			term = makeTerm(data, etag);
			return term;
		});
	};

	getTerm = function ( url ) {
		return get( url ).then( function( respObj ) {
			data = JSON.parse(respObj.resp);
			etag = respObj.etag;
			term = makeTerm(data, etag);
			return term;
		});
	};

	//Begin Solr interface
	solr = (function () {
		var
			search;

		search = function ( term, callback ) {
			var
				i,
				search_res, results,
				data, servData,
				endpoint = configMap.search_base,
				query_url = endpoint + "?query=" + term + "&type=vocab";
			
			get( query_url )
			.then( function ( resp ) {
				results = resp.data;
				data = [];
				for ( i = 0; i < results.length; i++ ) {
					search_res = results[i];
					servData = makeServiceData( search_res, [], resp.etag );
					data.push(servData);
				}

				return data;
			})
			.then( function ( data ) {
				callback(data);
			});
		};

		return {
			search : search
		};
	}());
	//end Solr interface

	//Begin REST interface
	rest = (function () {
		var
			find, update, describe;

		describe = function ( rabid, links, callback ) {
			var
				out, linkedServData,
				servData, res_links,
				link_rabid, res_url,			
				rest_url = configMap.rest_base + rabid;

			out = [];

			get( rest_url )
			.then( function( resp ) {
				servData = makeServiceData( resp.data, links, resp.etag );

				res_links = [];
				servData.links.forEach( function (link) {
					link_rabid = link.substring(configMap.resource_base.length);
					res_url = configMap.rest_base + link_rabid;
					res_links.push(res_url);
				});

				out.push(servData);

				return Promise.all(
					res_links.map( get )
				);
			})
			.then( function (resps) {
				resps.forEach( function ( resp ) {
					console.log(resp);
					linkedServData = makeServiceData( resp.data, links, resp.etag );
				});
				out.push(linkedServData);
			})
			.then( function () {
				console.log(out);
				// callback( out );
			});
		};

		find = function ( rabid, callback ) {
			var
				i, len, key,
				data, etag, term,
				nbor, nbors,
				n_rabid, n_url,
				
				rest_url = configMap.rest_base + rabid;

			getTerm( rest_url ).then( function(term) {
				vocab.model.updateTerm(term);

				nbors = [];
				for (key in term.data) {
					if (term.data[key] !== []) {
						for ( i=0, len=term.data[key].length; i < len; i++) {
							nbor = term.data[ key ][ i ];
							n_rabid = nbor.substring(configMap.resource_base.length);
							n_url = configMap.rest_base + n_rabid;
							nbors.push(n_url);
						}
					} 
				}

				return Promise.all(
					nbors.map(getTerm)
				);
			})
			.then( function (terms) {
				terms.forEach( function ( term ) {
					vocab.model.updateTerm( term );
				});
				term = vocab.model.terms.get_by_rabid( rabid );
				callback( term );
			});
		};

		update = function ( term, callback ) {
			var
				label, uri, rest_url,
				data, params,
				payload = {}, 
				etag;

			label = [term.label];
			uri = term.uri;
			rest_url = configMap.rest_base + term.id;
			data = term.data;
			data.label = label;
			data.class = ['http://www.w3.org/2004/02/skos/core#Concept'];
			etag = term.etag;
			payload[uri] = data ;
			params = {
				dataType : "json",
				contentType: 'application/json; charset=UTF-8',
				type: "PUT",
				data: JSON.stringify(payload),
				url : rest_url,
				headers: {"If-Match": etag}
			};

			request( params )
			.then( function(resp) {
				callback(resp);
			});
		};

		return {
			find 	: find,
			update  : update,
			describe : describe
		};
	}());

	configModule = function ( config ) {
		configMap.search_base = config.search_base;
		configMap.rest_base = config.rest_base;
	};

	initModule = function (){};

	return {
		configModule : configModule,
		initModule : initModule,
		solr : solr,
		rest : rest,
		getTerm : getTerm
	};
}());
