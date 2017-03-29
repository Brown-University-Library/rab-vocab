from SPARQLWrapper import SPARQLWrapper, JSON
import re
import collections
import pandas as pd

from app import app

query_endpoint = app.config['VIVO_ENDPOINT']

sparql = SPARQLWrapper(query_endpoint)
sparql.setReturnFormat(JSON)

def faculty_terms_data():
    sparql.setQuery("""
        PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
        PREFIX vivo: <http://vivoweb.org/ontology/core#>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX bprofile: <http://vivo.brown.edu/ontology/profile#>
        PREFIX blocal: <http://vivo.brown.edu/ontology/vivo-brown/>

        SELECT ?fac ?term
        WHERE {
                ?term rdf:type skos:Concept .
                {?term vivo:researchAreaOf ?fac .}
                UNION
                {?term bprofile:specialtyFor ?fac .}
                UNION
                {?term blocal:geographicResearchAreaOf ?fac .}
        }
    """)
    results = sparql.query().convert()
    out = [ (result['fac']['value'], result['term']['value'])
                for result in results["results"]["bindings"] ]
    return out

def faculty_affiliations_data():
    sparql.setQuery("""
        PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
        PREFIX vivo: <http://vivoweb.org/ontology/core#>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX bprofile: <http://vivo.brown.edu/ontology/profile#>
        PREFIX blocal: <http://vivo.brown.edu/ontology/vivo-brown/>

        SELECT ?fac ?dept
        WHERE {
                ?fac a vivo:FacultyMember .
                ?fac blocal:hasAffiliation ?dept .
        }
        """)
    results = sparql.query().convert()
    out = [ (result['fac']['value'], result['dept']['value'])
                for result in results["results"]["bindings"] ]
    return out

def term_data():
    sparql.setQuery("""
        PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
        PREFIX vivo: <http://vivoweb.org/ontology/core#>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX bprofile: <http://vivo.brown.edu/ontology/profile#>
        PREFIX blocal: <http://vivo.brown.edu/ontology/vivo-brown/>
        PREFIX rdfs:     <http://www.w3.org/2000/01/rdf-schema#>

        SELECT DISTINCT ?term ?label
        WHERE {
                ?term rdf:type skos:Concept .
                ?term rdfs:label ?label .
        }
        """)
    results = sparql.query().convert()
    out = list({ (result['term']['value'], result['label']['value'])
                for result in results["results"]["bindings"] })
    return out

def faculty_data():
    sparql.setQuery("""
        PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
        PREFIX vivo: <http://vivoweb.org/ontology/core#>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX bprofile: <http://vivo.brown.edu/ontology/profile#>
        PREFIX blocal: <http://vivo.brown.edu/ontology/vivo-brown/>
        PREFIX rdfs:     <http://www.w3.org/2000/01/rdf-schema#>

        SELECT DISTINCT ?fac ?label
        WHERE {
                ?fac a vivo:FacultyMember .
                ?fac rdfs:label ?label .
        }
        """)
    results = sparql.query().convert()
    out = list({ (result['fac']['value'], result['label']['value'])
                for result in results["results"]["bindings"] })
    return out

def department_data():
    sparql.setQuery("""
        PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
        PREFIX vivo: <http://vivoweb.org/ontology/core#>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX bprofile: <http://vivo.brown.edu/ontology/profile#>
        PREFIX blocal: <http://vivo.brown.edu/ontology/vivo-brown/>
        PREFIX rdfs:     <http://www.w3.org/2000/01/rdf-schema#>

        SELECT DISTINCT ?dept ?label
        WHERE {
                ?fac a vivo:FacultyMember .
                ?fac blocal:hasAffiliation ?dept .
                ?dept rdfs:label ?label .
        }
        """)
    results = sparql.query().convert()
    out = list({ (result['dept']['value'], result['label']['value'])
                for result in results["results"]["bindings"] })
    return out

class Data(object):

    def __init__(self):
        self.faculty = None
        self.departments = None
        self.terms = None
        self.affiliations = None
        self.interests = None
        self.load()

    def load(self):
        self.terms = pd.DataFrame(
            data=term_data(), columns=['term_uri', 'term_label'])
        self.faculty = pd.DataFrame(
            data=faculty_data(), columns=['fac_uri', 'fac_label'])
        self.departments = pd.DataFrame(
            data=department_data(), columns=['dept_uri', 'dept_label'])
        self.interests = pd.DataFrame(
            data=faculty_terms_data(), columns=['fac_uri', 'term_uri'])
        self.affiliations = pd.DataFrame(
            data=faculty_affiliations_data(), columns=['fac_uri', 'dept_uri'])

    def summary(self):
        dept_aff = self.departments.merge(
                                self.affiliations, on='dept_uri', how='left')
        dept_faccount = dept_aff.groupby('dept_uri').size().reset_index()
        dept_termcount = dept_aff.merge(
                                self.interests, on='fac_uri', how='left') \
                             .groupby('dept_uri').size().reset_index()
        dept_summ = self.departments.merge(
                        dept_faccount, on='dept_uri', how='left') \
                        .merge(dept_termcount, on='dept_uri', how='left')
        dept_summ.columns = [ 'dept_uri', 'dept_label', 'fac_cnt', 'term_cnt' ]
        return dept_summ.to_dict('records')