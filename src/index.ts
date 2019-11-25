import { render, IDom, focus, text, prop } from "./invariant/idom";

import { defHelloAppState, HelloApp } from "./examples/01-hello";
import { defGreetingAppState, GreetingApp } from "./examples/02-greeting";
import { Login, defLoginState } from "./examples/03-login";
import { defTodoAppState, TodoApp } from "./examples/04-todos";
import { CalcApp, defState } from "./examples/05-calc";

const root = document.getElementById("app") as Element;
root.textContent = "";

render(Login, defLoginState, {}, root);
