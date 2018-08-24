const semver = require('semver')

class DigraphItemBase {
    constructor(spec, schema_identifier) {
        this.schema_identifier = schema_identifier
        this.id = spec.id
        if (spec.ref) {
            this.ref = spec.ref
        }
    }
}

class DigraphAnimator {

    ///
    // Normalize and index the input digraph array
    //
    constructor(digraph) {
        this.extensions_byID = {}
        this.extensions_byName = {}
        this.items = {}
        this.nodes = {}
        this.edges = {}

        // Each object in the array can have .id and .ref elements
        // either directly or in the inner schema_identifier: {}
        // subobject. Normalize them to the outer object, supplying
        // Symbol() values for missing ids
        let remainder = []
        for (let idx in digraph) {
            remainder.push(this.preProcessItem(digraph[idx]))
        }
        digraph = remainder

        // Filter Extensions out to index objects
        remainder = []
        for (let idx in digraph) {
            console.log("ctor loop 1 idx:", idx, "item:", digraph[idx])
            let keeper = this.processExtensions(digraph[idx])
            if (keeper) {
                remainder.push(keeper)
            }
        }
        digraph = remainder

        // Filter out Containers, expanding their content
        remainder = []
        for (let idx in digraph) {
            let keepers = this.expandContainers(digraph[idx])
            if (keepers) {
                remainder = remainder.concat(keepers)
            }
        }
        digraph = remainder

        // Filter out and process explicit Nodes. After this, a
        // missing ref elsewhere means "Instantiate an implicit Node
        // with this ID".
        remainder = []
        for (let idx in digraph) {
            let keeper = this.processNodes(digraph[idx])
            if (keeper) {
                remainder.push(keeper)
            }
        }
        digraph = remainder

        // Index edges and other annotations, and do per-item
        // processing. Includes instantiating implicit Nodes
        // (referenced but not explicitly present in the dataset)
        for (let idx in digraph) {
            this.processItem(digraph[idx])
        }
    }

    preProcessItem(originalItem) {
        let id, ref, schema_identifier

        // Get schema_identifier from outer object
        for (idx in originalItem) {
            if (idx === 'id') {
                id = originalItem['id']
            } else if (idx === 'ref') {
                ref = originalItem['ref']
            } else {
                if (schema_identifier) {
                    console.log("Funky item has too many keys:", originalItem)
                    throw "Funky item"
                }
                schema_identifier = idx
            }
        }

        console.log("preprocess si:", schema_identifier, "in:", originalItem)

        if (schema_identifier === undefined) {
            console.log("Funky item has no schema_identifier", originalItem)
            throw "Funky item"
        }

        let inner = originalItem[schema_identifier]
        
        // Get ID, REF from inner object
        if (inner.id === undefined) {
            if (id === undefined) {
                id = Symbol(DigraphAnimator.symbolCounter)  // invent an ID
                DigraphAnimator.symbolCounter += 1
            }
        } else if (id !== undefined) {
            console.log("Funky item has outer id and inner id:", originalItem)
            throw "Funky item"
        } else {
            id = inner.id
        }

        if (inner.ref !== undefined) {
            ref = inner.ref  // inner overrides outer
        }

        delete inner.id
        delete inner.ref

        let rewrite = {
            'id': id,
            [schema_identifier]: inner
        }
        if (ref) {
            rewrite['ref'] = ref
        }

        return rewrite
    }

    ///
    // item is { schema_identifier: innerOjb }. If Extension, validate
    // and handle.
    //
    processExtensions(item) {
        let si = Object.getOwnPropertyNames(item)[0]
        if (si === 'Extension') {
            // .id might be a Symbol, so non-enumerable
            console.log("processExtensions id:", item[si].id)
            this.items[item[si].id] = this.process_Extension(item[si])
            return undefined
        }
        return item
    }

    ///
    // If Container, return expansion
    //
    expandContainers(item) {
        return item  // TBD
    }

    ///
    // If Node, process/register it and filter it out of the input
    //
    processNodes(item) {
        let si = Object.getOwnPropertyNames(item)[0]
        if (si === 'Node') {
            console.log("processNodes id:", item[si].id)
            this.items[item[si].id] = this.process_Node(item[si])
            return undefined
        }
        return item
    }

    ///
    // Edges and other annotations can refer to Nodes that aren't
    // explicit in the dataset. This function instantiates a node
    // given an .id for it. It's called during annotation processing,
    // after all explicit Nodes have been found and registered, when a
    // .ref (or other reference parameter) finds no matching Node.
    //
    instantiateMissingNode(id) {
        if (this.items[id] !== undefined) {
            console.log("instantiateMissingNode but not missing, id:", id)
            throw "instantiateMissingNode but not missing"
        }
        this.items[id] = this.process_Node({
            'Node': {
                'id': id
            }
        })
    }

    ///// Per-item processing. Extensions have already been handled,
    ///// Collections have been expanded, explicit Nodes have been
    ///// processed.

    processItem(item) {
        let si = Object.getOwnPropertyNames(item)[0]
        console.log('processItem si:', si)

        if (item[si].ref !== undefined && this.items[item[si].ref] === undefined) {
            this.instantiateMissingNode(item[si].ref)
        }
        
        let fnname = 'process_' + si
        if (this[fnname]) {
            this.items[item[si].id] = this[fnname](item)
        } else {
            console.log("Unexpected item unhandled, continuing:", si)
            this.items[item[si].id] = item
        }
    }
    
    process_Extension(item) {
        let validator = DigraphAnimator.extensionVersions[item.version]
        if (validator) {
            if ( ! semver(item.version).satisfies(validator)) {
                console.log('Extension:', item[''], 'version:', item['version'], "isn't", validator)
                throw "Unsatisfied Extension version"
            }
        }

        if (this.extensions_byID[item.id]) {
            throw "Duplicate extension ID"
        }
        this.extensions_byID[item.id] = item

        if (this.extensions_byName[item['']]) {
            throw "Duplicate extension name"
        }
        this.extensions_byName[item['']] = item
        return item
    }

    process_Node(item) {
        let inner = item.Node
        console.log('process_Node', inner)
        this.nodes[inner.id] = item
        return item
    }

    process_Edge(item) {
        let inner = item.Edge
        console.log('process_Edge', item)
        this.edges[inner.id] = item
        
        if (inner.ref === undefined) {
            throw "Edge with no ref"
        } else {
            if (this.items[inner.ref] === undefined) {
                this.instantiateMissingNode(inner.ref)
            }
        }
        
        if (inner[''] === undefined) {
            throw "Edge with no target"
        } else {
            if (this.items[inner['']] === undefined) {
                this.instantiateMissingNode(inner[''])
            }
        }
        
        return item
    }

}

DigraphAnimator.symbolCounter = 0
DigraphAnimator.extensionVersions = {
    'Node': '=1',
    'Edge': '=1',
    'Extension': '=1'
}

class Extension extends DigraphItemBase {
    constructor(spec) {
        super(spec, 'Extension')
        let inner = spec.Extension
        this.version = inner.version
    }
}
    
class Node extends DigraphItemBase {
    constructor(spec) {
        super(spec, 'Node')
    }
}

class Edge extends DigraphItemBase {
    constructor(spec) {
        super(spec, 'Edge')
        if (spec.ref === undefined) {
            console.log("Edge has no ref:", spec)
            throw "Edge has no ref"
        }
        let inner = spec.Edge
        this.target = inner['']
        this.directed = false
        if (inner.directed) {
            this.directed = true
        }
    }
}

DigraphAnimator.itemRegistry = {
    Extension,
    Node,
    Edge
}
    

module.exports = {
    DigraphAnimator,
    DigraphItemBase
}
