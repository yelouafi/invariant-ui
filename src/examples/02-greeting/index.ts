import { Lens, set, lensProxy } from "../../invariant/Lens";
import { IDom, text, render } from "../../invariant/idom";
import * as h from "../../invariant/html-elems";
import * as p from "../../invariant/html-props";
import * as on from "../../invariant/html-events";

export interface GreetingAppState {
  message: string;
}

export const defGreetingAppState: GreetingAppState = {
  message: "stranger"
};

const _ = lensProxy<GreetingAppState>();

export const GreetingApp = h.section<GreetingAppState>(
  h.input(
    p.styleText("display: block"),
    p.placeholder("Type your name"),
    p.value(_.message),
    on.input((env, event) => {
      env.update(set(_.message, event.target.value));
    })
  ),
  h.p("Hello ", text(_.message))
);
