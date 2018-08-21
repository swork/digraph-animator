# digraph-animator

Animate abstract digraphs (and non-directional graphs, cyclic or
acyclic), visually floating nodes around by parameterized rules:

- Nodes try not to cover each other. (Requires nodes knowing their
  extents; bounding-box might substitute initially.)

- Nodes try to stay inside a configured area, which is not necessarily
  a viewport.

- Connected nodes try to stay a particular distance from each other,
  the measure determined by parameters associated with node
  annotations.

- Node motions are determined by forces corresponding to these rules,
  momentum responding to a mass parameter associated with nodes or
  node types, and square-of-speed viscosity parameter associated with
  the substrate.

- A system for SVG visual representation of nodes and edges is
  included. Other representations are pluggable (statement of intent).

Default parameters are supplied by code. Node types can be inferred or
determined by annotations, with parameters associated with node type
overriding defaults. Individual nodes can supply parameters overriding
node-type parameters (or defaults).

Small Brownian-motion forces are applied to nodes on occasion to keep
things interesting.

## Schema

Edges, not nodes, are represented by `Edge` items in a dataset. Each
associates a `ref` value, which identifies a node, with another node
(possibly the same node); and with a boolean `directed`, default
false. Each has an associated bare-string `id` value.

Edge items in the database are implicitly unordered, though extensions
and implementations may impose an ordering for purposes beyond those
of the base digraph-animator system.

`Edge` items are described by Extension item "Edge", itself described
in this document.

### Abstract annotation class

Edges are instances of abstract annotations, associating information
with an `ref` value (id-reference), an `Edge` value (id-reference),
and a `directed` boolean.

Annotations always have `id` values, unique within the dataset. The
`id` value of an annotation may appear in the `ref` field of other
annotations, or of itself (unless disallowed in specific usages).

Nodes are virtual objects presumed to have an `id` value, mentioned in
`ref` values of annotations, `to` values of edges, or possibly
elsewhere in schema extensions.

Visual representation mappings can leverage additional annotations
beyond those described here. The SVG representation defines some
additional annotations.

#### `id` values

`id` values are strings or string pairs. Bare strings uniquely
identify an item (annotation or node) within the dataset containing
the string. Pairs of strings uniquely identify an item within a
dataset uniquely identified by the first string of the pair.

The first string of a pair is the key to a tinyurl.com mapping, the
value of which gives a URL resolving to a dataset. (The specific
requirements of the corresponding URL endpoints are not yet defined.)

## Schema instances: JSON

In JSON the abstract schema is represented by an unordered collection
of objects:

`
{
  "id": "string",
  "ref": "string" (or ["string", "string] tuple),
  schema_identifier: {
    ...
  }
}
`

where schema_identifier is "Extension" or a string that MAY correspond to a
schema extension that could be described by the "Extension" schema extension
defined below. The contents of the associated object would conform to
the corresponding schema description. Particular implementations
operate on a particular set of schema extensions; the schema extension
definitions themselves are not required for correct operation; what is
required is that the implementation's expectations match the
recognized schema extensions in use. (Explicitly including schema
extension definitions in the dataset allows validating semver.org
version strings against implementation expectations.)

### Containers

A JSON schema object MAY be contained in an enclosing container
object. A schema object may NOT itself serve as a container object. 

A container object may have the string "id" as a key. If a schema
object is contained in an enclosing container object AND that
container includes an "id" key, the schema object MAY omit its `id`
item, inheriting the `id` value of the container instead.
    
A container object may have the string "ref" as a key. If a schema
object is contained in an enclosing container object AND that
container includes a "ref" key, the schema object MAY omit its `ref`
item, inheriting the `ref` value of the container instead.

### Extensions

A schema extension is a schema object with the string "Extension" as its
`schema_identifier` and a corresponding object (the schema definition)
describing the content of schema_identifier objects in concrete
dataset instances. The `schema_identifier` being described is given in
a string-valued "schema_identifier" field.

`schema_identifier` strings that are not recognized by a particular
implementation can be considered conformant and ignored by that
implementation.

A schema extension object contains only a "version" field actionable
to implementations. If present its string value conforms to the
requirements of semver.org, version 2. Implementations can choose to
ignore dataset objects associated with a schema extension whose
version suggests the implementation might misinterpret known fields
("major" version number does not match expectations).

All other fields of a schema extension object serve as normative
documentation. There is no requirement that `schema_identifier`
strings appearing in the dataset have corresponding "Extension" schema
extensions.

By convention, schema extensions beginning with a capital
roman-alphabet letter (Unicode code points 0040 through 005a) are
reserved for this digraph-animator definition document. Schema
extensions supplied by other sources SHOULD begin with character
outside of this range, and ideally the initial sequence of characters
should serve as a namespace for extensions from that source.

#### The "Edge" extension

At core of the digraph-animator schema is the Edge extension:

`
{
  "id": ["digraph-animator", "Edge/1.0.0"],
  "ref": ["digraph-animator", "Edge/1.0.0"],
  "Extension": {
    "Extension": "Edge",
    "version": "1.0.0",
    "Edge": "An `id` string or [source, `id`] tuple identifying the target of this (di-)graph edge (a logical linkage between the `ref` node and this `Edge` node).",
    "directed": "A boolean indicating the edge is directed, from `ref` to `Edge` target. Default if omitted is supplied by context, or false."
  }
}
`


