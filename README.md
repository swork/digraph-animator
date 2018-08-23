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

- Supports a system for SVG visual representation of nodes and
  edges. Other representations are similarly pluggable (statement of
  intent).

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

Nodes don't need explicit definitiion - they're implicit as the `ref`
and `Edge` targets of annotations. `Node` items can be defined
explicitly and serve as a container for parameters, though much the
same can be done by associating a `Prototype` items with an implicit
node's `id`. More on this below.

This example Edge item (represented in JSON) implicitly defines two
nodes with `id` values "a" and "b":

```javascript
{
  "Edge": {
    "ref": "a",
    "": "b"
  }
}
```

or, equivalently,

```javascript
{
  "ref": "a",
  "Edge": {
    "": "b"
  }
}
```

The nodes "a" and "b" here exist because they are referenced by this
Edge annotation. They might also be referenced by other annotations.

Edge items in the database are implicitly unordered, though extensions
and implementations may impose an ordering for purposes beyond those
of the base digraph-animator system.

`Edge` items are described by an Extension instance implicitly or
explicitly included in every dataset and defined below. (If explicit,
the Edge instance serves to allow processors to validate the version
of the Edge class used in the dataset matches its expectations.)

### Abstract annotation class

Edges are instances of abstract annotations, associating a `ref` value
(an id-reference referring to a node) with another node (keyed by an
empty string) and with an optional `directed` boolean. Edges may also
have an `id` value. The literal string "Edge" is a `schema_identifier`
value identifying this annotation as being of type Edge.

More generally, annotations associate an id-reference in a "ref" field
with a `schema_identifier` string and other information implied by the
particular `schema_identifier` value. Conventionally, annotations
include an item with an empty-string as its key, holding the primary
or most-important element.

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

- Pairs of strings uniquely identify an item (annotation or node)
  within a specified dataset.

  - The first string of a pair is the key to a tinyurl.com mapping,
    the value of which gives a URL resolving to a dataset. (The
    specific requirements of the corresponding URL endpoints are not
    yet defined.)

  - The second string is the `id` value of an item (node or
    annotation) within that dataset.

#### `schema_identifier` values

`schema_identifier` keys are strings corresponding to particular
Extension annotations (explicit in the dataset, or implicit by
definition here).

Each `schema_identifier` key string used in a dataset SHOULD appear in
an Extension annotation in the dataset, specifically in the Extension
field of that annotation. (Implementations get coded to expectations
of the Extension schema details, not to the Extension annotations
themselves; but the Extension annotations' "version" fields can help
validate that the schema as used in the dataset meets those
expectations.)

`schema_identifier` values are objects, the fields of which provide
parameters to the annotation instance. Processors can refer to these
parameters to adjust their handling of the associated item.

As we'll describe later, parameter values for an annotation instance
can also come from one or more Prototype annotation instances, raising
the possibility of more than one parameter with the same name but
different values, defined in more than one place, applying to the same
annotation. The rules for handling such multiple definitions depend on
the JSON data type of the parameter value:

- String-valued parameters (that is, parameters declared to be strings
  in the corresponding Extension annotation) take the value defined
  closest to annotation instance.
  
  * If the parameter appears on the instance, that value supersedes
    all others.

  * Otherwise, if the parameter appears in a Prototype annotation
    whose `ref` value matches the instance's `id` value, that value
    supersedes all others. It is an error for the same string-valued
    parameter to appear in more than one Prototype annotation having
    the same `ref` value. Processors should test for this error
    and abort if encountered.

  * Otherwise, if the instance's `id` string appears among the strings
    in a Class annotation's `refs` array and that Class annotation's
    `ref` string matches the `id` string of a Prototype annotation
    containing the parameter, that parameter value is used. It is an
    error for the same string-valued parameter to appear in more than
    one Prototype annotation so referenced. Processors should test for
    this error and abort if encountered.

- Array-valued parameters accumulate values from all possible sources
  (instances, all directly-referring Prototype instances, and all
  Prototype instances referring through Class instances).

- Object-valued parameters accumulate values from all possible sources
  (instances, all directly-referring Prototype instances, and all
  Prototype instances referring through Class instances). It is an
  error for a parameter name to appear more than once in this set of
  all possible sources. Processors should test for this error and
  abort if encountered.

- Note that all parameters have a defined type (string, array, or
  object), defined unequivocally by a corresponding Extension instance
  (whether explicit in the dataset or implicit, by definition in this
  documentation). It is an error for a parameter to appear with a
  different value type than its definition requires, or for a
  parameter to appear in more than one place with different value
  types. Processors should test for this error and abort if
  encountered.

### Extensions

Extensions are concrete subclasses of the abstract annotations
described above. The extension Edge is described informally above, and
its JSON definition is given below.

More formally, a schema extension is an annotation whose
`schema_identifier` string is mentioned in an "Extension" annotation
instance (the schema definition) that describes its content. That
instance might be explicit in the dataset or implicit, defined in this
documentation.

`schema_identifier` strings that are not recognized by a particular
implementation can be considered conformant and ignored by that
implementation.

A schema extension instance contains only a "version" field actionable
to implementations. If present its string value conforms to the
requirements of semver.org, version 2. Implementations can choose to
ignore annotations (dataset objects) associated with a schema
extension whose version suggests the implementation might misinterpret
known fields (in practice this means the "major" version number does
not match expectations).

All other fields of a schema extension object serve as normative
documentation. There is no requirement that `schema_identifier`
strings appearing in the dataset have corresponding "Extension" schema
extensions - that situation simply misses an opportunity to validate
processing code expectations against the dataset schema versions, and
to include some brief documentation of the dataset in the dataset
itself.

There must be at most one Extension in a dataset for every
schema_identifier value used in that dataset. Processors should
validate this requirement and abort if violated.

By convention schema extensions beginning with a capital
roman-alphabet letter (Unicode code points 0040 through 005a) are
reserved for this digraph-animator definition document. Schema
extensions supplied by other sources SHOULD begin with character
outside of this range, and ideally the initial sequence of characters
should serve as a namespace for extensions from that source. The
related svg processor makes use of Extensions that follow this
convention.

The extension Extension is self-referential so explicit formal definition
is a little silly; but it might look something like this (in JSON):

```javascript
{
  "id": "Extension/1.0.0",
  "ref": ["digraph-animator-base": "Extension/1.0.0"],
  "Extension": {
    "": "Extension",
    "version": "1.0.0",
    "other-info": "Associates schema_identifiers with a version string for implementation validation, and with human-readable documentation."
  }
}
```

#### Annotation: "Edge"

As discussed above, an Edge instance declares an edge and the nodes it
connects. It can include a parameter "directed", a boolean indicating
whether this edge is directed or not. The parameter "directed" can
also be applied to the Edge Extension annotation (by a Prototype
instance, or by a Class instance referencing an appropriate Prototype
instance) to change the default for all Edge annotations in a dataset
from false to true. (Note this implies a processor retrieving a remote
annotation must also retrieve the corresponding remote Extension, if
it exists, and any referencing annotations.)

#### Annotation: "Prototype"

A Prototype instance serves as a collection of parameters for other
annotation instances, to be applied to the annotation (or Node)
referenced by its `ref` string. Parameters are fields in objects,
themselves named to match Extension `schema_identifier` strings. Only
parameters found in an object whose name matches the
`schema_identifier` of the referent annotation instance are applied to
that instance. (A Prototype can contain more than one such
object-valued field, so that it can be applied to annotation instances
of more than one Extension type via Class annotations, discussed
below.)

A Prototype referencing an Extension item applies to all items in the
dataset whose `schema_identifier` matches that Extension - effectively
it provides new defaults for the included parameters..

Because Prototype instances become integral with the item they modify,
they must be retrieved and referenced any time the corresponding item
is retrieved. To support this requirement and ensure Prototype
instances are always visible when their referent items are visible,
the Prototype Extension places a restriction on its instances' `ref`
values, that they can only be a simple string (not a pair of strings,
so not a remote reference).

#### Annotation: "Class"

A Class instance applies a Prototype instance to one or more
additional referent annotations or nodess through an array-valued
`refs` parameter.

### Nodes

A node is a virtual object with an `id` value which might be
referenced in `ref` values of annotations, `Edge` values of edges, or
elsewhere in schema extensions.


## Schema instances: JSON

We've already let slip that the abstract schema is represented in JSON
by an unordered collection of objects:

```javascript
{
  schema_identifier: {
    "id": "string",
    "ref": "string" (or ["string", "string"] tuple),
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
object. A schema object MAY NOT itself serve as a container object. 

A container object may have the string "ref" as a key. If a schema
object is contained in an enclosing container object AND that
container includes a "ref" key, the schema object MAY omit its `ref`
item, inheriting the `ref` value of the container instead.

Here's a rewrite of an earlier example defining two nodes with an edge
between them, this time in a container object. An `id` is present, so
the edge can be referenced elsewhere in the dataset:

```javascript
{
  "Container": {
    "ref": "a",
    "": [
      {
        "id": "a-to-b",
        "Edge": {
          "": "b"
        }
      }
    ]
  }
}
```

### Classes

Any annotation can include an array-valued "class" entry, the elements
of which are strings. If an element matches the `id` of a Class
annotation instance, the annotation behaves as if its own `id` were
part of that Class instance's `refs` array. (This holds even if the
annotation in question doesn't explicitly define an `id`.)

### Core Extensions in JSON

Here are Extenson annotations in JSON. Actual datasets can override
these implicit definitions to indicate changes to the schema
definition; processors can use `version` items in those annotations to
confirm their expected compatibility with the updates, or to refuse to
process if major version expectations aren't met.

#### Node

```javascript
{
  "id": "Node/1.0.0",
  "ref": ["digraph-animator-base", "Node/1.0.0"],
  "Node": {
    "Extension": "Node",
    "version": "1.0.0",
    "": "Nodes are mostly targets of annotations, and aren't usually instantiated explicitly."
  }
}
```

#### Edge

```javascript
{
  "id": "Edge/1.0.0",
  "ref": ["digraph-animator-base", "Edge/1.0.0"],
  "Extension": {
    "Extension": "Edge",
    "version": "1.0.0",
    "": "An `id` string or [source, `id`] tuple identifying the \
         target of this (di-)graph edge (a logical linkage between \
         the `ref` node and this `Edge` node).",
    "directed": "A boolean indicating the edge is directed, from `ref` \
                 to `Edge` target. Default if omitted is supplied by \
                 context, or false."
  }
}
```

#### Prototype

```javascript
[
  {
    "id": "Prototype/1.0.0",
    "ref": ["digraph-animator-base": "Prototype/1.0.0"],
    "Extension": {
      "Extension": "Prototype",
      "version": "1.0.0",
      "": "An object-valued field with key matching referenced item's schema_identifier is union'd with that item."
    }
  },
  {
    "id": "example_prototype",
    "ref": "some_other_id",
    "Prototype": {
      "Node": {
        "parameter1": "Gets applied to referent some_other_id, IFF it's a Node"
      },
      "Edge": {
        "parameter2": "Gets applied to referent some_other_id, IFF it's an Edge"
      },
    }
  }
]
```

#### Class

```javascript
[
  {
    "id": "Class/1.0.0",
    "ref": ["digraph-animator-base": "Class/1.0.0"],
    "Extension": {
      "Extension": "Class",
      "version": "1.0.0",
      "": "Names this Class, for reverse-reference associations between items and Prototypes",
      "refs": ["Array", "of", "node", "or", "annotation", "ids"]
    }
  },
  {
    "ref": "some_node_id",
    "Class": {
      "": "FancyNodes",
      "refs": ["a-to-b"]
    }
  }
]
```

#### Extension

```javascript
[
  {
    "id": "Extension/1.0.0",
    "ref": ["digraph-animator-base": "Extension/1.0.0"],
    "Extension": {
      "Extension": "Extension",
      "version": "1.0.0",
      "": "Associates schema_identifiers with a version string for implementation validation, and with human-readable documentation."
    }
  },
  {
    "id": "example",
    "ref": ["digraph-animator-base": "Extension/1.0.0"],
    "Extension": {
      "": "Extension",
      "version": "1.0.0"
    },
  }
]
```
