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
        this.extensionNames = {}
        this.items = {}
        this.nodes = []
        this.edges = []

        // Each object in the array can have .id and .ref elements
        // either directly or in the inner schema_identifier: {}
        // subobject. Normalize them to the outer object, supplying
        // Symbol() values for missing ids
        for (let idx in digraph) {
            this.registerNewAnnotationObject(digraph[idx])
        }

        let done = {}

        // Process Extensions first
        for (let id in this.items) {
            let item = this.items[id]
            if (item instanceof Extension) {
                item.process(this)
                done[id] = true
            }
        }
        
        // Expand Containers
        for (let id in this.items) {
            let item = this.items[id]
            if (item instanceof Container) {
                item.process(this)
                done[id] = true
            }
        }

        // Process everything else.
        for (let id in this.items) {
            if ( ! done[id]) {
                let item = this.items[id]
                item.process(this)
            }
        }
    }

    registerNewAnnotationObject(originalItem) {
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

        if (this.items[rewrite.id]) {
            console.log("Duplicate item id:", originalItem)
            throw "Duplicate item id"
        }

        let ctor = DigraphAnimator.extensionRegistry[schema_identifier]
        if (ctor) {
            this.items[id] = new ctor(rewrite)
        } else {
            this.items[id] = new DigraphItemBase(rewrite, schema_identifier)
        }
    }

    ///
    // Edges and other annotations can refer to Nodes that aren't
    // explicit in the dataset. This function instantiates a node
    // given an .id for it. It's called during annotation processing,
    // after all explicit Nodes have been found and registered, when a
    // .ref (or other reference parameter) finds no matching Node.
    //
    instantiateMissingNode(id, processNow) {
        if (this.items[id] !== undefined) {
            console.log("instantiateMissingNode but not missing, id:", id)
            throw "instantiateMissingNode but not missing"
        }
        let newNode = this.items[id] = new Node({
            'Node': {
                'id': id
            }
        })
        if (processNow) {
            newNode.process(this)
        }
    }
}

DigraphAnimator.symbolCounter = 0
DigraphAnimator.extensionVersions = {
    Extension: '=1',
    Container: '=1',
    Node: '=1',
    Edge: '=1'
}

class Extension extends DigraphItemBase {
    constructor(spec) {
        super(spec, 'Extension')
        let inner = spec.Extension
        this.version = inner.version
        this.extensionName = inner['']
    }

    process(da) {
        let validator = DigraphAnimator.extensionVersions[this.version]
        if (validator) {
            if ( ! semver(this.version).satisfies(validator)) {
                console.log('Extension:', item[''], 'version:', item['version'], "isn't", validator)
                throw "Unsatisfied Extension version"
            }
        }

        if (da.extensionNames[this.extensionName]) {
            throw "Duplicate extension name"
        }
        da.extensionNames[this.extensionName] = this.id
    }

}
    
class Container extends DigraphItemBase {
    constructor(spec) {
        super(spec, 'Container')
    }

    process(da) {
        // expand the contents
    }
}

class Node extends DigraphItemBase {
    constructor(spec) {
        super(spec, 'Node')
    }

    process(da) {
        da.nodes.push(this.id)
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

    process(da) {
        da.edges.push(this.id)
        let processNow__YES = true
        
        if (this.ref === undefined) {
            throw "Edge with no ref"
        } else {
            if (da.items[this.ref] === undefined) {
                da.instantiateMissingNode(this.ref, processNow__YES)
            }
        }
        
        if (this.target === undefined) {
            throw "Edge with no target"
        } else {
            if (da.items[this.target] === undefined) {
                da.instantiateMissingNode(this.target, processNow__YES)
            }
        }
    }
}

DigraphAnimator.extensionRegistry = {
    Extension,
    Container,
    Node,
    Edge
}
    

module.exports = {
    DigraphAnimator,
    DigraphItemBase
}
