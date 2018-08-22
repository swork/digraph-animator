# digraph-animator

A simple library of code to animate abstract digraphs (and
non-directional graphs, cyclic or acyclic), visually floating nodes
around by parameterized rules:

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
  the substrate. Specializations might introduce additional forces and
  constraints.

- A system for SVG visual representation of nodes and edges is
  included. Other representations are pluggable (statement of intent).

Default parameters are supplied by code. Node types can be inferred or
determined by annotations, with parameters associated with node type
overriding defaults. Individual nodes can supply parameters overriding
node-type parameters (or defaults).

Small Brownian-motion forces are applied to nodes on occasion to keep
things interesting.



## Schema

Edges (and nodes) are represented by `Edge` items in a dataset. Each
associates a `ref` value, which identifies a node, with another node
(possibly that same node); and with a boolean `directed`, default
false.

Nodes are not explicitly defined, existing only as the `ref` and
`Edge` targets of annotations.

This example Edge item (represented in JSON) implicitly defines two
nodes with `id` values "a" and "b":

```javascript
{
  "Edge": {
    "ref": "a",
    "Edge": "b"
  }
}
```

The nodes "a" and "b" here exist because they are referenced by this
Edge annotation. They might also be referenced by other annotations.

Edge items in the database are implicitly unordered, though extensions
and implementations may impose an ordering for purposes beyond those
of the base digraph-animator system.

`Edge` items are described by Extension item
`["digraph-animator","Edge"]`, an annotation instance described below.

### Abstract annotation class

Edges are instances of abstract annotations, associating a `ref` value
(an id-reference referring to a node) with another node and with an
optional `directed` boolean. Edges may also have an `id` value. The
literal string "Edge" is a `schema_identifier` value identifying this
annotation as being of type Edge. (In the JSON schema this string also
keys the target id-reference value.)

More generally, annotations associate an id-reference in a "ref" field
with a `schema_identifier` string and other information implied by the
particular `schema_identifier` value.

#### `id` values

An annotation may have an `id` value, a string which if present must
be unique within the dataset. The `id` value of an annotation may
appear in the `ref` field of other annotations, or of itself (unless
disallowed in specific usages).

#### `ref` values

`ref` values are strings or string pairs.

- A bare-string `ref` value uniquely identifies an annotation item
within the dataset containing the string, by comparing equal to the
`id` value of that annotation; or it identifies a node implicit in
that dataset.

- Pairs of strings uniquely identify an item (annotation or node) within
a specified dataset.

  - The first string of a pair is the key to a tinyurl.com mapping, the
value of which gives a URL resolving to a dataset. (The specific
requirements of the corresponding URL endpoints are not yet defined.)

  - The second string is the `id` value of an item (node or annotation) within that dataset.

#### `schema_identifier` values

`schema_identifier` keys are strings corresponding to Extension
annotations (explicit in the dataset, or implicit by definition here;
or implicit by definition elsewhere, supporting implementation code).

Each `schema_identifier` values used in a dataset SHOULD appear in an
Extension annotation in the dataset, specifically in the Extension
field of that annotation. (Implementations get coded to expectations
of the Extension schema details, not to the Extension annotations
themselves; but the Extension annotations' "version" fields can help
validate that the schema as used in the dataset meets those
expectations.)

### Extensions

Extensions are concrete subclasses of the abstract annotations
described above. The extension Edge is described informally above, and
its JSON definition is given below.

More formally, a schema extension is an annotation whose
`schema_identifier` string is mentioned in an "Extension" annotation
(the schema definition) that describes its content.

`schema_identifier` strings that are not recognized by a particular
implementation can be considered conformant and ignored by that
implementation.

A schema extension object contains only a "version" field actionable
to implementations. If present its string value conforms to the
requirements of semver.org, version 2. Implementations can choose to
ignore dataset objects associated with a schema extension whose
version suggests the implementation might misinterpret known fields
(in practice this means the "major" version number does not match
expectations).

All other fields of a schema extension object serve as normative
documentation. There is no requirement that `schema_identifier`
strings appearing in the dataset have corresponding "Extension" schema
extensions.

By convention schema extensions beginning with a capital
roman-alphabet letter (Unicode code points 0040 through 005a) are
reserved for this digraph-animator definition document. Schema
extensions supplied by other sources SHOULD begin with character
outside of this range, and ideally the initial sequence of characters
should serve as a namespace for extensions from that source.

The extension Extension is self-referential so explicit formal definition
is a little silly; but it might look something like this (in JSON):

```javascript
{
  "Extension": {
    "id": "Extension/1.0.0",
    "ref": ["digraph-animator": "Extension/1.0.0"],
    "Extension": "Extension",
    "version": "1.0.0",
    "other-info": "Associates schema_identifiers with a version string for implementation validation, and with human-readable documentation."
  }
}
```

(Actual instances of Extension annotations include the
schema_identifier string as the value of the Extension field, and also
conventionally include a field with the schema_identifier as its
key. Since JSON doesn't allow duplicate keys this convention can't be
applied to the Extension annotation's own instance. I've substituted
"other-info" here instead.)

#### Extension "Edge"

#### Extension "Class"

#### Extension "Prototype"

### Nodes

A node is a virtual object with an `id` value which might be
referenced in `ref` values of annotations, `Edge` values of edges, or
elsewhere in schema extensions.




## Schema instances: JSON

In JSON the abstract schema is represented by an unordered collection
of objects:

```javascript
{
  "id": "string",
  "ref": "string" (or ["string", "string] tuple),
  schema_identifier: {
    ...
  }
}
```

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

A container object may have the string "ref" as a key. If a schema
object is contained in an enclosing container object AND that
container includes a "ref" key, the schema object MAY omit its `ref`
item, inheriting the `ref` value of the container instead.

Here's a rewrite of an earlier example defining two nodes with an edge
between them, this time in a container object. The `id` is omitted, so
the edge can't be referenced elsewhere in the dataset:

```javascript
{
  "ref": "a",
  "Edge": {
    "Edge": "b"
  }
}
```

### Extensions

#### The "Edge" extension

At core of the digraph-animator schema is the Edge extension:

```javascript
{
  "Extension": {
    "id": ["digraph-animator", "Edge/1.0.0"],
    "Extension": "Edge",
    "version": "1.0.0",
    "Edge": "An `id` string or [source, `id`] tuple identifying the target of this (di-)graph edge (a logical linkage between the `ref` node and this `Edge` node).",
    "directed": "A boolean indicating the edge is directed, from `ref` to `Edge` target. Default if omitted is supplied by context, or false."
  }
}
```


