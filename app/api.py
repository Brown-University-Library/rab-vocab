import os
import datetime
import requests
import json

from flask import request, render_template, jsonify, make_response
from app import app
from app.models import rab


solr_url = app.config['SOLR_URL']

@app.route('/')
def main():
	return render_template('vocab.html')


@app.route('/search/', methods=['GET'])
def solr_search():
	solr_endpoint = solr_url + 'select/'
	type_map = {
		'vocab' : 'type:http://vivo.brown.edu/ontology/vivo-brown/ResearchArea'
	}

	type_param = request.args.get('type')
	query_param = request.args.get('query')

	solr_field_title = 'acNameStemmed:'
	solr_field_type = type_map[type_param]
	query = solr_field_title + query_param + " " + solr_field_type
	
	payload = { "q" : query,
				"fl": "URI,nameRaw",
				"wt": "json",
				"rows": "30" }
	solr_resp = requests.get(solr_endpoint, params=payload)
	solr_data = solr_resp.json()
	reply = []
	if solr_data['response']['numFound'] > 0:
		for doc in solr_data['response']['docs']:
			res = { 'uri': doc['URI'],
				'display': doc['nameRaw'][0],
				'id': doc['URI'][33:],
				'data': {}
				}
			reply.append(res)
	resp = make_response(
				json.dumps(reply))
	return resp

@app.route('/describe/<rabid>', methods=['GET'])
def describe_term(rabid):
	term = rab.ResearchArea(id=rabid)
	linked_attrs = ['broader','narrower','related']
	neighbor_uris = []
	for attr in linked_attrs:
		neighbor_uris.extend( term.data[attr] )
	out = [ rab.ResearchArea(uri=uri) for uri in neighbor_uris ]
	out.append(term)
	return jsonify( [ ra.publish() for ra in out ] )

@app.route('/update/', methods=['PUT'])
def update_terms():
	data = request.get_json()
	to_be_updated = [ (obj['data'], rab.ResearchArea(uri=obj['uri'])) for obj in data ]
	success = []
	for new_data, existing in to_be_updated:
		resp = existing.update(new_data)
		if resp.status_code == 200:
			success.append(existing.uri)
		else:
			print "Failure: " + existing.uri
			print resp.text
	return jsonify(success)