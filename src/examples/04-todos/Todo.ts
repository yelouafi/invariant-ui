import { lensProxy, set } from "../../invariant/Lens";
import { IDom, text } from "../../invariant/idom";
import * as h from "../../invariant/html-elems";
import * as p from "../../invariant/html-props";
import * as on from "../../invariant/html-events";

export type TodoState = {
  title: string;
  done: boolean;
};

const _ = lensProxy<TodoState>();

export function initTodo(title: string): TodoState {
  return { title, done: false };
}

export const Todo = h.label<TodoState>(
  p.for_("input"),
  p.styleText(s => `text-decoration: ${s.done ? "line-through" : "none"}`),
  h.checkbox(
    p.id("input"),
    p.checked(_.done),
    on.click((env, event) => {
      env.update(set(_.done, event.target.checked));
    })
  ),
  text(_.title),
  h.br()
);
