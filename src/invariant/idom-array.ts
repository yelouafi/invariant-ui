import {
  Fn,
  IDomNode,
  IDomEffect,
  Update,
  Reaction,
  Output,
  focus,
  update
} from "./idom";
import {
  diff,
  OND_DELETE,
  OND_INSERT,
  OND_SKIP_OLD,
  OND_SAME
} from "./diffOND";

function snd(x, y) {
  return y;
}

function id(x) {
  return x;
}

type ChildRef<S, C> = {
  index: number;
  node: Node;
  unmounted: boolean;
  reactions: Reaction<S, C>[];
};

type ArrayCtx<C> = C & { $index: number };

export function arrayOf<S, C, E, K = S>(
  template: IDomNode<S, ArrayCtx<C>, E>,
  getKey: (state: S) => K = id
): IDomEffect<S[], C, E> {
  return function arrayIDom({ parent, onChange, state, context, emit }) {
    let childRefs = state.map((s, i) => {
      let childRef = ({
        index: i,
        unmounted: false,
        reactions: []
      } as any) as ChildRef<S, ArrayCtx<C>>;

      childRef.node = template({
        parent,
        onChange: function pushArrayChildReaction(r: Reaction<S, ArrayCtx<C>>) {
          childRef.reactions.push(r);
        },
        state: state[i],
        context: Object.assign({}, context, { $index: childRef.index }),
        emit: function arrayChildEmit(output: Output<S, ArrayCtx<C>, E>) {
          if (childRef.unmounted) return;
          if (output.type === "Event") {
            emit(output);
          } else {
            const childUpdate = output.update;
            emit(
              update((state, context) => {
                const i = childRef.index;
                const itemState = childUpdate(
                  state[i],
                  Object.assign({}, context, { $index: childRef.index })
                );
                const xs = state.slice();
                xs[i] = itemState;
                return xs;
              })
            );
          }
        }
      }) as Node;
      return childRef;
    });

    childRefs.forEach(ref => {
      parent.appendChild(ref.node);
    });

    onChange((newItems, newContext) => {
      //console.log("diffing ", newItems, state);
      const edits = diff(newItems, state, getKey);
      //console.log("new diff", edits);
      let newPos = 0;
      let oldPos = 0;

      let newRefs: ChildRef<S, ArrayCtx<C>>[] = Array(newItems.length);

      edits.forEach((d, i) => {
        let ref = childRefs[oldPos];

        const itemState = newItems[newPos];
        const childContext = Object.assign({}, newContext, {
          $index: newPos
        });

        //console.log("proc edit ", d, i);

        if (d === OND_SKIP_OLD) {
          oldPos++;
        } else if (d === OND_SAME) {
          ref.index = newPos;
          newRefs[newPos] = ref;
          ref.reactions.forEach(reaction => {
            reaction(itemState, childContext);
          });
          newPos++;
          oldPos++;
        } else if (d === OND_INSERT) {
          const newRef = ({
            index: newPos,
            unmounted: false,
            reactions: []
          } as any) as ChildRef<S, ArrayCtx<C>>;
          newRefs[newPos] = newRef;

          newRef.node = template({
            parent,
            onChange: function pushArrayChildReaction(
              r: Reaction<S, ArrayCtx<C>>
            ) {
              newRef.reactions.push(r);
            },
            state: itemState,
            context: childContext,
            emit: function arrayChildEmit(output: Output<S, ArrayCtx<C>, E>) {
              if (newRef.unmounted) return;
              if (output.type === "Event") {
                emit(output);
              } else {
                const childUpdate = output.update;
                emit(
                  update((state, context) => {
                    const i = newRef.index;
                    const itemState = childUpdate(
                      state[i],
                      Object.assign({}, context, { $index: newRef.index })
                    );
                    const xs = state.slice();
                    xs[i] = itemState;
                    return xs;
                  })
                );
              }
            }
          }) as Node;
          //console.log("insert", newPos, newRef.node, ref);
          parent.insertBefore(newRef.node, ref == null ? null : ref.node);
          newPos++;
        } else if (d === OND_DELETE) {
          ref.unmounted = true;
          parent.removeChild(ref.node);
          oldPos++;
        } else {
          const movedRef = childRefs[+d];
          movedRef.index = newPos;
          movedRef.reactions.forEach(reaction => {
            reaction(itemState, childContext);
          });
          parent.insertBefore(movedRef.node, ref == null ? null : ref.node);
          newRefs[newPos] = movedRef;
          newPos++;
        }
      });
      //console.log(childRefs, oldPos, childRefs[oldPos]);

      state = newItems;
      childRefs = newRefs;
    });

    return null;
  };
}
