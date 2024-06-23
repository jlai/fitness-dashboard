# Concepts

## Jotai

[Jotai](https://jotai.org/) is a state management framework based around the concept of
_atoms_, which are essentially context keys. For example, a simple atom `const countAtom = atom(0)`
would be akin to `useContext(jotaiStore)[countAtom] = 0`.

This avoids the boilerplate of having to define a big state object with all the
possible context values we'd like to keep track of, as you might in a monolithic global store
like Redux.

It also makes it easy to create derived atoms, which update whenever the atoms that it
depends on change value. Keep in mind that the atoms will _only_ update when another atom
or primitive atom changes; `atom(() => Date.now())` will initialize the first time it's
accessed and then never again.
