import { poseidon2 } from "poseidon-lite"
import LeanIMT from "../lean-imt"

describe("Lean IMT", () => {
    // If you change this value you need to calculate
    // the new expected roots below.
    const treeSize = 5

    const leaves = Array.from(Array(treeSize).keys()).map(BigInt)
    const poseidon = (a: bigint, b: bigint) => poseidon2([a, b])

    const roots: bigint[] = new Array(2)

    beforeAll(() => {
        // Expected root value after 5 insertions.
        {
            const n1_0 = poseidon(leaves[0], leaves[1])
            const n1_1 = poseidon(leaves[2], leaves[3])
            const n2_0 = poseidon(n1_0, n1_1)
            roots[0] = poseidon(n2_0, leaves[4])
        }
        // Expected root value after 5 updates.
        {
            const n1 = poseidon(BigInt(0), BigInt(0))
            const n2 = poseidon(n1, n1)
            roots[1] = poseidon(n2, BigInt(0))
        }
    })

    describe("# new LeanIMT", () => {
        it("Should not initialize a tree if the parameters are wrong", () => {
            const fun1 = () => new LeanIMT(undefined as any)
            const fun2 = () => new LeanIMT(1 as any)
            const fun3 = () => new LeanIMT(poseidon, "string" as any)

            expect(fun1).toThrow("Parameter 'hash' is not defined")
            expect(fun2).toThrow("Parameter 'hash' is not a function")
            expect(fun3).toThrow("Parameter 'leaves' is not an Array instance")
        })

        it("Should initialize a tree", () => {
            const tree = new LeanIMT(poseidon)

            expect(tree.root).toBeUndefined()
            expect(tree.depth).toBe(0)
            expect(tree.leaves).toEqual([])
            expect(tree.size).toBe(0)
        })

        it("Should initialize a tree with a custom type", () => {
            const poseidon = (a: string, b: string) => poseidon2([a, b]).toString()
            const tree = new LeanIMT<string>(poseidon)

            expect(tree.root).toBeUndefined()
            expect(tree.depth).toBe(0)
            expect(tree.leaves).toEqual([])
            expect(tree.size).toBe(0)
        })

        for (let treeSize = 100; treeSize < 116; treeSize += 1) {
            it(`Should initialize a tree with ${treeSize} leaves`, () => {
                const leaves = Array.from(Array(treeSize).keys()).map(BigInt)
                const tree1 = new LeanIMT(poseidon, leaves)
                const tree2 = new LeanIMT(poseidon)

                for (const leaf of leaves) {
                    tree2.insert(BigInt(leaf))
                }

                expect(tree1.root).toEqual(tree2.root)
                expect(tree1.depth).toBe(Math.ceil(Math.log2(treeSize)))
                expect(tree1.size).toBe(treeSize)
            })
        }
    })

    describe("# indexOf", () => {
        it(`Should not return any value if the index is not defined`, () => {
            const tree = new LeanIMT(poseidon)

            const fun = () => tree.indexOf(undefined as any)

            expect(fun).toThrow("Parameter 'leaf' is not defined")
        })

        it("Should return the index of a leaf", () => {
            const tree = new LeanIMT(poseidon, leaves)

            const index = tree.indexOf(BigInt(2))

            expect(index).toBe(2)
        })
    })

    describe("# has", () => {
        it(`Should not return any value if the leaf is not defined`, () => {
            const tree = new LeanIMT(poseidon)

            const fun = () => tree.has(undefined as any)

            expect(fun).toThrow("Parameter 'leaf' is not defined")
        })

        it("Should return true if the leaf exists", () => {
            const tree = new LeanIMT(poseidon, leaves)

            const result = tree.has(BigInt(2))

            expect(result).toBe(true)
        })

        it("Should return false if the leaf does not exist", () => {
            const tree = new LeanIMT(poseidon, leaves)

            const result = tree.has(BigInt(999))

            expect(result).toBe(false)
        })
    })

    describe("# insert", () => {
        it(`Should not insert any leaf if it is not defined`, () => {
            const tree = new LeanIMT(poseidon)

            const fun = () => tree.insert(undefined as any)

            expect(fun).toThrow("Parameter 'leaf' is not defined")
        })

        it(`Should insert 1 leaf`, () => {
            const tree = new LeanIMT(poseidon)

            tree.insert(BigInt(1))

            expect(tree.root).toBe(BigInt("1"))
        })

        it(`Should insert ${treeSize} leaves`, () => {
            const tree = new LeanIMT(poseidon)

            for (let i = 0; i < treeSize; i += 1) {
                tree.insert(BigInt(i))

                expect(tree.size).toBe(i + 1)
            }

            expect(tree.root).toBe(roots[0])
        })
    })

    describe("# insertMany", () => {
        it(`Should not insert any leaf if the list of leaves is not defined`, () => {
            const tree = new LeanIMT(poseidon)

            const fun = () => tree.insertMany(undefined as any)

            expect(fun).toThrow("Parameter 'leaves' is not defined")
        })

        it(`Should not insert any leaf if the list of leaves is not a list`, () => {
            const tree = new LeanIMT(poseidon)

            const fun = () => tree.insertMany("uoe" as any)

            expect(fun).toThrow("Parameter 'leaves' is not an Array instance")
        })

        it(`Should not insert any leaf if the list of leaves is empty`, () => {
            const tree = new LeanIMT(poseidon)

            const fun = () => tree.insertMany([])

            expect(fun).toThrow("There are no leaves to add")
        })

        it(`Should insert ${treeSize} leaves at once`, () => {
            const tree = new LeanIMT(poseidon)

            tree.insertMany(leaves)

            expect(tree.root).toBe(roots[0])
        })
    })

    describe("# update", () => {
        it(`Should not update any leaf if the parameters are not defined`, () => {
            const tree = new LeanIMT(poseidon, leaves)

            const fun1 = () => tree.update(undefined as any, BigInt(1))
            const fun2 = () => tree.update(1, undefined as any)

            expect(fun1).toThrow("Parameter 'index' is not defined")
            expect(fun2).toThrow("Parameter 'newLeaf' is not defined")
        })

        it(`Should not update any leaf if the index is not a number`, () => {
            const tree = new LeanIMT(poseidon, leaves)

            const fun = () => tree.update("uoe" as any, BigInt(3))

            expect(fun).toThrow("Parameter 'index' is not a number")
        })

        it(`Should insert 1 leaf`, () => {
            const tree = new LeanIMT(poseidon, [BigInt(0), BigInt(1)])

            tree.update(0, BigInt(2))

            expect(tree.root).toBe(poseidon(BigInt(2), BigInt(1)))
        })

        it(`Should update ${treeSize} leaves`, () => {
            const tree = new LeanIMT(poseidon, leaves)

            for (let i = 0; i < treeSize; i += 1) {
                tree.update(i, BigInt(0))
            }

            expect(tree.root).toBe(roots[1])
        })
    })

    describe("# generateProof", () => {
        it(`Should not generate any proof if the index is not defined`, () => {
            const tree = new LeanIMT(poseidon, leaves)

            const fun = () => tree.generateProof(undefined as any)

            expect(fun).toThrow("Parameter 'index' is not defined")
        })

        it(`Should not generate any proof if the index is not a number`, () => {
            const tree = new LeanIMT(poseidon, leaves)

            const fun = () => tree.generateProof("uoe" as any)

            expect(fun).toThrow("Parameter 'index' is not a number")
        })

        it("Should not generate any proof if the leaf does not exist", () => {
            const tree = new LeanIMT(poseidon, leaves)

            const fun = () => tree.generateProof(999)

            expect(fun).toThrow("The leaf at index '999' does not exist in this tree")
        })

        it("Should generate a valid proof", () => {
            const tree = new LeanIMT(poseidon, leaves)

            const proof = tree.generateProof(3)

            expect(proof.leaf).toBe(tree.leaves[3])
            expect(proof.root).toBe(tree.root)
            expect(tree.verifyProof(proof)).toBe(true)
        })

        it(`Should generate ${treeSize} valid proof`, () => {
            const tree = new LeanIMT(poseidon, leaves)

            for (let i = 0; i < treeSize; i += 1) {
                const proof = tree.generateProof(i)

                expect(proof.leaf).toBe(tree.leaves[i])
                expect(proof.root).toBe(tree.root)
                expect(tree.verifyProof(proof)).toBe(true)
            }
        })
    })

    describe("# verifyProof", () => {
        it(`Should not verify any proof if the proof is not defined`, () => {
            const tree = new LeanIMT(poseidon, leaves)

            const fun = () => tree.verifyProof(undefined as any)

            expect(fun).toThrow("Parameter 'proof' is not defined")
        })

        it(`Should not verify any proof if the proof parameters are not defined`, () => {
            const tree = new LeanIMT(poseidon, leaves)
            const proof = tree.generateProof(3)

            const fun1 = () => tree.verifyProof({ ...proof, root: undefined } as any)
            const fun2 = () => tree.verifyProof({ ...proof, leaf: undefined } as any)
            const fun3 = () => tree.verifyProof({ ...proof, siblings: undefined } as any)
            const fun4 = () => tree.verifyProof({ ...proof, index: undefined } as any)

            expect(fun1).toThrow("Parameter 'proof.root' is not defined")
            expect(fun2).toThrow("Parameter 'proof.leaf' is not defined")
            expect(fun3).toThrow("Parameter 'proof.siblings' is not defined")
            expect(fun4).toThrow("Parameter 'proof.index' is not defined")
        })

        it("Should not verify any proof if proof.siblings is not a list", () => {
            const tree = new LeanIMT(poseidon, leaves)
            const proof = tree.generateProof(3)

            const fun = () => tree.verifyProof({ ...proof, siblings: "string" as any })

            expect(fun).toThrow("Parameter 'proof.siblings' is not an Array instance")
        })

        it("Should not verify any proof if proof.index is not a number", () => {
            const tree = new LeanIMT(poseidon, leaves)
            const proof = tree.generateProof(3)

            const fun = () => tree.verifyProof({ ...proof, index: "string" as any })

            expect(fun).toThrow("Parameter 'proof.index' is not a number")
        })

        it("Should verify a valid proof", () => {
            const tree = new LeanIMT(poseidon, leaves)

            const proof = tree.generateProof(3)

            expect(tree.verifyProof(proof)).toBe(true)
            expect(LeanIMT.verifyProof(proof, poseidon)).toBe(true)
        })

        it("Should reject a proof with incorrect hash function", () => {
            const tree = new LeanIMT(poseidon, leaves)

            const proof = tree.generateProof(3)

            function badHash(a: bigint, b: bigint): bigint {
                return a + b
            }
            expect(LeanIMT.verifyProof(proof, badHash)).toBe(false)
        })
    })

    describe("# import/export", () => {
        it("Should export a tree", () => {
            const tree = new LeanIMT(poseidon, leaves)

            const nodes = tree.export()

            expect(typeof nodes).toBe("string")
            expect(JSON.parse(nodes)).toHaveLength(4)
            expect(JSON.parse(nodes)[0]).toHaveLength(5)
        })

        it("Should not import a tree if the required parameters are not valid", () => {
            const tree = new LeanIMT(poseidon, leaves)
            const nodes = tree.export()

            const fun1 = () => LeanIMT.import(undefined as any, nodes)
            const fun2 = () => LeanIMT.import(poseidon, undefined as any)
            const fun3 = () => LeanIMT.import("string" as any, nodes)
            const fun4 = () => LeanIMT.import(poseidon, 1 as any)
            const fun5 = () => LeanIMT.import(poseidon, nodes, "string" as any)

            expect(fun1).toThrow("Parameter 'hash' is not defined")
            expect(fun2).toThrow("Parameter 'nodes' is not defined")
            expect(fun3).toThrow("Parameter 'hash' is not a function")
            expect(fun4).toThrow("Parameter 'nodes' is not a string")
            expect(fun5).toThrow("Parameter 'map' is not a function")
        })

        it("Should import a tree converting node types to number", () => {
            const hash = (a: number, b: number) => a + b
            const tree1 = new LeanIMT<number>(hash, [1, 2, 3])
            const nodes = tree1.export()

            const tree2 = LeanIMT.import<number>(hash, nodes, Number)

            tree1.insert(4)
            tree2.insert(4)

            expect(tree2.depth).toBe(tree1.depth)
            expect(tree2.size).toBe(tree1.size)
            expect(tree2.root).toBe(tree1.root)
            expect(tree2.indexOf(2)).toBe(tree1.indexOf(2))
        })

        it("Should import a tree converting node types to booleans", () => {
            const hash = (a: boolean, b: boolean) => a && b
            const tree1 = new LeanIMT<boolean>(hash, [true, false, true])
            const nodes = tree1.export()

            const tree2 = LeanIMT.import<boolean>(hash, nodes, Boolean)

            tree1.insert(true)
            tree2.insert(true)

            expect(tree2.depth).toBe(tree1.depth)
            expect(tree2.size).toBe(tree1.size)
            expect(tree2.root).toBe(tree1.root)
            expect(tree2.indexOf(false)).toBe(tree1.indexOf(false))
        })

        it("Should import a tree", () => {
            const tree1 = new LeanIMT(poseidon, leaves)
            const nodes = tree1.export()

            const tree2 = LeanIMT.import(poseidon, nodes)

            tree1.insert(BigInt(4))
            tree2.insert(BigInt(4))

            expect(tree2.depth).toBe(tree1.depth)
            expect(tree2.size).toBe(tree1.size)
            expect(tree2.root).toBe(tree1.root)
            expect(tree2.indexOf(BigInt(2))).toBe(tree1.indexOf(BigInt(2)))
        })
    })
})