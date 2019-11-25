import { Lens, Traversal, over, set } from "./Lens";

export type Fn<A, B> = (a: A) => B;

export type Primitive = string | number | boolean;

// Value Getters
export type Getter<S, C, A> = ((state: S, context: C) => A) | { get: Fn<S, A> };
export type Gettable<S, C, A> = Getter<S, C, A> | A;

// Update function
export type Update<S, C> = (state: S, context: C) => S;

export function isGetter<S, C, A>(value: any): value is Getter<S, C, A> {
  return (
    typeof value === "function" ||
    (value != null && typeof value.get === "function")
  );
}

export function mapGetter<S, C, A1, A2>(
  getter: Getter<S, C, A1>,
  f: Fn<A1, A2>
): Getter<S, C, A2> {
  return (s, c) => f(view(getter, s, c));
}

// Output of a component: either a state update or en event
export type Output<S, C, E> =
  | { type: "Update"; update: Update<S, C> }
  | { type: "Event"; event: E };

export function update<S, C, E>(update: Update<S, C>): Output<S, C, E> {
  return { type: "Update", update };
}

export function event<S, C, E>(event: E): Output<S, C, E> {
  return { type: "Event", event };
}

function noop() {}

export function view<S, C, A>(
  getter: Getter<S, C, A>,
  state: S,
  context: C
): A {
  if (typeof getter === "function") return getter(state, context);
  return getter.get(state);
}

export type Reaction<S, C> = (state: S, context: C) => void;

// Environment in which our component will operate, the environemnt provides the
// current parent DOM node, initial state and context, a function to subscribe
// to state/context changes, and a function to emit either state updates or
// some component specific event that will be handled by a parent component
export interface IDomEnvironment<S, C, E> {
  parent: Element;
  state: S;
  context: C;
  onChange: (reaction: Reaction<S, C>) => void;
  emit: (output: Output<S, C, E>) => void;
}

// A component (Invariant Dom) is a function which, given its current DOM environement,
// can produce  some side effect. The whole idea is to make DOM (and other) mutations
// composables
export type IDomNode<S, C, E> = (env: IDomEnvironment<S, C, E>) => Node;
export type IDomEffect<S, C, E> = (env: IDomEnvironment<S, C, E>) => void;

export type IDom<S, C = {}, E = never> =
  | IDomNode<S, C, E>
  | IDomEffect<S, C, E>;

// React like fragments
export function concat<S, C, E>(
  ...children: IDom<S, C, E>[]
): IDomEffect<S, C, E> {
  return function concatIDom(env) {
    children.forEach(idom => {
      const maybeNode = idom(env);
      if (maybeNode != null) {
        env.parent.appendChild(maybeNode);
      }
    });
  };
}

// focus an IDom on a subpart of the state
export function focus<S, C, E, A>(
  lens: Lens<S, A>,
  idom: IDom<A, C, E>
): IDom<S, C, E> {
  return function focusedIDom({ parent, onChange, state, context, emit }) {
    return idom({
      parent,
      onChange: focusedPushRecation,
      state: lens.get(state),
      context,
      emit: function focusedEmit(output: Output<A, C, E>) {
        if (output.type === "Event") {
          emit(output);
        } else {
          const childUpdate = output.update;
          emit({
            type: "Update",
            update: function focusedUpdate(state, context) {
              return lens.set(childUpdate(lens.get(state), context), state);
            }
          });
        }
      }
    });

    function focusedPushRecation(reaction: Reaction<A, C>) {
      onChange(function childReaction(s, c) {
        reaction(lens.get(s), c);
      });
    }
  };
}

// can wrap an IDom to handle its events
export function withHandler<S, C, E1, E2>(
  idom: IDom<S, C, E1>,
  handler: (event: E1) => Output<S, C, E2>
): IDom<S, C, E2> {
  return function handledIDom(env) {
    return idom({
      ...env,
      emit: function focusedEmit(output: Output<S, C, E>) {
        if (output.type === "Update") {
          env.emit(output);
        } else {
          //console.log("caught event", output.event);
          env.emit(handler(output.event));
        }
      }
    });
  };
}

// Text nodes
export function text<S, C, E>(
  getContent: Gettable<S, C, Primitive>
): IDomNode<S, C, E> {
  return function textIDom({ parent, onChange, state, context }) {
    let node;
    if (isGetter(getContent)) {
      node = document.createTextNode(String(view(getContent, state, context)));

      onChange(function textReaction(state, context) {
        //console.log("text reaction", state, parent);
        node.nodeValue = String(view(getContent, state, context));
      });
    } else {
      node = document.createTextNode(String(getContent));
    }

    return node;
  };
}

// Attribute setters
export function attr<S, C, E>(
  name: string,
  getContent: Gettable<S, C, Primitive>
): IDomEffect<S, C, E> {
  return function propIDom({ parent, onChange, state, context }) {
    if (isGetter<S, C, any>(getContent)) {
      parent.setAttribute(name, String(view(getContent, state, context)));

      onChange(function attrReaction(state, context) {
        parent.setAttribute(name, String(view(getContent, state, context)));
      });
    } else {
      parent.setAttribute(name, String(getContent));
    }
  };
}

// like above but take an object for convenience
export function attrs<S, C, E>(
  obj: { [P in string]: Gettable<S, C, Primitive> }
): IDomEffect<S, C, E> {
  return concat(
    ...Object.keys(obj).map(name => attr<S, C, E>(name, obj[name]))
  );
}

// DOM property setter
export function prop<S, C, E>(
  name: string,
  getContent: Gettable<S, C, any>
): IDomEffect<S, C, E> {
  return function propIDom({ parent, onChange, state, context }) {
    if (isGetter(getContent)) {
      parent[name] = view(getContent, state, context);

      onChange(function propReaction(state, context) {
        parent[name] = view(getContent, state, context);
      });
    } else {
      parent[name] = getContent;
    }
  };
}

// This interface is passed to event handlers
export type IDomHandlerEnv<S, C, E> = {
  getState: () => S;
  getContext: () => C;
  emit: (output: E) => void;
  update: (update: Update<S, C>) => void;
};

// Event handlers
export function on<S, C, E>(
  eventType: string,
  handler: (env: IDomHandlerEnv<S, C, E>, event: any) => void
): IDomEffect<S, C, E> {
  return function onIDom({ parent, onChange, state, context, emit }) {
    let curState = state;
    let curContext = context;

    const env: IDomHandlerEnv<S, C, E> = {
      getState: () => curState,
      getContext: () => curContext,
      emit: output => emit(event(output)),
      update: upd => emit(update(upd))
    };
    parent.addEventListener(eventType, function onIDomHandler(event) {
      handler(env, event);
    });
    onChange(function eventReaction(newState, newContext) {
      curState = newState;
      curContext = newContext;
    });
    return null;
  };
}

export type ChildElem<S, C, E> = IDom<S, C, E> | string;

// HTML elements
export function el<S, C, E>(
  tag: string,
  ...children: ChildElem<S, C, E>[]
): IDomNode<S, C, E> {
  return function elIDom(env) {
    const element = document.createElement(tag);
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (typeof child === "string") {
        element.appendChild(document.createTextNode(child));
      } else {
        const maybeNode = child({ ...env, parent: element });
        if (maybeNode != null) {
          element.appendChild(maybeNode);
        }
      }
    }
    return element;
  };
}

// Like react refs
export function ref<S, C, E>(cb: (node: Node) => void): IDomEffect<S, C, E> {
  return function refIDom({ parent }) {
    cb(parent);
  };
}

// Main render functions: the event type is set to never, it means all
// events should be already handled
export function render<S, C, never>(
  idom: IDomNode<S, C, never>,
  state: S,
  context: C,
  parent: Element
) {
  let reactions: Reaction<S, C>[] = [];

  const maybeNode = idom({
    parent,
    onChange: reaction => reactions.push(reaction),
    state,
    context,
    emit
  });

  if (maybeNode != null) {
    parent.appendChild(maybeNode);
  }

  function emit(output: Output<S, C, never>) {
    if (output.type === "Event") {
      console.error("Unhandled Event", output.event);
      throw new Error("Unhandled event " + output.event);
    }
    try {
      state = output.update(state, context);
      //console.log("state", state);
      reactions.forEach(r => {
        try {
          r(state, context);
        } catch (err) {
          console.error(err);
        }
      });
    } catch (err) {
      console.error(err);
    }
  }
}

// Convenient function to write dynamic strings
export function I<S, P>(
  strings,
  ...getters: Gettable<S, P, any>[]
): Getter<S, P, string> {
  return function(s, p) {
    var result = [strings[0]];
    getters.forEach(function(getter, i) {
      var value = isGetter(getter) ? view(getter, s, p) : getter;
      result.push(value, strings[i + 1]);
    });
    return result.join("");
  };
}
