import { Lens, lensProxy } from "../../invariant/Lens";
import { IDom, text, render } from "../../invariant/idom";
import * as h from "../../invariant/html-elems";
import * as p from "../../invariant/html-props";
import * as on from "../../invariant/html-events";

export interface HelloAppState {
  message: string;
}

export const defHelloAppState: HelloAppState = {
  message: "Invariant DOM"
};

const _ = lensProxy<HelloAppState>();

export const HelloApp = h.h1("Hello ", text(_.message));
