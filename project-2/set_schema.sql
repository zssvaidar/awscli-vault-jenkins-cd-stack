
\set DATABASE 'ecom'
\set USERNAME 'medusa'
\set SCHEMA_NAME 'medusa'

\c :"DATABASE"

CREATE SCHEMA IF NOT EXISTS :"SCHEMA_NAME";

\dn
