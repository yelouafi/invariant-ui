import { Lens, lensProxy, set, over, append } from "../../invariant/Lens";
import { IDom, I, focus, text, concat } from "../../invariant/idom";
import * as h from "../../invariant/html-elems";
import * as p from "../../invariant/html-props";
import * as on from "../../invariant/html-events";

type Op = "+" | "-" | "*" | "/";
type Eq = "=";

interface Expression {
  left: string;
  op?: Op;
  right?: string;
}

function isOp(x: any): x is Op {
  return (
    typeof x === "string" && (x === "+" || x === "-" || x === "*" || x == "/")
  );
}

export type CalcAppState = {
  expr: Expression;
};

export const defState: CalcAppState = { expr: { left: "0" } };

const _ = lensProxy<CalcAppState>();

function calc(n1: number, o: Op, n2: number): number {
  if (o === "+") return n1 + n2;
  if (o === "-") return n1 - n2;
  if (o === "*") return n1 * n2;
  return n1 / n2;
}

function updateExpr(s: Expression, x: Op | number | "."): Expression {
  if (s.op == null && s.right == null) {
    if (isOp(x)) {
      return { left: s.left, op: x };
    } else if (typeof x === "number" || x == ".") {
      return { left: s.left + x };
    } else {
      return s;
    }
  } else if (s.op != null && s.right == null) {
    if (isOp(x)) {
      return { left: s.left, op: x };
    } else if (typeof x === "number" || x == ".") {
      return { ...s, right: "0" + x };
    } else {
      return {
        left: "" + calc(+s.left, s.op, +s.left)
      };
    }
  } else if (s.op != null && s.right != null) {
    if (isOp(x)) {
      return {
        left: "" + calc(+s.left, s.op, +s.right),
        op: x
      };
    } else if (typeof x === "number" || x == ".") {
      return { ...s, right: s.right + x };
    } else {
      return {
        left: "" + calc(+s.left, s.op, +s.right)
      };
    }
  } /* s.op == null && s.right != null  */ else {
    // unreachable state
    return s;
  }
}

// poorman's css-in-js
const styesheet = p.stylesheet(
  root => I`
  ${root} {
    color: blue;
    display: grid;
    grid-gap: 5px;
    grid-template-columns: auto auto auto auto;
  }

  ${root} .output {
    grid-column-start: 1;
    grid-column-end: 5;
    border: 1px solid #ddd;
    background-color: #eef;
    border: 2px solid blue;
    border-radius: 5px;
    padding: 10px;
    font-size: 150%;
    text-align: right;
  }

  ${root} .calc-btn {
    border: 2px solid blue;
    background-color: #fff;
    border-radius: 5px;
    cursor: pointer;
    position:relative;
  }

  ${root} .calc-btn:hover {
    background-color: blue;
    color: #eee;
  }

  ${root} .calc-btn:active {
    top:0.05em;
  }

  ${root} .dump-state {
    grid-column-start: 1;
    grid-column-end: 5;
  }`
);

const buttons: (string | number)[][] = [
  [7, 8, 9, "+"],
  [4, 5, 6, "-"],
  [1, 2, 3, "*"],
  [0, ".", "=", "/"]
];

function calcBtn(x: Op | number) {
  return h.button<CalcAppState>(
    p.className("calc-btn"),
    String(x),
    p.style({
      padding: "10px",
      fontSize: "150%"
    }),
    on.click(env => {
      env.update(s => ({ ...s, expr: updateExpr(s.expr, x) }));
    })
  );
}

export const CalcApp = p.withStylesheet(
  styesheet,
  h.div<CalcAppState>(
    h.div(
      text(s => +(s.expr.right != null ? s.expr.right : s.expr.left)),
      p.className("output")
    ),
    concat(
      ...buttons.map(row => {
        return concat(...row.map(calcBtn));
      })
    ),
    h.pre(p.className("dump-state"), text(s => JSON.stringify(s, null, 2)))
  )
);
