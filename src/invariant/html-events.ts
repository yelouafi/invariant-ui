import { IDom, ChildElem, IDomHandlerEnv, el, on, prop, Getter } from "./idom";

export function withEvent(event: string) {
  return <S, C, E>(
    handler: (env: IDomHandlerEnv<S, C, E>, event: any) => void
  ) => on(event, handler);
}

export function withEventFilter(event: string, f: (event: any) => boolean) {
  return <S, C, E>(
    handler: (env: IDomHandlerEnv<S, C, E>, event: any) => void
  ) =>
    on<S, C, E>(event, function(env, event) {
      if (f(event)) {
        handler(env, event);
      }
    });
}

export const click = withEvent("click");
export const input = withEvent("input");
export const change = withEvent("change");
export const keyDown = withEvent("keydown");
export const keyUp = withEvent("keyup");
export const enter = withEventFilter("keydown", e => e.which === 13);
