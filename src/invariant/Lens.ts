function id<A>(x: A) {
  return x;
}

type Fn<A, B> = (a: A) => B;

export interface Traversal<S, A> {
  contents: (s: S) => A[];
  fill: (as: A[], s: S) => S;
}

export interface Lens<S, A> {
  get: (s: S) => A;
  set: (a: A, s: S) => S;
}

export function lens<S, A>(
  get: (s: S) => A,
  set: (a: A, s: S) => S
): Lens<S, A> {
  return {
    get,
    set
  };
}

export function lensToTraversal<S, A>(lens: Lens<S, A>): Traversal<S, A> {
  return {
    contents: s => [lens.get(s)],
    fill: (xs, s) => lens.set(xs[0], s)
  };
}

function isLens<S, A>(v: any): v is Lens<S, A> {
  return (
    v !== null && typeof v.get === "function" && typeof v.set === "function"
  );
}

export function lensProp<S, K extends keyof S>(name: K): Lens<S, S[K]> {
  return lens(s => s[name], (a, s) => Object.assign({}, s, { [name]: a }));
}

export function index<A>(i: number): Lens<A[], A> {
  return lens(
    xs => xs[i],
    (x, xs) => xs.map((old, ci) => (ci === i ? x : old))
  );
}

export function composeL<S, A, X>(
  parent: Lens<S, A>,
  child: Lens<A, X>
): Lens<S, X> {
  return lens(
    s => child.get(parent.get(s)),
    (y, s) => parent.set(child.set(y, parent.get(s)), s)
  );
}

export function composeT<S, A, X>(
  parent: Traversal<S, A>,
  child: Traversal<A, X>
): Traversal<S, X> {
  return {
    contents: s =>
      [].concat(...(parent.contents(s).map(a => child.contents(a)) as any)),
    fill(ys, s) {
      let yi = 0;
      const bs = parent.contents(s).map(a => {
        const xs = child.contents(a);
        //console.log("filling", a, ys, "from", yi, "to", xs.length);
        const b = child.fill(ys.slice(yi, yi + xs.length), a);
        yi += xs.length;
        return b;
      });
      return parent.fill(bs, s);
    }
  };
}

export function compose<S, A, X>(
  parent: Lens<S, A>,
  child: Lens<A, X>
): Lens<S, X>;
export function compose<S, A, X>(
  parent: Lens<S, A>,
  child: Traversal<A, X>
): Traversal<S, X>;
export function compose<S, A, X>(
  parent: Traversal<S, A>,
  child: Traversal<A, X>
): Traversal<S, X>;
export function compose<S, A, X>(
  parent: Traversal<S, A>,
  child: Lens<A, X>
): Traversal<S, X>;

export function compose(parent: any, child: any) {
  if (isLens(parent) && isLens(child)) {
    return composeL(parent, child);
  } else if (isLens(parent)) {
    return composeT(lensToTraversal(parent), child);
  } else if (isLens(child)) {
    return composeT(parent, lensToTraversal(child));
  } else {
    return composeT(parent, child);
  }
}

export function view<S, A>(optic: Lens<S, A>, s: S): A {
  return optic.get(s);
}

export function toList<S, A>(optic: Traversal<S, A>, s: S) {
  return optic.contents(s);
}

export function over<S, A>(optic: Lens<S, A>, f: Fn<A, A>): (s: S) => S;
export function over<S, A>(optic: Traversal<S, A>, f: Fn<A, A>): (s: S) => S;
export function over(optic: any, f: Fn<any, any>) {
  return (s: any) => {
    if (isLens(optic)) {
      return optic.set(f(optic.get(s)), s);
    }
    return optic.fill(optic.contents(s).map(f), s);
  };
}

export function set<S, A>(optic: Lens<S, A>, a: A): (s: S) => S;
export function set<S, A>(optic: Traversal<S, A>, a: A): (s: S) => S;
export function set(optic: any, a: any) {
  return over(optic, _ => a);
}

export function append<S, A>(optic: Lens<S, A[]>, a: A): (s: S) => S {
  return over(optic, xs => xs.concat(a));
}

export function removeAt<S, A>(
  optic: Lens<S, A[]>,
  index: number
): (s: S) => S {
  return over(optic, xs => xs.slice(0, index).concat(xs.slice(index + 1)));
}

export function insertAt<S>(
  optic: Lens<S[], S[]>,
  index: number,
  s: S
): (xs: S[]) => S[] {
  return over<S[], S[]>(optic, xs =>
    xs
      .slice(0, index + 1)
      .concat(s)
      .concat(xs.slice(index + 1))
  );
}

const idLens: Lens<any, any> = lens(id, id);
export const each = {
  contents: id,
  fill: id
};

export type LensProxy<P, S> = Lens<P, S> &
  { [K in keyof S]: LensProxy<P, S[K]> } & {
    $each: S extends Array<infer A> ? TraversalProxy<P, A> : never;
  };

export type TraversalProxy<P, S> = Traversal<P, S> &
  { [K in keyof S]: TraversalProxy<P, S[K]> } & {
    $each: S extends Array<infer A> ? TraversalProxy<P, A> : never;
  };

// S S A A
export function lensProxy<S, P = S>(
  parent: Lens<P, S> = idLens as any
): LensProxy<P, S> {
  return new Proxy(parent as any, {
    get(target: any, key: any) {
      if (key in target) return target[key];
      if (key === "$each") {
        return lensProxy(
          compose(
            parent as any,
            each as any
          )
        );
      }
      return lensProxy(
        compose<any, any, any>(
          parent as any,
          Number(key) === +key ? index(+key) : lensProp(key)
        )
      );
    }
  });
}
