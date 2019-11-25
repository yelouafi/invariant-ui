import { TodoState, initTodo, Todo } from "./Todo";
import { lensProxy, set } from "../../invariant/Lens";
import { IDom, ref, focus, text } from "../../invariant/idom";
import { arrayOf } from "../../invariant/idom-array";
import * as h from "../../invariant/html-elems";
import * as p from "../../invariant/html-props";
import * as on from "../../invariant/html-events";

export type TodoAppState = {
  input: string;
  todos: TodoState[];
};

const _ = lensProxy<TodoAppState>();

export const defTodoAppState: TodoAppState = {
  input: "",
  todos: []
};

function addNewTodo(s: TodoAppState): TodoAppState {
  const s1 = set(_.todos, s.todos.concat(initTodo(s.input)))(s);
  return set(_.input, "")(s1);
}

let inputNode: HTMLInputElement;

export const TodoApp = h.div<TodoAppState>(
  h.input(
    p.styleText(`padding: 5px`),
    p.placeholder("anything left to do?"),
    ref(node => {
      inputNode = node as HTMLInputElement;
    }),
    p.value(_.input),
    on.input((env, event) => {
      env.update(set(_.input, event.target.value));
    }),
    on.enter((env, event) => {
      env.update(addNewTodo);
      inputNode.focus();
    })
  ),
  h.label(
    p.for_("toggle-all"),
    h.checkbox(
      p.id("toggle-all"),
      p.checked(s => s.todos.every(t => t.done)),
      on.click((env, event) => {
        env.update(set(_.todos.$each.done, event.target.checked));
      })
    ),
    "Toggle All"
  ),
  h.hr(),
  focus(_.todos, arrayOf(Todo))
);
