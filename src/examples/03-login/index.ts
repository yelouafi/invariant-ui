import { Lens, lensProxy, set } from "../../invariant/Lens";
import {
  IDom,
  ref,
  focus,
  text,
  concat,
  Getter,
  view
} from "../../invariant/idom";
import * as h from "../../invariant/html-elems";
import * as p from "../../invariant/html-props";
import * as on from "../../invariant/html-events";

export type LoginState = {
  name: string;
  password: string;
  confirmPassword: string;
  submitted: boolean;
};

const _ = lensProxy<LoginState>();

export const defLoginState = {
  name: "",
  password: "",
  confirmPassword: "",
  submitted: false
};

function errorMessage(
  getError: Getter<LoginState, {}, string>
): IDom<LoginState, {}, never> {
  return h.p(
    p.styleText(`color: red`),
    p.style({
      visibility: s =>
        !s.submitted || view(getError, s, null) == "" ? "hidden" : "visible"
    }),
    text(getError)
  );
}

function field({
  id,
  type: _type,
  label,
  placeholder,
  value: lensValue,
  error
}: {
  id: string;
  type: string;
  label: string;
  value: Lens<LoginState, string>;
  placeholder?: string;
  error: Getter<LoginState, {}, string>;
}) {
  return concat<LoginState, {}, never>(
    h.label(p.labelFor(id), label),
    h.input(
      p.id(id),
      p.type(_type),
      p.placeholder(placeholder || label),
      p.bindValue(lensValue)
    ),
    errorMessage(error)
  );
}

function notEmpty(value: string, msgIfError: string) {
  return value.trim() != "" ? "" : msgIfError;
}

const rules: { [P in keyof LoginState]: Getter<LoginState, {}, string> } = {
  name: s => notEmpty(s.name, "Name is requierd"),
  password: s => notEmpty(s.password, "Password is requierd"),
  confirmPassword: s =>
    s.confirmPassword === s.password ? "" : "Passwords doesn't match",
  submitted: _ => ""
};

export const Login = h.form<LoginState>(
  h.fieldset(
    h.legend("Login Form"),
    field({
      id: "name",
      type: "text",
      label: "Name",
      value: _.name,
      error: rules.name
    }),
    field({
      id: "password",
      type: "password",
      label: "Password",
      value: _.password,
      error: rules.password
    }),
    field({
      id: "confirm-password",
      type: "password",
      label: "Confirm Password",
      value: _.confirmPassword,
      error: rules.confirmPassword
    }),
    h.button(
      p.type("button"),
      p.className("pure-button pure-button-primary"),

      "Sign in",
      on.click((env, event) => {
        env.update(set(_.submitted, true));
      })
    )
  ),
  h.hr(),
  h.pre(text(s => JSON.stringify(s, null, 2)))
);
